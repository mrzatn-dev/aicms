"""
Repository layer for transcription data access.
"""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from shared.models.audio_transcription import AudioTranscription
from shared.models.user import User
from shared.schemas.transcription import TranscriptionCreate, TranscriptionStats


class TranscriptionRepository:
    """Repository for AudioTranscription operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create(self, transcription_data: dict) -> AudioTranscription:
        """Create new transcription."""
        transcription = AudioTranscription(**transcription_data)
        self.session.add(transcription)
        await self.session.commit()
        await self.session.refresh(transcription)
        return transcription
    
    async def get_by_id(self, user_id: UUID, transcription_id: UUID) -> Optional[AudioTranscription]:
        """Get transcription by ID for specific user."""
        stmt = select(AudioTranscription).where(
            and_(
                AudioTranscription.id == transcription_id,
                AudioTranscription.user_id == user_id
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_any_by_id(self, transcription_id: UUID) -> Optional[AudioTranscription]:
        """Get transcription by ID without user scoping for internal jobs."""
        stmt = select(AudioTranscription).where(
            AudioTranscription.id == transcription_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_user_transcriptions(
        self, 
        user_id: UUID, 
        page: int, 
        page_size: int,
        file_type: Optional[str] = None
    ) -> tuple[List[AudioTranscription], int]:
        """Get user's transcriptions with pagination."""
        # Build base query
        conditions = [AudioTranscription.user_id == user_id]
        if file_type:
            conditions.append(AudioTranscription.file_type == file_type)
        
        # Get total count
        count_stmt = select(func.count(AudioTranscription.id)).where(and_(*conditions))
        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar()
        
        # Get paginated results
        stmt = (
            select(AudioTranscription)
            .where(and_(*conditions))
            .order_by(desc(AudioTranscription.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.session.execute(stmt)
        transcriptions = result.scalars().all()
        
        return list(transcriptions), total
    
    async def update(self, transcription: AudioTranscription, update_data: dict) -> AudioTranscription:
        """Update transcription."""
        for key, value in update_data.items():
            if hasattr(transcription, key):
                setattr(transcription, key, value)
        
        await self.session.commit()
        await self.session.refresh(transcription)
        return transcription
    
    async def delete(self, transcription: AudioTranscription) -> None:
        """Delete transcription."""
        await self.session.delete(transcription)
        await self.session.commit()
    
    async def get_stats(self, user_id: UUID) -> dict:
        """Get transcription statistics for user."""
        # Basic stats
        total_stmt = select(func.count(AudioTranscription.id)).where(
            AudioTranscription.user_id == user_id
        )
        total_result = await self.session.execute(total_stmt)
        total_transcriptions = total_result.scalar()
        
        # Duration stats
        duration_stmt = select(
            func.sum(AudioTranscription.duration),
            func.avg(AudioTranscription.duration)
        ).where(AudioTranscription.user_id == user_id)
        duration_result = await self.session.execute(duration_stmt)
        total_duration, avg_duration = duration_result.first()
        
        # Most used format
        format_stmt = (
            select(AudioTranscription.format, func.count(AudioTranscription.id).label('count'))
            .where(AudioTranscription.user_id == user_id)
            .group_by(AudioTranscription.format)
            .order_by(desc('count'))
            .limit(1)
        )
        format_result = await self.session.execute(format_stmt)
        most_used_format_row = format_result.first()
        most_used_format = most_used_format_row[0] if most_used_format_row else None
        
        # Recent transcriptions (this week, this month)
        from datetime import datetime, timedelta
        
        week_ago = datetime.utcnow() - timedelta(days=7)
        month_ago = datetime.utcnow() - timedelta(days=30)
        
        week_stmt = select(func.count(AudioTranscription.id)).where(
            and_(
                AudioTranscription.user_id == user_id,
                AudioTranscription.created_at >= week_ago
            )
        )
        week_result = await self.session.execute(week_stmt)
        transcriptions_this_week = week_result.scalar()
        
        month_stmt = select(func.count(AudioTranscription.id)).where(
            and_(
                AudioTranscription.user_id == user_id,
                AudioTranscription.created_at >= month_ago
            )
        )
        month_result = await self.session.execute(month_stmt)
        transcriptions_this_month = month_result.scalar()
        
        # Languages used
        languages_stmt = (
            select(AudioTranscription.language, func.count(AudioTranscription.id).label('count'))
            .where(
                and_(
                    AudioTranscription.user_id == user_id,
                    AudioTranscription.language.isnot(None)
                )
            )
            .group_by(AudioTranscription.language)
            .order_by(desc('count'))
        )
        languages_result = await self.session.execute(languages_stmt)
        languages_used = [
            {"language": row[0], "count": row[1]} 
            for row in languages_result.all()
        ]
        
        return {
            "total_transcriptions": total_transcriptions or 0,
            "total_duration": total_duration or 0.0,
            "avg_duration": avg_duration or 0.0,
            "most_used_format": most_used_format,
            "transcriptions_this_week": transcriptions_this_week or 0,
            "transcriptions_this_month": transcriptions_this_month or 0,
            "languages_used": languages_used,
        }
