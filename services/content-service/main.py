"""
Content Service - Article CRUD, triggers validation and AI analysis.
Runs on port 8002.
"""

import sys
import os
import logging

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_session, init_db
from shared.schemas.article import (
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    ArticleListResponse,
)
from shared.auth import get_current_user, require_admin
from shared.broker import broker

from service import ContentService
from repository import ArticleRepository

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB and message broker."""
    logger.info("Content Service starting...")
    await init_db()
    try:
        await broker.connect()
    except Exception as e:
        logger.warning("Could not connect to RabbitMQ: %s", e)
    yield
    await broker.disconnect()
    logger.info("Content Service shutting down...")


app = FastAPI(
    title="Content Service",
    description="Article CRUD with automated validation and AI analysis pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_content_service(
    session: AsyncSession = Depends(get_session),
) -> ContentService:
    return ContentService(ArticleRepository(session))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "content-service"}


@app.post("/content", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_data: ArticleCreate,
    current_user: dict = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    """Create a new article and trigger validation/AI pipeline."""
    return await service.create_article(article_data, current_user["user_id"])


@app.get("/content", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    category_id: UUID | None = None,
    tag: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    service: ContentService = Depends(get_content_service),
):
    """List articles with filtering, search, and pagination."""
    return await service.list_articles(
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        tag=tag,
        status_filter=status_filter,
    )


@app.get("/content/my", response_model=ArticleListResponse)
async def list_my_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    """List articles belonging to the current user (all statuses)."""
    return await service.list_articles(
        page=page,
        page_size=page_size,
        search=search,
        status_filter=status_filter,
        author_id=current_user["user_id"],
    )


@app.get("/content/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: UUID,
    service: ContentService = Depends(get_content_service),
):
    """Get a single article by ID."""
    return await service.get_article(article_id)


@app.put("/content/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: UUID,
    article_data: ArticleUpdate,
    current_user: dict = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    """Update an article."""
    return await service.update_article(article_id, article_data, current_user)


@app.post("/content/{article_id}/image", response_model=ArticleResponse)
async def upload_article_image(
    article_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    """Upload cover image for article."""
    return await service.upload_cover_image(article_id, file, current_user)


@app.delete("/content/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(
    article_id: UUID,
    current_user: dict = Depends(get_current_user),
    service: ContentService = Depends(get_content_service),
):
    """Delete an article."""
    await service.delete_article(article_id, current_user)


@app.put("/content/{article_id}/status")
async def update_article_status(
    article_id: UUID,
    new_status: str = Query(...),
    current_user: dict = Depends(require_admin),
    service: ContentService = Depends(get_content_service),
):
    """Update article status (admin only) — approve/reject content."""
    return await service.update_status(article_id, new_status)


@app.get("/categories")
async def list_categories(
    service: ContentService = Depends(get_content_service),
):
    """List all categories."""
    return await service.list_categories()


@app.get("/tags")
async def list_tags(
    service: ContentService = Depends(get_content_service),
):
    """List all tags."""
    return await service.list_tags()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
