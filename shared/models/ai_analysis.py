"""AI Analysis model."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Float, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    toxicity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    quality_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    readability_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    sentiment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    key_entities: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    analyzed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    article = relationship("Article", back_populates="ai_analysis")

    def __repr__(self) -> str:
        return f"<AIAnalysis(id={self.id}, article_id={self.article_id}, quality={self.quality_score})>"
