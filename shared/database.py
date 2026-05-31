"""
Async SQLAlchemy database engine and session factory.
"""

import ssl

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from shared.config import settings


def asyncpg_connect_args() -> dict:
    """Enable TLS for Render/managed Postgres external connections."""
    raw = (settings.DATABASE_URL or "").lower()
    if "sslmode=require" in raw or "dpg-" in raw or ".render.com" in raw:
        return {"ssl": ssl.create_default_context()}
    return {}


engine = create_async_engine(
    settings.database_url,
    echo=settings.DEBUG,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=asyncpg_connect_args(),
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_session() -> AsyncSession:
    """Dependency for FastAPI: yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Deprecated: use `python apply_db.py` (Alembic migrations) instead."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
