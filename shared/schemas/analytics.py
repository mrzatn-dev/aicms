"""Analytics schemas."""

from pydantic import BaseModel


class ContentStats(BaseModel):
    """Content statistics."""

    total_articles: int = 0
    published_articles: int = 0
    draft_articles: int = 0
    pending_articles: int = 0
    rejected_articles: int = 0


class UserStats(BaseModel):
    """User statistics."""

    total_users: int = 0
    active_users: int = 0
    admin_users: int = 0


class ValidationStats(BaseModel):
    """Validation statistics."""

    total_validations: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    error_rate: float = 0.0


class AIAnalysisStats(BaseModel):
    """AI analysis statistics."""

    total_analyses: int = 0
    avg_quality_score: float = 0.0
    avg_toxicity_score: float = 0.0
    avg_readability_score: float = 0.0


class AnalyticsDashboard(BaseModel):
    """Combined dashboard analytics."""

    content: ContentStats = ContentStats()
    users: UserStats = UserStats()
    validation: ValidationStats = ValidationStats()
    ai_analysis: AIAnalysisStats = AIAnalysisStats()
