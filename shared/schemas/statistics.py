"""Schemas for user statistics."""

from typing import Dict, Any
from pydantic import BaseModel


class ToolUsageStats(BaseModel):
    tool_type: str
    count: int
    last_used: str | None = None


class UserStatistics(BaseModel):
    total_analyses: int
    analyses_by_tool: list[ToolUsageStats]
    analyses_this_week: int
    analyses_this_month: int
    most_used_tool: str | None = None
    recent_activity: list[Dict[str, Any]]
