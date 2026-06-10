"""
Unified AI content pipeline orchestration (content-service side).

Upload -> MinIO -> (transcription | media analysis) -> compose article ->
validation -> AI analysis -> auto-publish.
"""

import logging
import uuid

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.broker import (
    broker,
    PIPELINE_TRANSCRIBE_QUEUE,
    PIPELINE_MEDIA_QUEUE,
    PIPELINE_COMPOSE_QUEUE,
    VALIDATION_QUEUE,
)
from shared.minio_client import upload_media_bytes
from shared.models.article import ArticleStatus
from shared.models.pipeline_run import PipelineRun, PipelineStatus
from shared.pipeline import build_initial_stages, update_pipeline_stage

from repository import ArticleRepository

logger = logging.getLogger(__name__)

# Keep in sync with transcription-service _validate_file()
VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv", "webm", "flv"}
AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "flac", "aac"}
IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"}
DOCUMENT_EXTENSIONS = {"pdf", "docx"}
TEXT_EXTENSIONS = {"txt", "md"}

MAX_FILE_SIZES = {
    "video": 100 * 1024 * 1024,
    "audio": 100 * 1024 * 1024,
    "image": 15 * 1024 * 1024,
    "document": 20 * 1024 * 1024,
    "text": 5 * 1024 * 1024,
}


def detect_source_type(filename: str | None, content_type: str | None) -> str:
    """Detect pipeline source type from file extension / MIME type."""
    ext = (filename or "").rsplit(".", 1)[-1].lower() if filename and "." in filename else ""
    if ext in VIDEO_EXTENSIONS:
        return "video"
    if ext in AUDIO_EXTENSIONS:
        return "audio"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    if ext in DOCUMENT_EXTENSIONS:
        return "document"
    if ext in TEXT_EXTENSIONS:
        return "text"

    mime = (content_type or "").lower()
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("text/"):
        return "text"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Неподдерживаемый тип файла. Разрешены: видео (mp4, mov, ...), аудио (mp3, wav, ...), "
            "изображения (jpg, png, ...), документы (pdf, docx) и текст (txt, md)."
        ),
    )


