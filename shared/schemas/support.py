"""Schemas for support conversations and messages."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from shared.models.support_conversation import (
    SupportConversationStatus,
    SupportMessageSender,
)


class SupportConversationCreate(BaseModel):
    subject: str = Field(min_length=3, max_length=255)
    message: str = Field(min_length=1, max_length=5000)


class SupportMessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=5000)


class SupportConversationStatusUpdate(BaseModel):
    status: SupportConversationStatus


class SupportMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_role: SupportMessageSender
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SupportConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject: str
    status: SupportConversationStatus
    last_message_preview: str | None = None
    created_at: datetime
    updated_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    messages: list[SupportMessageResponse] = []

    model_config = {"from_attributes": True}


class SupportConversationListItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject: str
    status: SupportConversationStatus
    last_message_preview: str | None = None
    created_at: datetime
    updated_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    unread_count: int = 0


class SupportConversationList(BaseModel):
    items: list[SupportConversationListItem]
    total: int
