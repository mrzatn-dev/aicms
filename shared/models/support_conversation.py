"""Support conversation models for call center chat."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base


class SupportConversationStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    CLOSED = "closed"


class SupportMessageSender(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class SupportConversation(Base):
    __tablename__ = "support_conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[SupportConversationStatus] = mapped_column(
        SAEnum(SupportConversationStatus, native_enum=False, length=20),
        default=SupportConversationStatus.OPEN,
        nullable=False,
        index=True,
    )
    last_message_preview: Mapped[str | None] = mapped_column(String(300), nullable=True)
    user_last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    admin_last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = relationship("User", back_populates="support_conversations", lazy="selectin")
    messages: Mapped[list["SupportMessage"]] = relationship(
        "SupportMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="SupportMessage.created_at",
        lazy="selectin",
    )


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("support_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_role: Mapped[SupportMessageSender] = mapped_column(
        SAEnum(SupportMessageSender, native_enum=False, length=20),
        nullable=False,
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

    conversation = relationship("SupportConversation", back_populates="messages", lazy="selectin")
    sender = relationship("User", lazy="selectin")
