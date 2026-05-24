"""
Audio/Video Transcription model for storing transcription results.
"""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, String, Text, DateTime, Float, Integer, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from shared.database import Base


class AudioTranscription(Base):
    """Audio/Video transcription results."""
    
    __tablename__ = "audio_transcriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    
    # File information
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    duration = Column(Float)  # seconds
    file_type = Column(String(50), nullable=False)  # 'audio' or 'video'
    format = Column(String(20), nullable=False)  # mp3, wav, m4a, mp4, etc.
    
    # Transcription results
    transcript = Column(Text, nullable=False)
    language = Column(String(10))  # detected language code
    confidence = Column(Float)  # overall confidence score
    
    # Segments with timestamps
    segments = Column(JSON)  # Array of {start, end, text, confidence} objects
    
    # Additional metadata
    summary = Column(Text)  # AI-generated summary
    key_topics = Column(JSON)  # Array of key topics
    sentiment = Column(JSON)  # Sentiment analysis results
    is_malicious = Column(Integer, default=0)  # 0 = safe, 1 = malicious
    safety_score = Column(Float)  # 0.0 - 1.0 risk score
    safety_summary = Column(Text)
    safety_categories = Column(JSON)  # risk labels

    # Processing info
    processing_time = Column(Float)  # seconds
    model_used = Column(String(100))  # whisper model name
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="audio_transcriptions")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": str(self.id),
            "user_id": str(self.user_id),
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "duration": self.duration,
            "file_type": self.file_type,
            "format": self.format,
            "transcript": self.transcript,
            "language": self.language,
            "confidence": self.confidence,
            "segments": self.segments or [],
            "summary": self.summary,
            "key_topics": self.key_topics or [],
            "sentiment": self.sentiment,
            "is_malicious": bool(self.is_malicious),
            "safety_score": self.safety_score,
            "safety_summary": self.safety_summary,
            "safety_categories": self.safety_categories or [],
            "processing_time": self.processing_time,
            "model_used": self.model_used,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
