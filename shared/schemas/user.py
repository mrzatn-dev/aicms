"""User schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: str = Field(min_length=5, max_length=255)
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=6, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class UserLogin(BaseModel):
    """Schema for user login."""

    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    """Request password reset email."""

    email: str = Field(min_length=5, max_length=255)


class ResetPasswordRequest(BaseModel):
    """Set a new password using a reset token."""

    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=6, max_length=128)


class MessageResponse(BaseModel):
    """Generic success message."""

    detail: str


class UserResponse(BaseModel):
    """Schema for user response."""

    id: uuid.UUID
    email: str
    username: str
    full_name: str | None
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    """Schema for user update."""

    full_name: str | None = None
    email: str | None = None
    is_active: bool | None = None
    role: str | None = None


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class RegisterPendingResponse(BaseModel):
    """Registration pending email verification."""

    requires_verification: bool = True
    message: str
    email: str


class AdminBootstrapRequest(BaseModel):
    """Bootstrap first admin without Render Shell."""

    email: str = Field(min_length=5, max_length=255)
    username: str | None = Field(default=None, min_length=3, max_length=100)
    password: str | None = Field(default=None, min_length=6, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class AdminBootstrapResponse(BaseModel):
    action: str
    email: str
    username: str
    role: str
    message: str
