"""
Auth Service - User Registration, Login, JWT Authentication.
Runs on port 8001.
"""

import sys
import os
import logging

# Add project root and this service directory for shared/local imports.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.dirname(__file__))

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session
from shared.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserUpdate,
    RegisterPendingResponse,
    AdminBootstrapRequest,
    AdminBootstrapResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from shared.auth import get_current_user, require_admin
from shared.service_auth import add_service_auth_middleware
from shared.cookie_auth import clear_auth_cookie, get_refresh_token_from_request
from shared.auth_response import build_token_response
from shared.refresh_tokens import revoke_refresh_token

from service import AuthService
from repository import UserRepository
from shared.admin_bootstrap import bootstrap_admin_user
import oauth as oauth_handlers

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    logger.info("Auth Service starting...")
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
    allow_origins=settings.allowed_origins_list,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

add_service_auth_middleware(app)


def get_auth_service(session: AsyncSession = Depends(get_session)) -> AuthService:
    return AuthService(UserRepository(session))


async def _token_response(
    token_response: TokenResponse,
    request: Request | None = None,
) -> JSONResponse:
    return await build_token_response(token_response, request)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "auth-service"}


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    """Render and load balancers often probe / — keep it healthy."""
    return {"status": "healthy", "service": "auth-service"}


@app.get("/oauth-status")
async def oauth_status(request: Request):
    """Diagnose OAuth env vars (values are never exposed)."""
    import oauth as oauth_handlers

    return {
        "google_client_id_set": bool(settings.GOOGLE_CLIENT_ID),
        "google_client_secret_set": bool(settings.GOOGLE_CLIENT_SECRET),
        "oauth_api_base_url": settings.OAUTH_API_BASE_URL,
        "oauth_redirect_uri_configured": settings.OAUTH_REDIRECT_URI,
        "oauth_redirect_uri_resolved": oauth_handlers.get_frontend_oauth_callback_url(request),
        "public_api_base_resolved": oauth_handlers.get_public_api_base_url(request),
        "forwarded_host": request.headers.get("x-forwarded-host"),
        "forwarded_proto": request.headers.get("x-forwarded-proto"),
    }


@app.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_data: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Register a new user."""
    result = await auth_service.register(user_data)
    if isinstance(result, RegisterPendingResponse):
        return JSONResponse(content=result.model_dump(mode="json"), status_code=201)
    return await _token_response(result, request)


@app.get("/verify-email")
async def verify_email(
    token: str,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Confirm email address from verification link."""
    return await auth_service.verify_email(token)


@app.post("/bootstrap-admin", response_model=AdminBootstrapResponse)
async def bootstrap_admin(
    body: AdminBootstrapRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """
    Create or promote admin without Render Shell.
    Requires header X-Admin-Bootstrap-Secret matching ADMIN_BOOTSTRAP_SECRET.
    """
    configured = (settings.ADMIN_BOOTSTRAP_SECRET or "").strip()
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_BOOTSTRAP_SECRET не задан на сервере",
        )

    provided = request.headers.get("X-Admin-Bootstrap-Secret", "")
    if not provided or provided != configured:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Неверный X-Admin-Bootstrap-Secret",
        )

    try:
        result = await bootstrap_admin_user(
            session,
            email=body.email,
            username=body.username,
            password=body.password,
            full_name=body.full_name,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        await session.rollback()
        logger.exception("Admin bootstrap failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось создать администратора",
        ) from exc

    return AdminBootstrapResponse(**result)


@app.post("/login")
async def login(
    request: Request,
    credentials: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Login and receive JWT token (also set as HttpOnly cookie)."""
    return await _token_response(await auth_service.login(credentials), request)


@app.post("/refresh")
async def refresh_session(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Rotate refresh token and issue a new access token."""
    refresh_token = get_refresh_token_from_request(request)
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    return await _token_response(
        await auth_service.refresh_session(refresh_token),
        request,
    )


@app.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Request a password reset email."""
    result = await auth_service.request_password_reset(body.email)
    return MessageResponse(**result)


@app.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Set a new password using a reset token."""
    result = await auth_service.reset_password(body.token, body.new_password)
    return MessageResponse(**result)


@app.post("/logout")
async def logout(request: Request):
    """Clear auth cookies and revoke refresh token."""
    refresh_token = get_refresh_token_from_request(request)
    if refresh_token:
        await revoke_refresh_token(refresh_token)
    response = JSONResponse(content={"detail": "Logged out"})
    clear_auth_cookie(response, request)
    return response


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


@app.get("/github")
async def oauth_github_start(request: Request):
    """Redirect to GitHub OAuth consent screen."""
    return oauth_handlers.redirect_to_github(request)


@app.get("/callback/github")
async def oauth_github_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    auth_service: AuthService = Depends(get_auth_service),
):
    """Handle GitHub OAuth callback."""
    return await oauth_handlers.handle_github_callback(
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
