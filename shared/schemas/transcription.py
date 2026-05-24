"""
Pydantic schemas for audio/video transcription.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID


class TranscriptionSegment(BaseModel):
    """Individual transcription segment with timestamp."""
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    text: str = Field(..., description="Transcribed text")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")


class TranscriptionCreate(BaseModel):
    """Request schema for creating transcription."""
    filename: str = Field(..., description="Stored filename")
    original_filename: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    duration: Optional[float] = Field(None, description="Duration in seconds")
    file_type: str = Field(..., description="File type: 'audio' or 'video'")
    format: str = Field(..., description="File format (mp3, wav, m4a, mp4, etc.)")


class TranscriptionUpdate(BaseModel):
    """Request schema for updating transcription."""
    transcript: Optional[str] = Field(None, description="Full transcript text")
    summary: Optional[str] = Field(None, description="AI-generated summary")
    key_topics: Optional[List[str]] = Field(None, description="Key topics list")
    sentiment: Optional[Dict[str, Any]] = Field(None, description="Sentiment analysis")


class SecurityVerdict(BaseModel):
    is_safe: bool = True
    is_content_allowed: bool = True
    is_malware_suspected: bool = False
    verdict: str = "safe"
    summary: str = "No suspicious indicators found."
    risk_flags: List[str] = []
    scan_engine: str = "heuristic-static-v1"


class TranscriptionResponse(BaseModel):
    """Response schema for transcription data."""
    id: UUID
    user_id: UUID
    filename: str
    original_filename: str
    file_size: int
    duration: Optional[float]
    file_type: str
    format: str
    transcript: str
    language: Optional[str]
    confidence: Optional[float]
    segments: List[TranscriptionSegment]
    summary: Optional[str]
    key_topics: List[str]
    sentiment: Optional[Dict[str, Any]]
    is_malicious: bool = False
    safety_score: Optional[float] = None
    safety_summary: Optional[str] = None
    safety_categories: List[str] = []
    security_verdict: SecurityVerdict = SecurityVerdict()
    processing_time: Optional[float]
    model_used: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TranscriptionList(BaseModel):
    """Response schema for transcription list."""
    items: List[TranscriptionResponse]
    total: int
    page: int
    page_size: int


class TranscriptionStats(BaseModel):
    """Statistics for transcriptions."""
    total_transcriptions: int
    total_duration: float  # Total duration in seconds
    avg_duration: float
    most_used_format: Optional[str]
    transcriptions_this_week: int
    transcriptions_this_month: int
    languages_used: List[Dict[str, Any]]  # [{"language": "en", "count": 5}, ...]
