"""
User Service - User history, settings, and statistics.
Runs on port 8006.
"""

import sys
import os
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session
from shared.auth import get_current_user, require_admin
from shared.broker import broker
from shared.service_auth import add_service_auth_middleware
from shared.observability import ServiceObservabilityMiddleware
from shared.schemas.history import UserAIHistoryCreate, UserAIHistoryResponse, UserAIHistoryList
from shared.schemas.settings import UserSettingsUpdate, UserSettingsResponse
from shared.schemas.statistics import UserStatistics
from shared.schemas.admin import AdminFileList, AdminOverview, AdminUserList
from shared.schemas.support import (
    SupportConversationCreate,
    SupportConversationList,
    SupportConversationResponse,
    SupportConversationStatusUpdate,
    SupportMessageCreate,
)

from service import UserService
from repository import AdminUserRepository, UserHistoryRepository, UserSettingsRepository, SupportRepository

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    logger.info("User Service starting...")
    try:
        await broker.connect()
    except Exception as exc:
        logger.warning("Could not connect to RabbitMQ: %s", exc)
    yield
    await broker.disconnect()
    logger.info("User Service shutting down...")


app = FastAPI(
    title="User Service",
    description="User history, settings, and statistics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

add_service_auth_middleware(app)
app.add_middleware(ServiceObservabilityMiddleware, service_name="user-service")


def get_user_service(session: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(
        UserHistoryRepository(session),
        UserSettingsRepository(session),
        SupportRepository(session),
        AdminUserRepository(session),
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "user-service"}


# ── History Endpoints ──────────────────────────────────────

@app.post("/history", response_model=UserAIHistoryResponse, status_code=status.HTTP_201_CREATED)
async def create_history(
    history_data: UserAIHistoryCreate,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Create a new AI history entry."""
    return await user_service.create_history(current_user["user_id"], history_data)


@app.get("/history", response_model=UserAIHistoryList)
async def get_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tool_type: str | None = None,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Get user's AI history with pagination."""
    return await user_service.get_history(
        current_user["user_id"],
        page=page,
        page_size=page_size,
        tool_type=tool_type
    )


@app.get("/history/{history_id}", response_model=UserAIHistoryResponse)
async def get_history_item(
    history_id: UUID,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Get a specific history item."""
    return await user_service.get_history_item(current_user["user_id"], history_id)


@app.delete("/history/{history_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_history_item(
    history_id: UUID,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Delete a history item."""
    await user_service.delete_history_item(current_user["user_id"], history_id)


# ── Settings Endpoints ──────────────────────────────────────

@app.get("/settings", response_model=UserSettingsResponse)
async def get_settings(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Get user settings."""
    return await user_service.get_settings(current_user["user_id"])


@app.put("/settings", response_model=UserSettingsResponse)
async def update_settings(
    settings_data: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Update user settings."""
    return await user_service.update_settings(current_user["user_id"], settings_data)


# ── Statistics Endpoints ──────────────────────────────────────

@app.get("/statistics", response_model=UserStatistics)
async def get_statistics(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    """Get user statistics."""
    return await user_service.get_statistics(current_user["user_id"])


# ── Admin Control Endpoints ──────────────────────────────────────

@app.get("/admin/overview", response_model=AdminOverview)
async def admin_get_overview(
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    """Get full system overview for administrators."""
    return await user_service.admin_get_overview()


@app.get("/admin/users", response_model=AdminUserList)
async def admin_get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    """Get all users with activity metadata."""
    return await user_service.admin_list_users(
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        is_active=is_active,
    )


@app.get("/admin/files", response_model=AdminFileList)
async def admin_get_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tool_type: str | None = None,
    search: str | None = None,
    user_id: UUID | None = None,
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    """Get uploaded files and their AI analysis metadata."""
    return await user_service.admin_list_files(
        page=page,
        page_size=page_size,
        tool_type=tool_type,
        search=search,
        user_id=user_id,
    )


# ── Support Endpoints ──────────────────────────────────────

@app.post("/support/conversations", response_model=SupportConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_support_conversation(
    data: SupportConversationCreate,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.create_support_conversation(current_user["user_id"], data)


@app.get("/support/conversations", response_model=SupportConversationList)
async def get_support_conversations(
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.list_support_conversations(current_user["user_id"])


@app.get("/support/conversations/{conversation_id}", response_model=SupportConversationResponse)
async def get_support_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.get_support_conversation(current_user["user_id"], conversation_id)


@app.post("/support/conversations/{conversation_id}/messages", response_model=SupportConversationResponse)
async def create_support_message(
    conversation_id: UUID,
    data: SupportMessageCreate,
    current_user: dict = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.add_support_message(current_user["user_id"], conversation_id, data)


@app.get("/admin/support/conversations", response_model=SupportConversationList)
async def admin_get_support_conversations(
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.admin_list_support_conversations()


@app.get("/admin/support/conversations/{conversation_id}", response_model=SupportConversationResponse)
async def admin_get_support_conversation(
    conversation_id: UUID,
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.get_support_conversation(current_user["user_id"], conversation_id, is_admin=True)


@app.post("/admin/support/conversations/{conversation_id}/messages", response_model=SupportConversationResponse)
async def admin_create_support_message(
    conversation_id: UUID,
    data: SupportMessageCreate,
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.add_support_message(current_user["user_id"], conversation_id, data, is_admin=True)


@app.put("/admin/support/conversations/{conversation_id}/status", response_model=SupportConversationResponse)
async def admin_update_support_status(
    conversation_id: UUID,
    data: SupportConversationStatusUpdate,
    current_user: dict = Depends(require_admin),
    user_service: UserService = Depends(get_user_service),
):
    return await user_service.admin_update_support_status(conversation_id, data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8006)
