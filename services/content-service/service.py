"""
Content service business logic.
"""

import uuid
import logging

from fastapi import HTTPException, status

from shared.schemas.article import (
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    ArticleListResponse,
)
from shared.models.article import ArticleStatus
from shared.broker import broker, VALIDATION_QUEUE
from shared.analytics_events import publish_analytics_event

from repository import ArticleRepository
from minio_client import upload_image_to_s3

logger = logging.getLogger(__name__)


class ContentService:
    """Content management service with validation/AI pipeline."""

    def __init__(self, article_repo: ArticleRepository):
        self.article_repo = article_repo

    async def create_article(
        self, article_data: ArticleCreate, author_id: uuid.UUID
    ) -> ArticleResponse:
        """Create article and send to validation queue."""
        article = await self.article_repo.create(
            title=article_data.title,
            content=article_data.content,
            author_id=author_id,
            category_id=article_data.category_id,
            tags=article_data.tags,
        )

        # Send to validation queue
        try:
            await broker.publish(
                VALIDATION_QUEUE,
                {
                    "article_id": str(article.id),
                    "title": article.title,
                    "content": article.content,
                    "tags": article_data.tags or [],
                },
            )
            # Update status to validating
            await self.article_repo.update_status(article.id, ArticleStatus.VALIDATING)
            article = await self.article_repo.get_by_id(article.id)
        except Exception as e:
            logger.warning("Failed to send to validation queue: %s", e)

        await publish_analytics_event(
            service="content-service",
            event_type="article_created",
            message=f"Article '{article.title}' created",
            details={
                "article_id": str(article.id),
                "author_id": str(author_id),
                "status": article.status.value if article.status else None,
            },
        )

        return ArticleResponse.model_validate(article)

    async def list_articles(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        category_id: uuid.UUID | None = None,
        tag: str | None = None,
        status_filter: str | None = None,
        author_id: uuid.UUID | None = None,
    ) -> ArticleListResponse:
        """List articles with pagination and filters."""
        articles, total = await self.article_repo.list_all(
            page=page,
            page_size=page_size,
            search=search,
            category_id=category_id,
            tag=tag,
            status_filter=status_filter,
            author_id=author_id,
        )

        pages = (total + page_size - 1) // page_size

        return ArticleListResponse(
            items=[ArticleResponse.model_validate(a) for a in articles],
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
        )

    async def get_article(self, article_id: uuid.UUID) -> ArticleResponse:
        """Get a single article."""
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Article not found",
            )
        return ArticleResponse.model_validate(article)

    async def update_article(
        self,
        article_id: uuid.UUID,
        article_data: ArticleUpdate,
        current_user: dict,
    ) -> ArticleResponse:
        """Update an article."""
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
            )

        # Check ownership or admin
        if (
            str(article.author_id) != str(current_user["user_id"])
            and current_user["role"] != "admin"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this article",
            )

        update_data = article_data.model_dump(exclude_unset=True)
        tags = update_data.pop("tags", None)

        article = await self.article_repo.update(
            article_id, tags=tags, **update_data
        )
        await publish_analytics_event(
            service="content-service",
            event_type="article_updated",
            message=f"Article '{article.title}' updated",
            details={
                "article_id": str(article.id),
                "updated_fields": list(update_data.keys()) + (["tags"] if tags is not None else []),
                "editor_id": str(current_user["user_id"]),
            },
        )
        return ArticleResponse.model_validate(article)

    async def delete_article(
        self, article_id: uuid.UUID, current_user: dict
    ) -> None:
        """Delete an article."""
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
            )

        if (
            str(article.author_id) != str(current_user["user_id"])
            and current_user["role"] != "admin"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this article",
            )

        await self.article_repo.delete(article_id)
        await publish_analytics_event(
            service="content-service",
            event_type="article_deleted",
            message=f"Article '{article.title}' deleted",
            details={
                "article_id": str(article.id),
                "deleted_by": str(current_user["user_id"]),
            },
            level="warning",
        )

    async def upload_cover_image(
        self, article_id: uuid.UUID, file, current_user: dict
    ) -> ArticleResponse:
        """Upload cover image to MinIO and update article."""
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
            )

        # Check ownership or admin
        if (
            str(article.author_id) != str(current_user["user_id"])
            and current_user["role"] != "admin"
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to edit this article",
            )
            
        # upload
        url = await upload_image_to_s3(file)
        if not url:
            raise HTTPException(status_code=500, detail="Failed to upload image")

        article = await self.article_repo.update(article_id, cover_image_url=url)
        await publish_analytics_event(
            service="content-service",
            event_type="article_cover_uploaded",
            message=f"Cover image uploaded for article '{article.title}'",
            details={
                "article_id": str(article.id),
                "uploaded_by": str(current_user["user_id"]),
                "cover_image_url": url,
            },
        )
        return ArticleResponse.model_validate(article)

    async def update_status(
        self, article_id: uuid.UUID, new_status: str
    ) -> ArticleResponse:
        """Update article status (admin action)."""
        article = await self.article_repo.get_by_id(article_id)
        if not article:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Article not found"
            )

        try:
            status_enum = ArticleStatus(new_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {new_status}",
            )

        await self.article_repo.update_status(article_id, status_enum)
        article = await self.article_repo.get_by_id(article_id)
        await publish_analytics_event(
            service="content-service",
            event_type="article_status_changed",
            message=f"Article '{article.title}' status changed to {status_enum.value}",
            details={
                "article_id": str(article.id),
                "status": status_enum.value,
            },
        )
        return ArticleResponse.model_validate(article)

    async def list_categories(self):
        """List all categories."""
        return await self.article_repo.list_categories()

    async def list_tags(self):
        """List all tags."""
        return await self.article_repo.list_tags()
