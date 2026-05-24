"""
Pydantic v2 schemas for API request/response validation.
"""

from shared.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    TokenResponse,
)
from shared.schemas.article import (
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    ArticleListResponse,
)
from shared.schemas.validation import ValidationRequest, ValidationResponse
from shared.schemas.ai_analysis import AIAnalysisRequest, AIAnalysisResponse
from shared.schemas.analytics import AnalyticsDashboard
from shared.schemas.support import (
    SupportConversationCreate,
    SupportMessageCreate,
    SupportConversationResponse,
    SupportConversationList,
    SupportConversationListItem,
    SupportConversationStatusUpdate,
)

__all__ = [
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "TokenResponse",
    "ArticleCreate",
    "ArticleUpdate",
    "ArticleResponse",
    "ArticleListResponse",
    "ValidationRequest",
    "ValidationResponse",
    "AIAnalysisRequest",
    "AIAnalysisResponse",
    "AnalyticsDashboard",
    "SupportConversationCreate",
    "SupportMessageCreate",
    "SupportConversationResponse",
    "SupportConversationList",
    "SupportConversationListItem",
    "SupportConversationStatusUpdate",
]
