"""Article schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class ArticleCreate(BaseModel):
    """Schema for creating an article."""

    title: str = Field(min_length=5, max_length=500)
    content: str = Field(min_length=50)
    category_id: uuid.UUID | None = None
    cover_image_url: str | None = None
    tags: list[str] = Field(default_factory=list)


class ArticleUpdate(BaseModel):
    """Schema for updating an article."""

    title: str | None = Field(default=None, min_length=5, max_length=500)
    content: str | None = Field(default=None, min_length=50)
    category_id: uuid.UUID | None = None
    cover_image_url: str | None = None
    status: str | None = None
    tags: list[str] | None = None


class TagResponse(BaseModel):
    """Schema for tag response."""

    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


class CategoryResponse(BaseModel):
    """Schema for category response."""

    id: uuid.UUID
    name: str
    description: str | None

    model_config = {"from_attributes": True}


class AIAnalysisBrief(BaseModel):
    """Brief AI analysis info for article response."""

    category: str | None = None
    tags: list[str] | None = None
    toxicity_score: float | None = None
    quality_score: float | None = None
    summary: str | None = None

    model_config = {"from_attributes": True}


class ArticleResponse(BaseModel):
    """Schema for article response."""

    id: uuid.UUID
    title: str
    content: str
    cover_image_url: str | None = None
    summary: str | None
    author_id: uuid.UUID
    status: str
    category: CategoryResponse | None = None
    tags: list[TagResponse] = []
    ai_analysis: AIAnalysisBrief | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(BaseModel):
    """Schema for paginated article list."""

    items: list[ArticleResponse]
    total: int
    page: int
    page_size: int
    pages: int
