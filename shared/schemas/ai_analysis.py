"""AI Analysis schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel


class AIAnalysisRequest(BaseModel):
    """Schema for AI analysis request."""

    article_id: uuid.UUID
    title: str
    content: str


class AIAnalysisResponse(BaseModel):
    """Schema for AI analysis response."""

    article_id: uuid.UUID
    category: str | None = None
    tags: list[str] = []
    toxicity_score: float = 0.0
    quality_score: float = 0.0
    readability_score: float = 0.0
    summary: str | None = None
    sentiment: str | None = None
    key_entities: dict | None = None
    analyzed_at: datetime | None = None

class AIDraftRequest(BaseModel):
    """Schema for AI draft generation request."""
    topic: str
    tone: str = "professional"

class AIDraftResponse(BaseModel):
    """Schema for AI draft generation response."""
    title: str
    content: str

class AISEORequest(BaseModel):
    """Schema for AI SEO generation request."""
    content: str

class AISEOResponse(BaseModel):
    """Schema for AI SEO generation response."""
    title: str
    meta_description: str
    keywords: list[str]


class AIChatMessage(BaseModel):
    """A single chat message."""
    role: str  # 'user' or 'assistant'
    content: str


class AIChatRequest(BaseModel):
    """Schema for AI chat request."""
    message: str
    history: list[AIChatMessage] = []
    language: str = "ru"


class AIChatResponse(BaseModel):
    """Schema for AI chat response."""
    reply: str


class AIValidationRequest(BaseModel):
    title: str
    content: str
    language: str = "ru"


class AIValidationResponse(BaseModel):
    is_valid: bool
    reason: str
    score: int = 100
    issues: list[str] = []
    suggestions: list[str] = []


class SecurityVerdict(BaseModel):
    is_safe: bool = True
    is_content_allowed: bool = True
    is_malware_suspected: bool = False
    verdict: str = "safe"
    summary: str = "No suspicious indicators found."
    risk_flags: list[str] = []
    scan_engine: str = "heuristic-static-v1"


class CSVAnalysisResponse(BaseModel):
    """Schema for CSV AI analysis response."""
    filename: str
    total_rows: int
    total_columns: int
    columns: list[str]
    summary: str
    data_quality: dict
    anomalies: list[str]
    recommendations: list[str]
    warnings: list[str] = []
    missing_values: dict[str, int] = {}
    security_verdict: SecurityVerdict = SecurityVerdict()


class ImageAnalysisResponse(BaseModel):
    """Schema for image AI analysis response."""
    filename: str
    format: str
    width: int
    height: int
    file_size_kb: float
    color_mode: str
    has_exif: bool
    exif_data: dict = {}
    warnings: list[str] = []
    ai_summary: str = ""
    ai_recommendations: list[str] = []
    is_suitable: bool = True
    security_verdict: SecurityVerdict = SecurityVerdict()
