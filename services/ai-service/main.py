"""
AI Analysis Service - NLP content analysis via REST and RabbitMQ.
Runs on port 8004.
"""

import sys
import os
import logging
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, async_session_factory
from shared.schemas.ai_analysis import (
    AIAnalysisRequest, 
    AIAnalysisResponse,
    AIDraftRequest,
    AIDraftResponse,
    AISEORequest,
    AISEOResponse,
    AIChatRequest,
    AIChatResponse,
    AIValidationRequest,
    AIValidationResponse,
    AIImproveRequest,
    AIImproveResponse,
    AITitlesRequest,
    AITitlesResponse,
    CSVAnalysisResponse,
    ImageAnalysisResponse,
)
from shared.broker import broker, AI_ANALYSIS_QUEUE, PIPELINE_MEDIA_QUEUE, PIPELINE_COMPOSE_QUEUE
from shared.minio_client import download_media_bytes
from shared.pipeline import update_pipeline_stage
from shared.auth import require_admin, get_current_user, require_user_or_internal
from shared.subscription_deps import require_ai_quota, require_ai_quota_or_internal
from shared.service_auth import add_service_auth_middleware
from shared.observability import ServiceObservabilityMiddleware

from service import AIAnalysisService

logger = logging.getLogger(__name__)


async def handle_analysis_message(message: dict) -> None:
    """Handle incoming AI analysis requests from RabbitMQ."""
    logger.info("Received AI analysis request for article: %s", message.get("article_id"))
    pipeline_id = message.get("pipeline_id")
    async with async_session_factory() as session:
        try:
            ai_service = AIAnalysisService(session)
            request = AIAnalysisRequest(
                article_id=message["article_id"],
                title=message["title"],
                content=message["content"],
            )
            result = await ai_service.analyze_content(request)
            if pipeline_id:
                await update_pipeline_stage(
                    session,
                    pipeline_id,
                    "ai_analysis",
                    "done",
                    merge_meta={
                        "category": result.category,
                        "quality_score": result.quality_score,
                        "toxicity_score": result.toxicity_score,
                    },
                )
                # analyze_content auto-publishes the article
                await update_pipeline_stage(session, pipeline_id, "publish", "done")
            await session.commit()
            logger.info("AI analysis completed for article %s", message["article_id"])
        except Exception as e:
            await session.rollback()
            logger.error("AI analysis error: %s", e)
            if pipeline_id:
                async with async_session_factory() as err_session:
                    try:
                        await update_pipeline_stage(
                            err_session,
                            pipeline_id,
                            "ai_analysis",
                            "failed",
                            error=str(e)[:500],
                        )
                        await err_session.commit()
                    except Exception:
                        await err_session.rollback()


_MEDIA_ARTICLE_LABELS = {
    "ru": {"details": "Параметры файла", "recommendations": "Рекомендации", "file": "Файл", "format": "Формат", "dimensions": "Размер", "volume": "Объём", "words": "Слов", "category": "Категория"},
    "en": {"details": "File details", "recommendations": "Recommendations", "file": "File", "format": "Format", "dimensions": "Dimensions", "volume": "Size", "words": "Words", "category": "Category"},
    "kk": {"details": "Файл параметрлері", "recommendations": "Ұсыныстар", "file": "Файл", "format": "Формат", "dimensions": "Өлшемі", "volume": "Көлемі", "words": "Сөздер", "category": "Санат"},
}


