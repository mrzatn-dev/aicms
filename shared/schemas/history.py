"""Schemas for user AI history."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from shared.models.user_ai_history import AIToolType


class UserAIHistoryCreate(BaseModel):
    tool_type: AIToolType
    input_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None
    title: Optional[str] = None


class UserAIHistoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    tool_type: AIToolType
    input_data: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    filename: Optional[str] = None
    title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserAIHistoryList(BaseModel):
    items: list[UserAIHistoryResponse]
    total: int
    page: int
    page_size: int