class PipelineService:
    """Orchestrates unified AI pipeline runs."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def start_pipeline(
        self,
        file: UploadFile,
        user_id: str | uuid.UUID,
        language: str = "ru",
    ) -> dict:
        """Accept an uploaded file, store it and kick off the pipeline."""
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Файл пуст")

        source_type = detect_source_type(file.filename, file.content_type)
        max_size = MAX_FILE_SIZES[source_type]
        if len(content) > max_size:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). "
                    f"Максимум {max_size // (1024 * 1024)} MB для типа '{source_type}'."
                ),
            )

        object_key = await upload_media_bytes(content, file.filename, file.content_type)

        run = PipelineRun(
            user_id=uuid.UUID(str(user_id)),
            source_type=source_type,
            original_filename=file.filename or "upload",
            object_key=object_key,
            content_type=file.content_type,
            file_size=len(content),
            status=PipelineStatus.PROCESSING.value,
            current_stage="upload",
            stages=build_initial_stages(source_type),
        )
        self.session.add(run)
        await self.session.flush()

        base_message = {
            "pipeline_id": str(run.id),
            "user_id": str(run.user_id),
            "object_key": object_key,
            "original_filename": run.original_filename,
            "content_type": file.content_type,
            "source_type": source_type,
            "language": language,
        }

        if source_type in ("video", "audio"):
            next_stage = "transcription"
        elif source_type in ("image", "document"):
            next_stage = "media_analysis"
        else:
            next_stage = "compose"

        await update_pipeline_stage(self.session, run.id, next_stage, "running")
        # Commit before publishing so consumers can see the run row immediately
        await self.session.commit()

        try:
            if source_type in ("video", "audio"):
                await broker.publish(PIPELINE_TRANSCRIBE_QUEUE, base_message)
            elif source_type in ("image", "document"):
                await broker.publish(PIPELINE_MEDIA_QUEUE, base_message)
            else:  # text: compose directly from the raw text
                try:
                    text = content.decode("utf-8")
                except UnicodeDecodeError:
                    text = content.decode("latin-1", errors="replace")
                title = (run.original_filename or "Text").rsplit(".", 1)[0]
                await broker.publish(
                    PIPELINE_COMPOSE_QUEUE,
                    {
                        **base_message,
                        "title": title,
                        "content": text,
                        "tags": [],
                        "summary": None,
                    },
                )
        except Exception as e:
            logger.error("Failed to publish pipeline message: %s", e)
            await update_pipeline_stage(
                self.session,
                run.id,
                next_stage,
                "failed",
                error=f"Не удалось отправить задачу в очередь: {e}",
            )
            await self.session.commit()

        return run.to_dict()

    async def list_pipelines(
        self, user_id: str | uuid.UUID, page: int = 1, page_size: int = 20
    ) -> dict:
        """List the current user's pipeline runs (newest first)."""
        from sqlalchemy import func

        uid = uuid.UUID(str(user_id))
        count_result = await self.session.execute(
            select(func.count()).select_from(PipelineRun).where(PipelineRun.user_id == uid)
        )
        total = count_result.scalar_one()

        result = await self.session.execute(
            select(PipelineRun)
            .where(PipelineRun.user_id == uid)
            .order_by(PipelineRun.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        runs = result.scalars().all()
        return {
            "items": [r.to_dict() for r in runs],
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
        }

    async def get_pipeline(self, pipeline_id: uuid.UUID, current_user: dict) -> dict:
        """Get a single pipeline run (owner or admin)."""
        result = await self.session.execute(
            select(PipelineRun).where(PipelineRun.id == pipeline_id)
        )
        run = result.scalar_one_or_none()
        if not run:
            raise HTTPException(status_code=404, detail="Pipeline run not found")
        if (
            str(run.user_id) != str(current_user["user_id"])
            and current_user.get("role") != "admin"
        ):
            raise HTTPException(status_code=404, detail="Pipeline run not found")
        return run.to_dict()


def _build_article_content(message: dict) -> tuple[str, str, list[str]]:
    """Build (title, content, tags) for the composed article from a pipeline message."""
    source_type = message.get("source_type", "text")
    raw_title = (message.get("title") or "").strip()
    content = (message.get("content") or "").strip()
    summary = (message.get("summary") or "").strip()
    tags = [t.strip().lower() for t in (message.get("tags") or []) if isinstance(t, str) and t.strip()]

    if not raw_title:
        filename = message.get("original_filename") or "Untitled"
        raw_title = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip() or "Untitled"
    if len(raw_title) < 5:
        raw_title = f"{raw_title} ({source_type})"
    title = raw_title[:480]

    parts: list[str] = []
    if summary:
        parts.append(summary)
        parts.append("")
    if content:
        parts.append(content)
    body = "\n".join(parts).strip()

    # Validation pipeline expects a minimum content length
    if len(body) < 50:
        body = body + "\n\n" + f"(Автоматически создано AI-конвейером из файла {message.get('original_filename', '')}.)"

    return title, body, tags[:8]


async def handle_compose_message(message: dict, session: AsyncSession) -> None:
    """Compose an article from upstream pipeline results and send it to validation."""
    pipeline_id = message.get("pipeline_id")
    logger.info("Composing article for pipeline %s", pipeline_id)

    await update_pipeline_stage(session, pipeline_id, "compose", "running")

    title, body, tags = _build_article_content(message)
    repo = ArticleRepository(session)
    article = await repo.create(
        title=title,
        content=body,
        author_id=uuid.UUID(str(message["user_id"])),
        category_id=None,
        tags=tags,
    )

    await update_pipeline_stage(
        session,
        pipeline_id,
        "compose",
        "done",
        article_id=article.id,
        transcription_id=message.get("transcription_id"),
        merge_meta={"summary": message.get("summary"), "tags": tags},
    )
    # Commit so the article is visible to validation-service before publishing
    await session.commit()

    try:
        await broker.publish(
            VALIDATION_QUEUE,
            {
                "article_id": str(article.id),
                "title": article.title,
                "content": article.content,
                "tags": tags,
                "pipeline_id": str(pipeline_id),
            },
        )
        await repo.update_status(article.id, ArticleStatus.VALIDATING)
        await update_pipeline_stage(session, pipeline_id, "validation", "running")
    except Exception as e:
        logger.error("Failed to publish composed article to validation: %s", e)
        await update_pipeline_stage(
            session,
            pipeline_id,
            "validation",
            "failed",
            error=f"Не удалось отправить статью на валидацию: {e}",
        )
