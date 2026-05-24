"""User Settings model - stores custom prompts and preferences."""

import uuid
from datetime import datetime

from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    
    # Custom prompts for different tools
    chat_system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    validation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_analysis_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # AI model preferences
    preferred_model: Mapped[str | None] = mapped_column(String(100), nullable=True, default="deepseek-chat")
    temperature: Mapped[float | None] = mapped_column(nullable=True, default=0.7)
    max_tokens: Mapped[int | None] = mapped_column(nullable=True, default=2000)
    
    # UI preferences
    theme: Mapped[str | None] = mapped_column(String(20), nullable=True, default="light")
    language: Mapped[str | None] = mapped_column(String(10), nullable=True, default="ru")
    
    # Notification settings
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Additional settings as JSON
    custom_settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<UserSettings(id={self.id}, user_id={self.user_id})>"
