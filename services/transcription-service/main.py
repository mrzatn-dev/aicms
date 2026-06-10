"""
Audio/Video Transcription Service.
Handles audio/video file processing and AI transcription.
Runs on port 8007.
"""

import io
import sys
import os
import logging
import tempfile
import subprocess
from pathlib import Path
from uuid import UUID
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, async_session_factory
from shared.auth import get_current_user
from shared.broker import broker, PIPELINE_TRANSCRIBE_QUEUE, PIPELINE_COMPOSE_QUEUE
from shared.minio_client import download_media_bytes
from shared.pipeline import update_pipeline_stage
from shared.subscription_deps import require_ai_quota
from shared.service_auth import add_service_auth_middleware
from shared.observability import ServiceObservabilityMiddleware
from shared.schemas.transcription import (
    TranscriptionCreate, TranscriptionResponse, TranscriptionList, 
    TranscriptionStats, TranscriptionSegment
)

from service import TranscriptionService
from repository import TranscriptionRepository

logger = logging.getLogger(__name__)


async def handle_pipeline_transcribe(message: dict) -> None:
    """RabbitMQ consumer: transcribe a media file for the unified AI pipeline."""
    pipeline_id = message.get("pipeline_id")
    logger.info("Pipeline transcription request: %s", pipeline_id)
    async with async_session_factory() as session:
        try:
            await update_pipeline_stage(session, pipeline_id, "transcription", "running")
            await session.commit()

            content = await download_media_bytes(message["object_key"])
            upload = UploadFile(
                file=io.BytesIO(content),
                size=len(content),
                filename=message.get("original_filename") or "upload",
            )

            service = TranscriptionService(TranscriptionRepository(session))
            result = await service.transcribe_file(
                UUID(message["user_id"]),
                upload,
                response_language=message.get("language", "ru"),
            )

            await update_pipeline_stage(
                session,
                pipeline_id,
                "transcription",
                "done",
                transcription_id=result.id,
                merge_meta={
                    "transcript_language": result.language,
                    "transcript_chars": len(result.transcript or ""),
                },
            )
            await session.commit()

            await broker.publish(
                PIPELINE_COMPOSE_QUEUE,
                {
                    "pipeline_id": str(pipeline_id),
                    "user_id": message["user_id"],
                    "source_type": message.get("source_type", "audio"),
                    "original_filename": message.get("original_filename"),
                    "language": message.get("language", "ru"),
                    "title": None,
                    "content": result.transcript or "",
                    "summary": result.summary,
                    "tags": result.key_topics or [],
                    "transcription_id": str(result.id),
                },
            )
            logger.info("Pipeline %s: transcription done, sent to compose", pipeline_id)
        except Exception as e:
            await session.rollback()
            logger.error("Pipeline transcription failed for %s: %s", pipeline_id, e)
            if pipeline_id:
                async with async_session_factory() as err_session:
                    try:
                        await update_pipeline_stage(
                            err_session,
                            pipeline_id,
                            "transcription",
                            "failed",
                            error=str(e)[:500],
                        )
                        await err_session.commit()
                    except Exception:
                        await err_session.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan."""
    logger.info("Transcription Service starting...")
    try:
        await broker.connect()
        await broker.consume(PIPELINE_TRANSCRIBE_QUEUE, handle_pipeline_transcribe)
        logger.info("Consuming from pipeline transcribe queue")
    except Exception as e:
        logger.warning("Could not connect to RabbitMQ: %s", e)
    yield
    await broker.disconnect()
    logger.info("Transcription Service shutting down...")


app = FastAPI(
    title="Transcription Service",
    description="Audio/Video transcription with AI",
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
app.add_middleware(ServiceObservabilityMiddleware, service_name="transcription-service")


def get_transcription_service(session: AsyncSession = Depends(get_session)) -> TranscriptionService:
    return TranscriptionService(TranscriptionRepository(session))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "transcription-service"}


# ── Transcription Endpoints ──────────────────────────────────────

@app.post("/transcribe", response_model=TranscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_transcription(
    file: UploadFile = File(...),
    response_language: str = Form("ru"),
    current_user: dict = Depends(require_ai_quota),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Upload and transcribe audio/video file."""
    return await service.transcribe_file(current_user["user_id"], file, response_language=response_language)


@app.get("/transcriptions", response_model=TranscriptionList)
async def get_transcriptions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    file_type: Optional[str] = Query(None, description="Filter by file type: audio or video"),
    current_user: dict = Depends(get_current_user),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Get user's transcription history."""
    return await service.get_user_transcriptions(
        current_user["user_id"], page, page_size, file_type
    )


@app.get("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def get_transcription(
    transcription_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Get specific transcription."""
    return await service.get_transcription(current_user["user_id"], transcription_id)


@app.put("/transcriptions/{transcription_id}", response_model=TranscriptionResponse)
async def update_transcription(
    transcription_id: UUID,
    update_data: dict,
    current_user: dict = Depends(get_current_user),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Update transcription (summary, topics, etc.)."""
    return await service.update_transcription(current_user["user_id"], transcription_id, update_data)


@app.delete("/transcriptions/{transcription_id}")
async def delete_transcription(
    transcription_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Delete transcription."""
    await service.delete_transcription(current_user["user_id"], transcription_id)
    return {"message": "Transcription deleted successfully"}


@app.get("/transcriptions/stats", response_model=TranscriptionStats)
async def get_transcription_stats(
    current_user: dict = Depends(get_current_user),
    service: TranscriptionService = Depends(get_transcription_service),
):
    """Get transcription statistics."""
    return await service.get_transcription_stats(current_user["user_id"])


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8007)
