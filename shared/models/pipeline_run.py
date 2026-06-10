"""
PipelineRun model - tracks a unified AI content pipeline run
(upload -> transcription/media analysis -> article -> validation -> AI analysis -> publish).
"""

import enum
import uuid
from datetime import datetime
from typing import Any, Dict

from sqlalchemy import Column, String, Text, DateTime, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from shared.database import Base


class PipelineSourceType(str, enum.Enum):
    VIDEO = "video"
    AUDIO = "audio"
    IMAGE = "image"
    DOCUMENT = "document"
    TEXT = "text"


class PipelineStatus(str, enum.Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Ordered stage names per source type (used by services and the frontend stepper)
PIPELINE_STAGES_MEDIA = ["upload", "transcription", "compose", "validation", "ai_analysis", "publish"]
PIPELINE_STAGES_FILE = ["upload", "media_analysis", "compose", "validation", "ai_analysis", "publish"]
PIPELINE_STAGES_TEXT = ["upload", "compose", "validation", "ai_analysis", "publish"]


def stages_for_source(source_type: str) -> list[str]:
    if source_type in (PipelineSourceType.VIDEO.value, PipelineSourceType.AUDIO.value):
        return PIPELINE_STAGES_MEDIA
    if source_type in (PipelineSourceType.IMAGE.value, PipelineSourceType.DOCUMENT.value):
        return PIPELINE_STAGES_FILE
    return PIPELINE_STAGES_TEXT


class PipelineRun(Base):
    """A single run of the unified AI content pipeline."""

    __tablename__ = "pipeline_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    # Source file info
    source_type = Column(String(20), nullable=False)  # video | audio | image | document | text
    original_filename = Column(String(255))
    object_key = Column(String(500))  # MinIO object key (cms-media bucket)
    content_type = Column(String(100))
    file_size = Column(Integer)

    # Run state
    status = Column(String(20), nullable=False, default=PipelineStatus.PROCESSING.value)
    current_stage = Column(String(30), nullable=False, default="upload")
    # List of {name, status: pending|running|done|failed, started_at, finished_at, error}
    stages = Column(JSON, nullable=False, default=list)
    error = Column(Text)

    # Links to produced artifacts
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="SET NULL"), nullable=True)
    transcription_id = Column(UUID(as_uuid=True), ForeignKey("audio_transcriptions.id", ondelete="SET NULL"), nullable=True)
    result_meta = Column(JSON)  # intermediate results (summary, topics, analysis, ...)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", lazy="selectin")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "source_type": self.source_type,
            "original_filename": self.original_filename,
            "content_type": self.content_type,
            "file_size": self.file_size,
            "status": self.status,
            "current_stage": self.current_stage,
            "stages": self.stages or [],
            "error": self.error,
            "article_id": str(self.article_id) if self.article_id else None,
            "transcription_id": str(self.transcription_id) if self.transcription_id else None,
            "result_meta": self.result_meta or {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
