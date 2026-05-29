"""
User service business logic.
"""

import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status

from shared.schemas.history import UserAIHistoryCreate, UserAIHistoryResponse, UserAIHistoryList
from shared.schemas.settings import UserSettingsUpdate, UserSettingsResponse
from shared.schemas.statistics import UserStatistics, ToolUsageStats
from shared.models.user_ai_history import AIToolType
from shared.schemas.admin import (
    AdminFileItem,
    AdminFileList,
    AdminOverview,
    AdminToolUsageItem,
    AdminUserItem,
    AdminUserList,
)
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

from repository import (
    AdminUserRepository,
    UserHistoryRepository,
    UserSettingsRepository,
    SupportRepository,
)


class UserService:
    """User history, settings, and statistics service."""

    def __init__(
        self,
        history_repo: UserHistoryRepository,
        settings_repo: UserSettingsRepository,
        support_repo: SupportRepository,
        admin_user_repo: AdminUserRepository | None = None,
    ):
        self.history_repo = history_repo
        self.settings_repo = settings_repo
        self.support_repo = support_repo
        self.admin_user_repo = admin_user_repo

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

    @staticmethod
    def _extract_file_size_bytes(history) -> int | None:
        input_data = history.input_data or {}
        result_data = history.result_data or {}
        size = input_data.get("size") or result_data.get("file_size")
        if isinstance(size, (int, float)):
            return int(size)
        size_kb = result_data.get("file_size_kb")
        if isinstance(size_kb, (int, float)):
            return int(size_kb * 1024)
        return None

    @staticmethod
    def _build_file_characteristics(history) -> dict:
        result_data = history.result_data or {}
        tool_type = history.tool_type.value

        if tool_type == AIToolType.DOCUMENT_ANALYSIS.value:
            keys = [
                "file_type",
                "file_size_kb",
                "text_length",
                "word_count",
                "line_count",
                "language",
                "content_category",
                "quality_score",
            ]
        elif tool_type == AIToolType.CSV_ANALYSIS.value:
            keys = [
                "total_rows",
                "total_columns",
                "columns",
                "data_quality",
                "missing_values",
            ]
        elif tool_type == AIToolType.IMAGE_ANALYSIS.value:
            keys = [
                "format",
                "width",
                "height",
                "file_size_kb",
                "color_mode",
                "has_exif",
                "is_suitable",
            ]
        elif tool_type == AIToolType.AUDIO_TRANSCRIPTION.value:
            keys = [
                "duration",
                "language",
                "key_topics",
                "safety_score",
                "safety_summary",
            ]
        else:
            keys = []

        return {key: result_data[key] for key in keys if key in result_data}

    @classmethod
    def _build_admin_file_item(cls, history) -> AdminFileItem:
        result_data = history.result_data or {}
        filename = history.filename or result_data.get("filename") or "unknown"
        size_bytes = cls._extract_file_size_bytes(history)
        recommendations = (
            result_data.get("ai_recommendations")
            or result_data.get("recommendations")
            or []
        )
        warnings = result_data.get("warnings") or []

        return AdminFileItem(
            id=history.id,
            user_id=history.user_id,
            user_name=(
                (history.user.full_name or history.user.username)
                if getattr(history, "user", None)
                else None
            ),
            user_email=history.user.email if getattr(history, "user", None) else None,
            tool_type=history.tool_type.value,
            filename=filename,
            title=history.title,
            file_extension=Path(filename).suffix.lower() or None,
            file_size_bytes=size_bytes,
            file_size_kb=round(size_bytes / 1024, 2) if size_bytes else result_data.get("file_size_kb"),
            characteristics=cls._build_file_characteristics(history),
            ai_summary=result_data.get("ai_summary") or result_data.get("summary"),
            ai_recommendations=recommendations if isinstance(recommendations, list) else [],
            warnings=warnings if isinstance(warnings, list) else [],
            security_verdict=result_data.get("security_verdict"),
            created_at=history.created_at,
        )

    @staticmethod
    def _build_admin_user_item(user, activity: dict | None = None) -> AdminUserItem:
        activity = activity or {}
        return AdminUserItem(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
            analyses_count=activity.get("analyses_count", 0),
            files_count=activity.get("files_count", 0),
            last_activity_at=activity.get("last_activity_at"),
        )

    @staticmethod
    def _build_ai_insights(
        totals: dict[str, int],
        tool_usage: list[AdminToolUsageItem],
        recent_files: list[AdminFileItem],
    ) -> list[str]:
        insights: list[str] = []
        if not tool_usage:
            return ["Пока недостаточно данных для системного AI-анализа."]

        top_tool = max(tool_usage, key=lambda item: item.count)
        insights.append(f"Самый активный инструмент: {top_tool.tool_type} ({top_tool.count} запусков).")

        risky_files = [
            item for item in recent_files
            if item.warnings or (item.security_verdict and item.security_verdict.get("verdict") != "safe")
        ]
        if risky_files:
            insights.append(f"Есть файлы с предупреждениями: {len(risky_files)} из последних {len(recent_files)}.")
        else:
            insights.append("В последних загруженных файлах критичных предупреждений не видно.")

        active_ratio = round((totals.get("active_users", 0) / max(totals.get("users", 1), 1)) * 100)
        insights.append(f"Активность пользователей: {active_ratio}% аккаунтов включены.")
        return insights

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

    # ── Admin Control Methods ──────────────────────────────────────

    async def admin_list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        role: str | None = None,
        is_active: bool | None = None,
    ) -> AdminUserList:
        """List users with admin activity metadata."""
        if not self.admin_user_repo:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin repository is not configured",
            )

        skip = (page - 1) * page_size
        users, total = await self.admin_user_repo.list_users(
            skip=skip,
            limit=page_size,
            search=search,
            role=role,
            is_active=is_active,
        )
        activity_map = await self.history_repo.get_user_activity_summary([user.id for user in users])
        user_counts = await self.admin_user_repo.count_users()

        return AdminUserList(
            items=[
                self._build_admin_user_item(user, activity_map.get(user.id))
                for user in users
            ],
            total=total,
            active_users=user_counts["active"],
            admins=user_counts["admins"],
            page=page,
            page_size=page_size,
        )

    async def admin_list_files(
        self,
        page: int = 1,
        page_size: int = 20,
        tool_type: str | None = None,
        search: str | None = None,
        user_id: uuid.UUID | None = None,
    ) -> AdminFileList:
        """List all uploaded file analysis records."""
        skip = (page - 1) * page_size
        tool_enum = None
        if tool_type:
            try:
                tool_enum = AIToolType(tool_type)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid tool type: {tool_type}",
                )

        files, total = await self.history_repo.list_uploaded_files(
            skip=skip,
            limit=page_size,
            tool_type=tool_enum,
            search=search,
            user_id=user_id,
        )
        return AdminFileList(
            items=[self._build_admin_file_item(item) for item in files],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def admin_get_overview(self) -> AdminOverview:
        """Get admin dashboard overview across users and AI activity."""
        if not self.admin_user_repo:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Admin repository is not configured",
            )

        user_counts = await self.admin_user_repo.count_users()
        analyses = await self.history_repo.count_all()
        files = await self.history_repo.count_all_files()
        support_conversations = await self.support_repo.list_all_conversations()
        usage_rows = await self.history_repo.count_all_by_tool()
        tool_usage = [
            AdminToolUsageItem(
                tool_type=row["tool_type"].value,
                count=row["count"],
                files_count=row["files_count"],
                last_used=row["last_used"],
            )
            for row in usage_rows
        ]

        recent_users_response = await self.admin_list_users(page=1, page_size=5)
        recent_files_response = await self.admin_list_files(page=1, page_size=6)
        totals = {
            "users": user_counts["total"],
            "active_users": user_counts["active"],
            "admins": user_counts["admins"],
            "analyses": analyses,
            "files": files,
            "support_open": sum(
                1
                for conversation in support_conversations
                if conversation.status == SupportConversationStatus.OPEN
            ),
        }

        return AdminOverview(
            generated_at=datetime.now(timezone.utc),
            totals=totals,
            tool_usage=tool_usage,
            recent_users=recent_users_response.items,
            recent_files=recent_files_response.items,
            ai_insights=self._build_ai_insights(
                totals=totals,
                tool_usage=tool_usage,
                recent_files=recent_files_response.items,
            ),
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
