"""Schemas for user settings."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class UserSettingsUpdate(BaseModel):
    chat_system_prompt: Optional[str] = None
    validation_prompt: Optional[str] = None
    document_analysis_prompt: Optional[str] = None
    preferred_model: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=8000)
    theme: Optional[str] = None
    language: Optional[str] = None
    email_notifications: Optional[bool] = None
    custom_settings: Optional[Dict[str, Any]] = None


class UserSettingsResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    chat_system_prompt: Optional[str] = None
    validation_prompt: Optional[str] = None
    document_analysis_prompt: Optional[str] = None
    preferred_model: Optional[str] = "deepseek-chat"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2000
    theme: Optional[str] = "light"
    language: Optional[str] = "ru"
    email_notifications: bool = True
    custom_settings: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
