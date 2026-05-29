"""User service repositories."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Sequence

from sqlalchemy import delete, desc, func, or_, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.models.user_ai_history import UserAIHistory, AIToolType
from shared.models.user import User, UserRole
from shared.models.user_settings import UserSettings
from shared.models.support_conversation import (
    SupportConversation,
    SupportConversationStatus,
    SupportMessage,
    SupportMessageSender,
)


class UserHistoryRepository:
    """Repository for UserAIHistory CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        user_id: uuid.UUID,
        tool_type: AIToolType,
        input_data: dict | None = None,
        result_data: dict | None = None,
        filename: str | None = None,
        title: str | None = None,
    ) -> UserAIHistory:
        """Create a new history entry."""
        history = UserAIHistory(
            user_id=user_id,
            tool_type=tool_type,
            input_data=input_data,
            result_data=result_data,
            filename=filename,
            title=title,
        )
        self.session.add(history)
        await self.session.flush()
        await self.session.refresh(history)
        return history

    async def get_by_id(self, history_id: uuid.UUID, user_id: uuid.UUID) -> UserAIHistory | None:
        """Get history by ID and user ID."""
        result = await self.session.execute(
            select(UserAIHistory).where(
                UserAIHistory.id == history_id,
                UserAIHistory.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        tool_type: AIToolType | None = None,
    ) -> tuple[Sequence[UserAIHistory], int]:
        """List user's history with pagination."""
        query = select(UserAIHistory).where(UserAIHistory.user_id == user_id)
        
        if tool_type:
            query = query.where(UserAIHistory.tool_type == tool_type)
        
        # Get total count
        count_query = select(func.count()).select_from(UserAIHistory).where(
            UserAIHistory.user_id == user_id
        )
        if tool_type:
            count_query = count_query.where(UserAIHistory.tool_type == tool_type)
        
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        
        # Get paginated results
        query = query.order_by(desc(UserAIHistory.created_at)).offset(skip).limit(limit)
        result = await self.session.execute(query)
        
        return result.scalars().all(), total

    async def delete(self, history_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Delete a history entry."""
        await self.session.execute(
            delete(UserAIHistory).where(
                UserAIHistory.id == history_id,
                UserAIHistory.user_id == user_id
            )
        )
        await self.session.flush()

    async def count_by_user(self, user_id: uuid.UUID) -> int:
        """Count total history entries for user."""
        result = await self.session.execute(
            select(func.count()).select_from(UserAIHistory).where(
                UserAIHistory.user_id == user_id
            )
        )
        return result.scalar_one()

    async def count_by_tool(self, user_id: uuid.UUID) -> dict:
        """Count history entries by tool type."""
        result = await self.session.execute(
            select(
                UserAIHistory.tool_type,
                func.count(UserAIHistory.id).label('count'),
                func.max(UserAIHistory.created_at).label('last_used')
            )
            .where(UserAIHistory.user_id == user_id)
            .group_by(UserAIHistory.tool_type)
        )
        return {row.tool_type: {'count': row.count, 'last_used': row.last_used} for row in result}

    async def count_recent(self, user_id: uuid.UUID, days: int) -> int:
        """Count history entries in last N days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await self.session.execute(
            select(func.count()).select_from(UserAIHistory).where(
                UserAIHistory.user_id == user_id,
                UserAIHistory.created_at >= cutoff
            )
        )
        return result.scalar_one()

    async def get_recent_activity(self, user_id: uuid.UUID, limit: int = 10) -> Sequence[UserAIHistory]:
        """Get recent activity."""
        result = await self.session.execute(
            select(UserAIHistory)
            .where(UserAIHistory.user_id == user_id)
            .order_by(desc(UserAIHistory.created_at))
            .limit(limit)
        )
        return result.scalars().all()

    async def list_all_history(
        self,
        skip: int = 0,
        limit: int = 20,
        tool_type: AIToolType | None = None,
    ) -> tuple[Sequence[UserAIHistory], int]:
        """List all history entries for admins."""
        query = select(UserAIHistory).options(selectinload(UserAIHistory.user))
        count_query = select(func.count()).select_from(UserAIHistory)

        if tool_type:
            query = query.where(UserAIHistory.tool_type == tool_type)
            count_query = count_query.where(UserAIHistory.tool_type == tool_type)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.order_by(desc(UserAIHistory.created_at)).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def list_uploaded_files(
        self,
        skip: int = 0,
        limit: int = 20,
        tool_type: AIToolType | None = None,
        search: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> tuple[Sequence[UserAIHistory], int]:
        """List uploaded file-backed history entries for admins."""
        conditions = [UserAIHistory.filename.isnot(None)]
        if tool_type:
            conditions.append(UserAIHistory.tool_type == tool_type)
        if search:
            conditions.append(UserAIHistory.filename.ilike(f"%{search}%"))
        if user_id:
            conditions.append(UserAIHistory.user_id == user_id)

        query = (
            select(UserAIHistory)
            .options(selectinload(UserAIHistory.user))
            .where(*conditions)
        )
        count_query = select(func.count()).select_from(UserAIHistory).where(*conditions)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.order_by(desc(UserAIHistory.created_at)).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def count_all(self) -> int:
        """Count all history entries."""
        result = await self.session.execute(select(func.count()).select_from(UserAIHistory))
        return result.scalar_one()

    async def count_all_files(self) -> int:
        """Count uploaded file-backed history entries."""
        result = await self.session.execute(
            select(func.count()).select_from(UserAIHistory).where(UserAIHistory.filename.isnot(None))
        )
        return result.scalar_one()

    async def count_all_by_tool(self) -> list[dict]:
        """Count all history entries by tool type."""
        result = await self.session.execute(
            select(
                UserAIHistory.tool_type,
                func.count(UserAIHistory.id).label("count"),
                func.count(UserAIHistory.filename).label("files_count"),
                func.max(UserAIHistory.created_at).label("last_used"),
            )
            .group_by(UserAIHistory.tool_type)
            .order_by(func.count(UserAIHistory.id).desc())
        )
        return [
            {
                "tool_type": row.tool_type,
                "count": row.count,
                "files_count": row.files_count,
                "last_used": row.last_used,
            }
            for row in result
        ]

    async def get_user_activity_summary(self, user_ids: Sequence[uuid.UUID]) -> dict[uuid.UUID, dict]:
        """Get aggregate AI activity for selected users."""
        if not user_ids:
            return {}

        result = await self.session.execute(
            select(
                UserAIHistory.user_id,
                func.count(UserAIHistory.id).label("analyses_count"),
                func.count(UserAIHistory.filename).label("files_count"),
                func.max(UserAIHistory.created_at).label("last_activity_at"),
            )
            .where(UserAIHistory.user_id.in_(user_ids))
            .group_by(UserAIHistory.user_id)
        )
        return {
            row.user_id: {
                "analyses_count": row.analyses_count,
                "files_count": row.files_count,
                "last_activity_at": row.last_activity_at,
            }
            for row in result
        }


class AdminUserRepository:
    """Repository for admin user overview queries."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[Sequence[User], int]:
        query = select(User)
        count_query = select(func.count()).select_from(User)

        conditions = []
        if search:
            term = f"%{search}%"
            conditions.append(
                or_(
                    User.email.ilike(term),
                    User.username.ilike(term),
                    User.full_name.ilike(term),
                )
            )
        if role:
            conditions.append(User.role == UserRole(role))
        if is_active is not None:
            conditions.append(User.is_active == is_active)

        if conditions:
            query = query.where(*conditions)
            count_query = count_query.where(*conditions)

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()
        result = await self.session.execute(
            query.order_by(desc(User.created_at)).offset(skip).limit(limit)
        )
        return result.scalars().all(), total

    async def count_users(self) -> dict[str, int]:
        total = await self.session.scalar(select(func.count()).select_from(User))
        active = await self.session.scalar(
            select(func.count()).select_from(User).where(User.is_active.is_(True))
        )
        admins = await self.session.scalar(
            select(func.count()).select_from(User).where(User.role == UserRole.ADMIN)
        )
        return {
            "total": total or 0,
            "active": active or 0,
            "admins": admins or 0,
        }


class UserSettingsRepository:
    """Repository for UserSettings CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: uuid.UUID) -> UserSettings | None:
        """Get settings by user ID."""
        result = await self.session.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: uuid.UUID) -> UserSettings:
        """Create default settings for user."""
        settings = UserSettings(user_id=user_id)
        self.session.add(settings)
        await self.session.flush()
        await self.session.refresh(settings)
        return settings


class SupportRepository:
    """Repository for support conversations and messages."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_conversation(
        self,
        user_id: uuid.UUID,
        subject: str,
        initial_message: str,
    ) -> SupportConversation:
        now = datetime.now(timezone.utc)
        conversation = SupportConversation(
            user_id=user_id,
            subject=subject.strip(),
            last_message_preview=initial_message.strip()[:300],
            user_last_read_at=now,
        )
        self.session.add(conversation)
        await self.session.flush()

        message = SupportMessage(
            conversation_id=conversation.id,
            sender_id=user_id,
            sender_role=SupportMessageSender.USER,
            message=initial_message.strip(),
        )
        self.session.add(message)
        await self.session.flush()

        return await self.get_conversation(conversation.id)

    async def get_conversation(
        self,
        conversation_id: uuid.UUID,
    ) -> SupportConversation | None:
        result = await self.session.execute(
            select(SupportConversation)
            .options(
                selectinload(SupportConversation.user),
                selectinload(SupportConversation.messages),
            )
            .where(SupportConversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def list_user_conversations(
        self,
        user_id: uuid.UUID,
    ) -> Sequence[SupportConversation]:
        result = await self.session.execute(
            select(SupportConversation)
            .options(
                selectinload(SupportConversation.user),
                selectinload(SupportConversation.messages),
            )
            .where(SupportConversation.user_id == user_id)
            .order_by(desc(SupportConversation.updated_at))
        )
        return result.scalars().all()

    async def list_all_conversations(self) -> Sequence[SupportConversation]:
        result = await self.session.execute(
            select(SupportConversation)
            .options(
                selectinload(SupportConversation.user),
                selectinload(SupportConversation.messages),
            )
            .order_by(desc(SupportConversation.updated_at))
        )
        return result.scalars().all()

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        sender_id: uuid.UUID,
        sender_role: SupportMessageSender,
        message_text: str,
    ) -> SupportMessage:
        message = SupportMessage(
            conversation_id=conversation_id,
            sender_id=sender_id,
            sender_role=sender_role,
            message=message_text.strip(),
        )
        self.session.add(message)

        conversation = await self.get_conversation(conversation_id)
        if conversation:
            conversation.last_message_preview = message_text.strip()[:300]
            if sender_role == SupportMessageSender.ADMIN and conversation.status == SupportConversationStatus.OPEN:
                conversation.status = SupportConversationStatus.IN_PROGRESS
            elif sender_role == SupportMessageSender.USER and conversation.status == SupportConversationStatus.CLOSED:
                conversation.status = SupportConversationStatus.OPEN
            if sender_role == SupportMessageSender.ADMIN:
                conversation.admin_last_read_at = datetime.now(timezone.utc)
            else:
                conversation.user_last_read_at = datetime.now(timezone.utc)

        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def update_status(
        self,
        conversation_id: uuid.UUID,
        status: SupportConversationStatus,
    ) -> SupportConversation | None:
        await self.session.execute(
            update(SupportConversation)
            .where(SupportConversation.id == conversation_id)
            .values(status=status)
        )
        await self.session.flush()
        return await self.get_conversation(conversation_id)

    async def mark_as_read(
        self,
        conversation_id: uuid.UUID,
        is_admin: bool,
    ) -> None:
        column_name = "admin_last_read_at" if is_admin else "user_last_read_at"
        await self.session.execute(
            text(
                f"UPDATE support_conversations SET {column_name} = NOW() WHERE id = :conversation_id"
            ),
            {"conversation_id": str(conversation_id)},
        )
        await self.session.flush()

    async def update(self, user_id: uuid.UUID, **kwargs) -> UserSettings:
        """Update user settings."""
        settings = await self.get_by_user(user_id)
        if not settings:
            settings = await self.create(user_id)
        
        for key, value in kwargs.items():
            if hasattr(settings, key) and value is not None:
                setattr(settings, key, value)
        
        await self.session.flush()
        await self.session.refresh(settings)
        return settings
