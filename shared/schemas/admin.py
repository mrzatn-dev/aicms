"""Admin control center schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AdminUserItem(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
    analyses_count: int = 0
    files_count: int = 0
    last_activity_at: datetime | None = None


class AdminUserList(BaseModel):
    items: list[AdminUserItem]
    total: int
    active_users: int
    admins: int
    page: int
    page_size: int


class AdminFileItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str | None = None
    user_email: str | None = None
    tool_type: str
    filename: str
    title: str | None = None
    file_extension: str | None = None
    file_size_bytes: int | None = None
    file_size_kb: float | None = None
    characteristics: dict[str, Any] = {}
    ai_summary: str | None = None
    ai_recommendations: list[str] = []
    warnings: list[str] = []
    security_verdict: dict[str, Any] | None = None
    created_at: datetime


class AdminFileList(BaseModel):
    items: list[AdminFileItem]
    total: int
    page: int
    page_size: int


class AdminToolUsageItem(BaseModel):
    tool_type: str
    count: int
    files_count: int = 0
    last_used: datetime | None = None


class AdminOverview(BaseModel):
    generated_at: datetime
    totals: dict[str, int]
    tool_usage: list[AdminToolUsageItem]
    recent_users: list[AdminUserItem]
    recent_files: list[AdminFileItem]
    ai_insights: list[str]
