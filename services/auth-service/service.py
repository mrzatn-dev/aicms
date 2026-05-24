"""
Auth service business logic.
"""

import uuid
from fastapi import HTTPException, status

from shared.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate
from shared.auth import hash_password, verify_password, create_access_token
from shared.models.user import UserRole

from repository import UserRepository


class AuthService:
    """Authentication and user management service."""

    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    async def register(self, user_data: UserCreate) -> TokenResponse:
        """Register a new user and return JWT token."""
        # Check if email already exists
        existing = await self.user_repo.get_by_email(user_data.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        # Check if username already exists
        existing = await self.user_repo.get_by_username(user_data.username)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )

        # Create user
        hashed_pw = hash_password(user_data.password)
        user = await self.user_repo.create(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_pw,
            full_name=user_data.full_name,
        )

        # Generate token
        token = create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )

        return TokenResponse(
            access_token=token,
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
