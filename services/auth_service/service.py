"""
Auth service business logic.
"""

import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from shared.config import settings
from shared.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserUpdate,
    RegisterPendingResponse,
)
from shared.auth import hash_password, verify_password, create_access_token
from shared.models.user import UserRole

from repository import UserRepository
from email_service import send_password_reset_email, send_verification_email


def _frontend_base_url() -> str:
    configured = (settings.OAUTH_REDIRECT_URI or "").strip().rstrip("/")
    if configured.endswith("/oauth/callback"):
        return configured[: -len("/oauth/callback")]
    return configured or "http://localhost:3000"


class AuthService:
    """Authentication and user management service."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, user_data: UserCreate) -> TokenResponse | RegisterPendingResponse:
        """Register a new user and return JWT or pending verification response."""
        existing = await self.user_repo.get_by_email(user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        existing = await self.user_repo.get_by_username(user_data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )

        hashed_pw = hash_password(user_data.password)

        if settings.EMAIL_VERIFICATION_ENABLED:
            token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=24)
            user = await self.user_repo.create(
                email=user_data.email,
                username=user_data.username,
                hashed_password=hashed_pw,
                full_name=user_data.full_name,
                email_verified=False,
                verification_token=token,
                verification_token_expires=expires,
            )
            verify_url = (
                f"{settings.OAUTH_API_BASE_URL.rstrip('/')}/verify-email?token={token}"
            )
            try:
                await send_verification_email(to_email=user.email, verify_url=verify_url)
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                ) from exc
            return RegisterPendingResponse(
                message="Проверьте почту и перейдите по ссылке для подтверждения email",
                email=user.email,
            )

        user = await self.user_repo.create(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_pw,
            full_name=user_data.full_name,
            email_verified=True,
        )

        token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )

        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def verify_email(self, token: str) -> dict[str, str]:
        """Confirm email address using a verification token."""
        user = await self.user_repo.get_by_verification_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification link",
            )
        if (
            user.verification_token_expires
            and user.verification_token_expires < datetime.now(timezone.utc)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link expired",
            )

        await self.user_repo.update(
            user.id,
            email_verified=True,
            verification_token=None,
            verification_token_expires=None,
        )
        return {"detail": "Email verified successfully"}

    async def oauth_login(
        self,
        email: str,
        username_hint: str,
        full_name: str | None = None,
    ) -> TokenResponse:
        """Find or create a user from an OAuth provider and return JWT."""
        user = await self.user_repo.get_by_email(email)
        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is deactivated",
                )
        else:
            username = await self._unique_username(username_hint)
            random_password = secrets.token_urlsafe(32)
            user = await self.user_repo.create(
                email=email,
                username=username,
                hashed_password=hash_password(random_password),
                full_name=full_name,
                email_verified=True,
            )

        token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )
        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def _unique_username(self, hint: str) -> str:
        base = re.sub(r"[^a-zA-Z0-9_]", "", hint.lower())[:40] or "user"
        candidate = base
        suffix = 1
        while await self.user_repo.get_by_username(candidate):
            candidate = f"{base}{suffix}"
            suffix += 1
        return candidate

    async def request_password_reset(self, email: str) -> dict[str, str]:
        """Send password reset link if the account exists (always returns generic message)."""
        user = await self.user_repo.get_by_email(email)
        if user and user.is_active and user.hashed_password:
            token = secrets.token_urlsafe(32)
            expires = datetime.now(timezone.utc) + timedelta(hours=1)
            await self.user_repo.update(
                user.id,
                password_reset_token=token,
                password_reset_expires=expires,
            )
            reset_url = f"{_frontend_base_url().rstrip('/')}/reset-password?token={token}"
            try:
                await send_password_reset_email(to_email=user.email, reset_url=reset_url)
            except RuntimeError as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=str(exc),
                ) from exc

        return {
            "detail": "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля",
        }

    async def reset_password(self, token: str, new_password: str) -> dict[str, str]:
        """Set a new password using a valid reset token."""
        user = await self.user_repo.get_by_password_reset_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset link",
            )
        if (
            user.password_reset_expires
            and user.password_reset_expires < datetime.now(timezone.utc)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset link expired",
            )

        await self.user_repo.update(
            user.id,
            hashed_password=hash_password(new_password),
            password_reset_token=None,
            password_reset_expires=None,
        )
        return {"detail": "Password updated successfully"}

    async def refresh_session(
        self, refresh_token: str
    ) -> TokenResponse:
        """Issue new access token from a valid refresh token."""
        from shared.refresh_tokens import consume_refresh_token, revoke_refresh_token

        session = await consume_refresh_token(refresh_token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        await revoke_refresh_token(refresh_token)

        user = await self.user_repo.get_by_id(uuid.UUID(session["sub"]))
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account unavailable",
            )

        access_token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )
        return TokenResponse(
            access_token=access_token,
            user=UserResponse.model_validate(user),
        )

    async def login(self, credentials: UserLogin) -> TokenResponse:
        """Authenticate user and return JWT token."""
        user = await self.user_repo.get_by_email(credentials.email)
        if not user or not verify_password(credentials.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        if settings.EMAIL_VERIFICATION_ENABLED and not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified. Check your inbox for the confirmation link.",
            )

        token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )

        return TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        )

    async def get_user_by_id(self, user_id: uuid.UUID) -> UserResponse:
        """Get user by ID."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return UserResponse.model_validate(user)

    async def update_current_user(
        self, user_id: uuid.UUID, user_data: UserUpdate
    ) -> UserResponse:
        """Update the authenticated user's own profile."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        update_data = user_data.model_dump(exclude_unset=True)

        # Self-service profile editing must not allow privilege changes.
        update_data.pop("role", None)
        update_data.pop("is_active", None)

        new_email = update_data.get("email")
        if new_email and new_email != user.email:
            existing = await self.user_repo.get_by_email(new_email)
            if existing and existing.id != user.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already registered",
                )

        user = await self.user_repo.update(user_id, **update_data)
        return UserResponse.model_validate(user)

    async def list_users(self, skip: int = 0, limit: int = 50) -> list[UserResponse]:
        """List all users."""
        users = await self.user_repo.list_all(skip=skip, limit=limit)
        return [UserResponse.model_validate(u) for u in users]

    async def update_user(
        self, user_id: uuid.UUID, user_data: UserUpdate
    ) -> UserResponse:
        """Update user data."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        update_data = user_data.model_dump(exclude_unset=True)
        if "role" in update_data and update_data["role"]:
            update_data["role"] = UserRole(update_data["role"])

        user = await self.user_repo.update(user_id, **update_data)
        return UserResponse.model_validate(user)

    async def delete_user(self, user_id: uuid.UUID) -> None:
        """Delete a user."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        await self.user_repo.delete(user_id)