async def handle_pipeline_media_message(message: dict) -> None:
    """RabbitMQ consumer: analyze an image/document for the unified AI pipeline."""
    pipeline_id = message.get("pipeline_id")
    source_type = message.get("source_type", "document")
    language = message.get("language", "ru")
    filename = message.get("original_filename") or "file"
    labels = _MEDIA_ARTICLE_LABELS.get(language, _MEDIA_ARTICLE_LABELS["ru"])
    logger.info("Pipeline media analysis request: %s (%s)", pipeline_id, source_type)

    async with async_session_factory() as session:
        try:
            await update_pipeline_stage(session, pipeline_id, "media_analysis", "running")
            await session.commit()

            content = await download_media_bytes(message["object_key"])
            ai_service = AIAnalysisService(session)

            tags: list[str] = []
            if source_type == "image":
                result = await ai_service.analyze_image(content, filename, language=language)
                summary = result.get("ai_summary", "")
                body_lines = [
                    f"## {labels['details']}",
                    f"- {labels['file']}: {filename}",
                    f"- {labels['format']}: {result.get('format', '?')}",
                    f"- {labels['dimensions']}: {result.get('width', 0)}×{result.get('height', 0)} px",
                    f"- {labels['volume']}: {result.get('file_size_kb', 0)} KB",
                ]
                recommendations = result.get("ai_recommendations", [])
            else:
                ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".txt"
                result = await ai_service.analyze_document(
                    content, filename, ext, language=language, include_text=True
                )
                summary = result.get("ai_summary", "")
                text_content = (result.get("text_content") or "").strip()
                body_lines = []
                if text_content:
                    body_lines.append(text_content)
                body_lines += [
                    "",
                    f"## {labels['details']}",
                    f"- {labels['file']}: {filename}",
                    f"- {labels['volume']}: {result.get('file_size_kb', 0)} KB",
                    f"- {labels['words']}: {result.get('word_count', 0)}",
                    f"- {labels['category']}: {result.get('content_category', 'unknown')}",
                ]
                recommendations = result.get("ai_recommendations", [])
                category = (result.get("content_category") or "").strip()
                if category and category.lower() != "unknown":
                    tags.append(category.lower())

            if recommendations:
                body_lines += ["", f"## {labels['recommendations']}"]
                body_lines += [f"- {rec}" for rec in recommendations]

            await update_pipeline_stage(
                session,
                pipeline_id,
                "media_analysis",
                "done",
                merge_meta={"media_summary": summary},
            )
            await session.commit()

            await broker.publish(
                PIPELINE_COMPOSE_QUEUE,
                {
                    "pipeline_id": str(pipeline_id),
                    "user_id": message["user_id"],
                    "source_type": source_type,
                    "original_filename": filename,
                    "language": language,
                    "title": None,
                    "content": "\n".join(body_lines).strip(),
                    "summary": summary,
                    "tags": tags,
                },
            )
            logger.info("Pipeline %s: media analysis done, sent to compose", pipeline_id)
        except Exception as e:
            await session.rollback()
            logger.error("Pipeline media analysis failed for %s: %s", pipeline_id, e)
            if pipeline_id:
                async with async_session_factory() as err_session:
                    try:
                        await update_pipeline_stage(
                            err_session,
                            pipeline_id,
                            "media_analysis",
                            "failed",
                            error=str(e)[:500],
                        )
                        await err_session.commit()
                    except Exception:
                        await err_session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    logger.info("AI Analysis Service starting...")
    try:
        await broker.connect()
        await broker.consume(AI_ANALYSIS_QUEUE, handle_analysis_message)
        await broker.consume(PIPELINE_MEDIA_QUEUE, handle_pipeline_media_message)
        logger.info("Consuming from AI analysis and pipeline media queues")
    except Exception as e:
        logger.warning("Could not connect to RabbitMQ: %s", e)
    yield
    await broker.disconnect()
    logger.info("AI Analysis Service shutting down...")


app = FastAPI(
    title="AI Analysis Service",
    description="NLP analysis: classification, tags, toxicity, summary, readability",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

add_service_auth_middleware(app)
app.add_middleware(ServiceObservabilityMiddleware, service_name="ai-service")


def get_ai_service(
    session: AsyncSession = Depends(get_session),
) -> AIAnalysisService:
    return AIAnalysisService(session)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}


