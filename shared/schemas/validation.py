"""Validation schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel


class ValidationError(BaseModel):
    """Schema for a single validation error."""

    field: str
    message: str
    code: str
    severity: str = "error"  # 'error', 'warning', 'info'


class ValidationRequest(BaseModel):
    """Schema for validation request."""

    article_id: uuid.UUID
    title: str
    content: str
    tags: list[str] | None = None


class ValidationResponse(BaseModel):
    """Schema for validation response."""

    article_id: uuid.UUID
    valid: bool
    errors: list[ValidationError] = []
    warnings: list[ValidationError] = []
    validation_score: float = 1.0  # 0.0 - 1.0
    validated_at: datetime | None = None


class ValidationRule(BaseModel):
    """Schema for a validation rule description."""

    code: str
    name: str
    description: str
    severity: str  # 'error', 'warning', 'info'
    category: str  # 'structure', 'content', 'spam', 'metadata'
