"""Article model."""

import uuid
from datetime import datetime
import enum

from sqlalchemy import (
    String,
    Text,
    DateTime,
    ForeignKey,
    Table,
    Column,
    Enum as SAEnum,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class ArticleStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    VALIDATING = "validating"
    ANALYZING = "analyzing"
    PUBLISHED = "published"
    REJECTED = "rejected"


# Many-to-many association table for articles and tags
article_tags = Table(
    "article_tags",
    Base.metadata,
    Column(
        "article_id",
        UUID(as_uuid=True),
        ForeignKey("articles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    cover_image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True
    )
    status: Mapped[ArticleStatus] = mapped_column(
        SAEnum(ArticleStatus, native_enum=False, length=20), default=ArticleStatus.DRAFT, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    author = relationship("User", lazy="selectin")
    category = relationship("Category", back_populates="articles", lazy="selectin")
    tags = relationship("Tag", secondary=article_tags, back_populates="articles", lazy="selectin")
    ai_analysis = relationship("AIAnalysis", back_populates="article", uselist=False, lazy="selectin")
    validation_logs = relationship("ValidationLog", back_populates="article", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Article(id={self.id}, title={self.title[:30]}, status={self.status})>"