@app.post("/analyze", response_model=AIAnalysisResponse)
async def analyze_content(
    request: AIAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze content via REST endpoint."""
    return await service.analyze_content(request)


@app.get("/analysis/{article_id}", response_model=AIAnalysisResponse)
async def get_analysis(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Get analysis results for an article."""
    from uuid import UUID
    return await service.get_analysis(UUID(article_id))


@app.get("/analyses")
async def list_analyses(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """List all AI analyses (admin only)."""
    return await service.list_analyses(skip=skip, limit=limit)


@app.post("/generate/draft", response_model=AIDraftResponse)
async def generate_draft(
    request: AIDraftRequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Generate article draft via DeepSeek."""
    return await service.generate_draft(request.model_dump())


@app.post("/generate/seo", response_model=AISEOResponse)
async def generate_seo(
    request: AISEORequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Generate SEO metadata via DeepSeek."""
    return await service.generate_seo(request.model_dump())


@app.post("/assist/improve", response_model=AIImproveResponse)
async def assist_improve(
    request: AIImproveRequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Improve/rewrite article text (style, clarity, shorten, expand)."""
    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(status_code=400, detail="Текст слишком короткий для улучшения (минимум 10 символов)")
    return await service.improve_text(
        text=request.text,
        mode=request.mode,
        language=request.language,
    )


@app.post("/assist/titles", response_model=AITitlesResponse)
async def assist_titles(
    request: AITitlesRequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Suggest titles + meta descriptions for article content."""
    if not request.content or len(request.content.strip()) < 30:
        raise HTTPException(status_code=400, detail="Слишком мало контента для генерации заголовков (минимум 30 символов)")
    return await service.suggest_titles(
        content=request.content,
        count=request.count,
        language=request.language,
    )


@app.post("/chat", response_model=AIChatResponse)
async def ai_chat(
    request: AIChatRequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """AI chat assistant for CMS help."""
    history = [msg.model_dump() for msg in request.history] if request.history else None
    return await service.chat(message=request.message, history=history, language=request.language)


@app.post("/chat/stream")
async def ai_chat_stream(
    request: AIChatRequest,
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Stream AI chat assistant response via Server-Sent Events."""
    history = [msg.model_dump() for msg in request.history] if request.history else None

    async def event_generator():
        async for chunk in service.chat_stream(
            message=request.message,
            history=history,
            language=request.language,
        ):
            yield f"data: {json.dumps({'delta': chunk}, ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/validate-content", response_model=AIValidationResponse)
async def ai_validate_content(
    request: AIValidationRequest,
    current_user: dict = Depends(require_ai_quota_or_internal),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """AI smart validation for Article content."""
    return await service.validate_user_input(
        title=request.title,
        content=request.content,
        language=request.language,
    )


@app.post("/analyze/csv", response_model=CSVAnalysisResponse)
async def analyze_csv(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded CSV file using AI."""
    # Check file extension
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Принимаются только CSV-файлы")

    content = await file.read()

    # Check empty file
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Check file size (max 10 MB)
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 10 MB",
        )

    result = await service.analyze_csv(
        file_content=content,
        filename=file.filename,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return CSVAnalysisResponse(**result)


@app.post("/analyze/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded image using Pillow + AI."""
    allowed_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {', '.join(sorted(allowed_ext))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Max 15 MB
    max_size = 15 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 15 MB",
        )

    result = await service.analyze_image(
        file_content=content,
        filename=file.filename,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return ImageAnalysisResponse(**result)


@app.post("/analyze/document")
async def analyze_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_ai_quota),
    service: AIAnalysisService = Depends(get_ai_service),
):
    """Analyze an uploaded document (PDF, TXT, DOCX) using AI."""
    allowed_ext = {".txt", ".pdf", ".docx"}
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый формат. Разрешены: {', '.join(sorted(allowed_ext))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Файл пуст")

    # Max 20 MB
    max_size = 20 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"Файл слишком большой ({len(content) / 1024 / 1024:.1f} MB). Максимум 20 MB",
        )

    result = await service.analyze_document(
        file_content=content,
        filename=file.filename or "unknown",
        file_type=ext,
        language=request.headers.get("x-interface-language", "ru"),
    )
    return result


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8004)
