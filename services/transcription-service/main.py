"""
Audio/Video Transcription Service.
Handles audio/video file processing and AI transcription.
Runs on port 8007.
"""

import sys
import os
import logging
import asyncio
import tempfile
import subprocess
from pathlib import Path
from uuid import UUID
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import engine, get_session, init_db
from shared.auth import get_current_user
from shared.schemas.transcription import (
    TranscriptionCreate, TranscriptionResponse, TranscriptionList, 
    TranscriptionStats, TranscriptionSegment
)

from service import TranscriptionService
from repository import TranscriptionRepository

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    logger.info("Transcription Service starting...")
    
    # Retry database connection
    max_retries = 10
    for i in range(max_retries):
        try:
            await init_db()
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE audio_transcriptions ADD COLUMN IF NOT EXISTS is_malicious INTEGER DEFAULT 0"))
                await conn.execute(text("ALTER TABLE audio_transcriptions ADD COLUMN IF NOT EXISTS safety_score DOUBLE PRECISION"))
                await conn.execute(text("ALTER TABLE audio_transcriptions ADD COLUMN IF NOT EXISTS safety_summary TEXT"))
                await conn.execute(text("ALTER TABLE audio_transcriptions ADD COLUMN IF NOT EXISTS safety_categories JSON"))
            logger.info("Database connected successfully")
            break
        except Exception as e:
            logger.warning(f"Database connection attempt {i+1}/{max_retries} failed: {e}")
            if i == max_retries - 1:
                logger.error("Failed to connect to database after all retries")
                raise
            await asyncio.sleep(5)
    
    yield
    logger.info("Transcription Service shutting down...")


app = FastAPI(
    title="Transcription Service",
    description="Audio/Video transcription with AI",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    current_user: dict = Depends(get_current_user),
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
