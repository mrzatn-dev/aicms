"""User AI History model - stores all AI tool usage results."""

import uuid
from datetime import datetime
import enum

from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class AIToolType(str, enum.Enum):
    CHAT = "chat"
    VALIDATION = "validation"
    DOCUMENT_ANALYSIS = "document_analysis"
    CSV_ANALYSIS = "csv_analysis"
    IMAGE_ANALYSIS = "image_analysis"
    AUDIO_TRANSCRIPTION = "audio_transcription"


class UserAIHistory(Base):
    __tablename__ = "user_ai_history"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tool_type: Mapped[AIToolType] = mapped_column(
        SAEnum(AIToolType, native_enum=False, length=50), nullable=False, index=True
    )
    input_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Relationships
    user = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<UserAIHistory(id={self.id}, user_id={self.user_id}, tool={self.tool_type})>"
