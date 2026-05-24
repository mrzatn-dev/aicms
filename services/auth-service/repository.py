"""
User repository - async database operations.
"""

import uuid
from typing import Sequence

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.user import User, UserRole


class UserRepository:
    """Repository for User CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        email: str,
        username: str,
        hashed_password: str,
        full_name: str | None = None,
        role: UserRole = UserRole.USER,
    ) -> User:
        """Create a new user."""
        user = User(
            email=email,
            username=username,
            hashed_password=hashed_password,
            full_name=full_name,
            role=role,
        )
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        """Get user by username."""
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self, skip: int = 0, limit: int = 50
    ) -> Sequence[User]:
        """List all users with pagination."""
        result = await self.session.execute(
            select(User)
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def update(self, user_id: uuid.UUID, **kwargs) -> User:
        """Update a user."""
        await self.session.execute(
            update(User).where(User.id == user_id).values(**kwargs)
        )
        await self.session.flush()
        return await self.get_by_id(user_id)

    async def delete(self, user_id: uuid.UUID) -> None:
        """Delete a user."""
        await self.session.execute(
            delete(User).where(User.id == user_id)
        )
        await self.session.flush()

    async def count(self) -> int:
        """Count total users."""
        from sqlalchemy import func

        result = await self.session.execute(
            select(func.count()).select_from(User)
        )
        return result.scalar_one()
