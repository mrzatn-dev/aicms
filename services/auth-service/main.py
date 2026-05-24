"""
Auth Service - User Registration, Login, JWT Authentication.
Runs on port 8001.
"""

import sys
import os
import logging

# Add project root to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, init_db
from shared.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from shared.auth import get_current_user, require_admin

from service import AuthService
from repository import UserRepository
import oauth as oauth_handlers

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    logger.info("Auth Service starting...")
    await init_db()
    yield
    logger.info("Auth Service shutting down...")


app = FastAPI(
    title="Auth Service",
    description="User registration, login, and JWT authentication",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(UserRepository(session))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}


@app.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Register a new user."""
    return await auth_service.register(user_data)


@app.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Login and receive JWT token."""
    return await auth_service.login(credentials)


@app.get("/google")
async def oauth_google_start(request: Request):
    """Redirect to Google OAuth consent screen."""
    return oauth_handlers.redirect_to_google(request)


@app.get("/callback/google")
async def oauth_google_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Handle Google OAuth callback and redirect to frontend with JWT."""
    return await oauth_handlers.handle_google_callback(
        code, state, error, auth_service, request
    )


@app.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Get current authenticated user profile."""
    return await auth_service.get_user_by_id(current_user["user_id"])


@app.get("/profile", response_model=UserResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Compatibility alias for fetching the current profile."""
    return await auth_service.get_user_by_id(current_user["user_id"])


@app.put("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Update the current authenticated user's profile."""
    return await auth_service.update_current_user(current_user["user_id"], user_data)


@app.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: dict = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    """List all users (admin only)."""
    return await auth_service.list_users(skip=skip, limit=limit)


@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Get a specific user (admin only)."""
    return await auth_service.get_user_by_id(user_id)


@app.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: dict = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Update a user (admin only)."""
    return await auth_service.update_user(user_id, user_data)


@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    """Delete a user (admin only)."""
    await auth_service.delete_user(user_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
