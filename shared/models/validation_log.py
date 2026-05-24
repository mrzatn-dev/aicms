"""Validation log model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class ValidationLog(Base):
    __tablename__ = "validation_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), nullable=False
    )
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    errors: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    validated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    article = relationship("Article", back_populates="validation_logs")

    def __repr__(self) -> str:
        return f"<ValidationLog(id={self.id}, article_id={self.article_id}, valid={self.is_valid})>"
