"""
Analytics repository - database queries for metrics.
"""

from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.models.article import Article, ArticleStatus
from shared.models.user import User, UserRole
from shared.models.validation_log import ValidationLog
from shared.models.ai_analysis import AIAnalysis
from shared.models.system_log import SystemLog
from shared.schemas.analytics import (
    ContentStats,
    UserStats,
    ValidationStats,
    AIAnalysisStats,
)


class AnalyticsRepository:
    """Repository for analytics queries."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_content_stats(self) -> ContentStats:
        """Get article statistics by status."""
        total = await self._count(Article)
        published = await self._count_where(Article, Article.status == ArticleStatus.PUBLISHED)
        draft = await self._count_where(Article, Article.status == ArticleStatus.DRAFT)
        pending = await self._count_where(Article, Article.status == ArticleStatus.PENDING)
        rejected = await self._count_where(Article, Article.status == ArticleStatus.REJECTED)

        return ContentStats(
            total_articles=total,
            published_articles=published,
            draft_articles=draft,
            pending_articles=pending,
            rejected_articles=rejected,
        )

    async def get_user_stats(self) -> UserStats:
        """Get user statistics."""
        total = await self._count(User)
        active = await self._count_where(User, User.is_active == True)
        admins = await self._count_where(User, User.role == UserRole.ADMIN)

        return UserStats(
            total_users=total,
            active_users=active,
            admin_users=admins,
        )

    async def get_validation_stats(self) -> ValidationStats:
        """Get validation statistics."""
        total = await self._count(ValidationLog)
        valid = await self._count_where(ValidationLog, ValidationLog.is_valid == True)
        invalid = total - valid
        error_rate = (invalid / total * 100) if total > 0 else 0.0

        return ValidationStats(
            total_validations=total,
            valid_count=valid,
            invalid_count=invalid,
            error_rate=round(error_rate, 2),
        )

    async def get_ai_stats(self) -> AIAnalysisStats:
        """Get AI analysis statistics."""
        total = await self._count(AIAnalysis)

        # Average scores
        result = await self.session.execute(
            select(
                func.avg(AIAnalysis.quality_score),
                func.avg(AIAnalysis.toxicity_score),
                func.avg(AIAnalysis.readability_score),
            )
        )
        row = result.one()

        return AIAnalysisStats(
            total_analyses=total,
            avg_quality_score=round(float(row[0] or 0), 4),
            avg_toxicity_score=round(float(row[1] or 0), 4),
            avg_readability_score=round(float(row[2] or 0), 4),
        )

    async def get_system_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        service_name: str | None = None,
        level: str | None = None,
    ) -> list[dict]:
        """Get system logs with optional filtering."""
        query = select(SystemLog)

        if service_name:
            query = query.where(SystemLog.service == service_name)
        if level:
            query = query.where(SystemLog.level == level)

        query = query.order_by(SystemLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        logs = result.scalars().all()

        return [
            {
                "id": str(log.id),
                "service": log.service,
                "level": log.level,
                "message": log.message,
                "details": log.details,
                "created_at": str(log.created_at),
            }
            for log in logs
        ]

    async def create_system_log(
        self,
        *,
        service: str,
        level: str,
        message: str,
        details: dict | None = None,
        created_at: datetime | None = None,
    ) -> None:
        """Persist analytics/system event log."""
        log = SystemLog(
            service=service,
            level=level,
            message=message,
            details=details,
            created_at=created_at,
        )
        self.session.add(log)
        await self.session.flush()

    async def _count(self, model) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(model)
        )
        return result.scalar_one()

    async def _count_where(self, model, condition) -> int:
        result = await self.session.execute(
            select(func.count()).select_from(model).where(condition)
        )
        return result.scalar_one()
