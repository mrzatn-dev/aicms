#!/usr/bin/env python3
"""Seed default categories after Alembic migrations (replaces init.sql data)."""

from __future__ import annotations

import asyncio

from sqlalchemy import select, func

from shared.database import async_session_factory
from shared.models.category import Category

DEFAULT_CATEGORIES = [
    ("Programming", "Programming languages, frameworks, and software development"),
    ("Data Science", "Machine learning, data analysis, and statistics"),
    ("DevOps", "Infrastructure, CI/CD, and deployment"),
    ("Security", "Cybersecurity, encryption, and vulnerability management"),
    ("Technology", "General technology news and innovations"),
    ("Education", "Learning resources, tutorials, and courses"),
    ("Business", "Business strategy, management, and startups"),
    ("General", "General articles and miscellaneous topics"),
]


async def seed_categories() -> int:
    created = 0
    async with async_session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(Category))
        if count and count > 0:
            return 0

        for name, description in DEFAULT_CATEGORIES:
            session.add(Category(name=name, description=description))
            created += 1

        await session.commit()
    return created


async def main() -> None:
    created = await seed_categories()
    if created:
        print(f"Seeded {created} default categories.")
    else:
        print("Categories already present; nothing to seed.")


if __name__ == "__main__":
    asyncio.run(main())
