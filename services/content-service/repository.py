"""
Article repository - async database operations.
"""

import uuid
from typing import Sequence

from sqlalchemy import select, update, delete, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from shared.models.article import Article, ArticleStatus, article_tags
from shared.models.tag import Tag
from shared.models.category import Category


class ArticleRepository:
    """Repository for Article CRUD operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(
        self,
        title: str,
        content: str,
        author_id: uuid.UUID,
        category_id: uuid.UUID | None = None,
        tags: list[str] | None = None,
    ) -> Article:
        """Create a new article with optional tags."""
        article = Article(
            title=title,
            content=content,
            author_id=author_id,
            category_id=category_id,
            status=ArticleStatus.PENDING,
        )
        self.session.add(article)
        await self.session.flush()

        # Handle tags
        if tags:
            for tag_name in tags:
                tag = await self._get_or_create_tag(tag_name)
                article.tags.append(tag)
            await self.session.flush()

        # Use get_by_id to return article with all relationships loaded
        return await self.get_by_id(article.id)

    async def get_by_id(self, article_id: uuid.UUID) -> Article | None:
        """Get article by ID with all relationships."""
        result = await self.session.execute(
            select(Article)
            .options(
                selectinload(Article.author),
                selectinload(Article.category),
                selectinload(Article.tags),
                selectinload(Article.ai_analysis),
            )
            .where(Article.id == article_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        category_id: uuid.UUID | None = None,
        tag: str | None = None,
        status_filter: str | None = None,
        author_id: uuid.UUID | None = None,
    ) -> tuple[Sequence[Article], int]:
        """List articles with filtering and pagination."""
        query = select(Article).options(
            selectinload(Article.author),
            selectinload(Article.category),
            selectinload(Article.tags),
            selectinload(Article.ai_analysis),
        )
        count_query = select(func.count()).select_from(Article)

        # Filter by author
        if author_id:
            query = query.where(Article.author_id == author_id)
            count_query = count_query.where(Article.author_id == author_id)

        # Apply filters
        if search:
            search_filter = or_(
                Article.title.ilike(f"%{search}%"),
                Article.content.ilike(f"%{search}%"),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        if category_id:
            query = query.where(Article.category_id == category_id)
            count_query = count_query.where(Article.category_id == category_id)

        if status_filter:
            try:
                status_enum = ArticleStatus(status_filter)
                query = query.where(Article.status == status_enum)
                count_query = count_query.where(Article.status == status_enum)
            except ValueError:
                pass

        if tag:
            query = query.join(Article.tags).where(Tag.name == tag)
            count_query = count_query.join(Article.tags).where(Tag.name == tag)

        # Get total count
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.order_by(Article.created_at.desc()).offset(offset).limit(page_size)

        result = await self.session.execute(query)
        articles = result.scalars().unique().all()

        return articles, total

    async def update(
        self, article_id: uuid.UUID, tags: list[str] | None = None, **kwargs
    ) -> Article:
        """Update an article."""
        if kwargs:
            await self.session.execute(
                update(Article).where(Article.id == article_id).values(**kwargs)
            )

        if tags is not None:
            article = await self.get_by_id(article_id)
            article.tags.clear()
            for tag_name in tags:
                tag = await self._get_or_create_tag(tag_name)
                article.tags.append(tag)

        await self.session.flush()
        return await self.get_by_id(article_id)

    async def update_status(
        self, article_id: uuid.UUID, new_status: ArticleStatus
    ) -> None:
        """Update article status."""
        await self.session.execute(
            update(Article)
            .where(Article.id == article_id)
            .values(status=new_status)
        )
        await self.session.flush()

    async def delete(self, article_id: uuid.UUID) -> None:
        """Delete an article."""
        await self.session.execute(
            delete(Article).where(Article.id == article_id)
        )
        await self.session.flush()

    async def _get_or_create_tag(self, tag_name: str) -> Tag:
        """Get existing tag or create new one."""
        result = await self.session.execute(
            select(Tag).where(Tag.name == tag_name.lower().strip())
        )
        tag = result.scalar_one_or_none()
        if not tag:
            tag = Tag(name=tag_name.lower().strip())
            self.session.add(tag)
            await self.session.flush()
        return tag

    async def list_categories(self) -> Sequence[Category]:
        """List all categories."""
        result = await self.session.execute(
            select(Category).order_by(Category.name)
        )
        return result.scalars().all()

    async def list_tags(self) -> Sequence[Tag]:
        """List all tags."""
        result = await self.session.execute(select(Tag).order_by(Tag.name))
        return result.scalars().all()
