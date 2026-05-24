"""
User service business logic.
"""

import uuid
from datetime import datetime

from fastapi import HTTPException, status

from shared.schemas.history import UserAIHistoryCreate, UserAIHistoryResponse, UserAIHistoryList
from shared.schemas.settings import UserSettingsUpdate, UserSettingsResponse
from shared.schemas.statistics import UserStatistics, ToolUsageStats
from shared.models.user_ai_history import AIToolType
from shared.models.support_conversation import (
    SupportConversationStatus,
    SupportMessageSender,
)
from shared.schemas.support import (
    SupportConversationCreate,
    SupportConversationList,
    SupportConversationListItem,
    SupportConversationResponse,
    SupportConversationStatusUpdate,
    SupportMessageCreate,
)
from shared.analytics_events import publish_analytics_event

from repository import UserHistoryRepository, UserSettingsRepository, SupportRepository


class UserService:
    """User history, settings, and statistics service."""

    def __init__(
        self,
        history_repo: UserHistoryRepository,
        settings_repo: UserSettingsRepository,
        support_repo: SupportRepository,
    ):
        self.history_repo = history_repo
        self.settings_repo = settings_repo
        self.support_repo = support_repo

    @staticmethod
    def _count_unread_messages(
        conversation,
        *,
        is_admin: bool,
    ) -> int:
        last_read_at: datetime | None = (
            conversation.admin_last_read_at if is_admin else conversation.user_last_read_at
        )
        expected_sender = SupportMessageSender.USER if is_admin else SupportMessageSender.ADMIN
        return sum(
            1
            for message in conversation.messages
            if message.sender_role == expected_sender
            and (last_read_at is None or message.created_at > last_read_at)
        )

    @classmethod
    def _build_support_list_item(
        cls,
        conversation,
        *,
        is_admin: bool,
    ) -> SupportConversationListItem:
        return SupportConversationListItem(
            id=conversation.id,
            user_id=conversation.user_id,
            subject=conversation.subject,
            status=conversation.status,
            last_message_preview=conversation.last_message_preview,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            user_name=(
                (conversation.user.full_name or conversation.user.username)
                if conversation.user
                else None
            ),
            user_email=conversation.user.email if conversation.user else None,
            unread_count=cls._count_unread_messages(conversation, is_admin=is_admin),
        )

    @staticmethod
    def _build_support_response(conversation) -> SupportConversationResponse:
        payload = {
            "id": conversation.id,
            "user_id": conversation.user_id,
            "subject": conversation.subject,
            "status": conversation.status,
            "last_message_preview": conversation.last_message_preview,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
            "user_name": (
                (conversation.user.full_name or conversation.user.username)
                if conversation.user
                else None
            ),
            "user_email": conversation.user.email if conversation.user else None,
            "messages": conversation.messages,
        }
        return SupportConversationResponse.model_validate(payload)

    # ── History Methods ──────────────────────────────────────

    async def create_history(
        self,
        user_id: uuid.UUID,
        history_data: UserAIHistoryCreate
    ) -> UserAIHistoryResponse:
        """Create a new history entry."""
        history = await self.history_repo.create(
            user_id=user_id,
            tool_type=history_data.tool_type,
            input_data=history_data.input_data,
            result_data=history_data.result_data,
            filename=history_data.filename,
            title=history_data.title,
        )
        await publish_analytics_event(
            service="user-service",
            event_type="history_created",
            message=f"User created history entry for tool {history.tool_type.value}",
            details={
                "user_id": str(user_id),
                "history_id": str(history.id),
                "tool_type": history.tool_type.value,
                "title": history.title,
            },
        )
        return UserAIHistoryResponse.model_validate(history)

    async def get_history(
        self,
        user_id: uuid.UUID,
        page: int = 1,
        page_size: int = 20,
        tool_type: str | None = None
    ) -> UserAIHistoryList:
        """Get user's history with pagination."""
        skip = (page - 1) * page_size
        
        # Convert tool_type string to enum if provided
        tool_enum = None
        if tool_type:
            try:
                tool_enum = AIToolType(tool_type)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid tool type: {tool_type}"
                )
        
        items, total = await self.history_repo.list_by_user(
            user_id=user_id,
            skip=skip,
            limit=page_size,
            tool_type=tool_enum
        )
        
        return UserAIHistoryList(
            items=[UserAIHistoryResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size
        )

    async def get_history_item(
        self,
        user_id: uuid.UUID,
        history_id: uuid.UUID
    ) -> UserAIHistoryResponse:
        """Get a specific history item."""
        history = await self.history_repo.get_by_id(history_id, user_id)
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )
        return UserAIHistoryResponse.model_validate(history)

    async def delete_history_item(
        self,
        user_id: uuid.UUID,
        history_id: uuid.UUID
    ) -> None:
        """Delete a history item."""
        history = await self.history_repo.get_by_id(history_id, user_id)
        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="History item not found"
            )
        await self.history_repo.delete(history_id, user_id)

    # ── Settings Methods ──────────────────────────────────────

    async def get_settings(self, user_id: uuid.UUID) -> UserSettingsResponse:
        """Get user settings, create if not exists."""
        settings = await self.settings_repo.get_by_user(user_id)
        if not settings:
            settings = await self.settings_repo.create(user_id)
        return UserSettingsResponse.model_validate(settings)

    async def update_settings(
        self,
        user_id: uuid.UUID,
        settings_data: UserSettingsUpdate
    ) -> UserSettingsResponse:
        """Update user settings."""
        update_data = settings_data.model_dump(exclude_unset=True)
        settings = await self.settings_repo.update(user_id, **update_data)
        return UserSettingsResponse.model_validate(settings)

    # ── Statistics Methods ──────────────────────────────────────

    async def get_statistics(self, user_id: uuid.UUID) -> UserStatistics:
        """Get user statistics."""
        # Total analyses
        total = await self.history_repo.count_by_user(user_id)
        
        # By tool type
        by_tool = await self.history_repo.count_by_tool(user_id)
        analyses_by_tool = [
            ToolUsageStats(
                tool_type=tool.value,
                count=data['count'],
                last_used=data['last_used'].isoformat() if data['last_used'] else None
            )
            for tool, data in by_tool.items()
        ]
        
        # This week and month
        this_week = await self.history_repo.count_recent(user_id, days=7)
        this_month = await self.history_repo.count_recent(user_id, days=30)
        
        # Most used tool
        most_used = max(by_tool.items(), key=lambda x: x[1]['count'])[0].value if by_tool else None
        
        # Recent activity
        recent = await self.history_repo.get_recent_activity(user_id, limit=10)
        recent_activity = [
            {
                'id': str(item.id),
                'tool_type': item.tool_type.value,
                'title': item.title,
                'created_at': item.created_at.isoformat()
            }
            for item in recent
        ]
        
        return UserStatistics(
            total_analyses=total,
            analyses_by_tool=analyses_by_tool,
            analyses_this_week=this_week,
            analyses_this_month=this_month,
            most_used_tool=most_used,
            recent_activity=recent_activity
        )

    # ── Support Methods ──────────────────────────────────────

    async def create_support_conversation(
        self,
        user_id: uuid.UUID,
        data: SupportConversationCreate,
    ) -> SupportConversationResponse:
        conversation = await self.support_repo.create_conversation(
            user_id=user_id,
            subject=data.subject,
            initial_message=data.message,
        )
        await publish_analytics_event(
            service="user-service",
            event_type="support_conversation_created",
            message=f"Support conversation '{conversation.subject}' created",
            details={
                "conversation_id": str(conversation.id),
                "user_id": str(user_id),
                "status": conversation.status.value,
            },
        )
        return self._build_support_response(conversation)

    async def list_support_conversations(
        self,
        user_id: uuid.UUID,
    ) -> SupportConversationList:
        conversations = await self.support_repo.list_user_conversations(user_id)
        return SupportConversationList(
            items=[self._build_support_list_item(conversation, is_admin=False) for conversation in conversations],
            total=len(conversations),
        )

    async def get_support_conversation(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        is_admin: bool = False,
    ) -> SupportConversationResponse:
        conversation = await self.support_repo.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        if not is_admin and conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        await self.support_repo.mark_as_read(conversation_id, is_admin=is_admin)
        updated_conversation = await self.support_repo.get_conversation(conversation_id)
        return self._build_support_response(updated_conversation)

    async def add_support_message(
        self,
        user_id: uuid.UUID,
        conversation_id: uuid.UUID,
        data: SupportMessageCreate,
        is_admin: bool = False,
    ) -> SupportConversationResponse:
        conversation = await self.support_repo.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        if not is_admin and conversation.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        await self.support_repo.add_message(
            conversation_id=conversation_id,
            sender_id=user_id,
            sender_role=SupportMessageSender.ADMIN if is_admin else SupportMessageSender.USER,
            message_text=data.message,
        )
        updated = await self.support_repo.get_conversation(conversation_id)
        await publish_analytics_event(
            service="user-service",
            event_type="support_message_created",
            message=f"Support message added to conversation '{updated.subject}'",
            details={
                "conversation_id": str(conversation_id),
                "sender_id": str(user_id),
                "sender_role": "admin" if is_admin else "user",
                "status": updated.status.value,
            },
        )
        return self._build_support_response(updated)

    async def admin_list_support_conversations(self) -> SupportConversationList:
        conversations = await self.support_repo.list_all_conversations()
        return SupportConversationList(
            items=[self._build_support_list_item(conversation, is_admin=True) for conversation in conversations],
            total=len(conversations),
        )

    async def admin_update_support_status(
        self,
        conversation_id: uuid.UUID,
        data: SupportConversationStatusUpdate,
    ) -> SupportConversationResponse:
        conversation = await self.support_repo.update_status(conversation_id, data.status)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
        await publish_analytics_event(
            service="user-service",
            event_type="support_status_changed",
            message=f"Support conversation status changed to {conversation.status.value}",
            details={
                "conversation_id": str(conversation.id),
                "status": conversation.status.value,
            },
        )
        return self._build_support_response(conversation)
