#!/usr/bin/env python3
"""Apply Alembic migrations to the latest revision."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic.util.exc import CommandError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from shared.config import settings
from shared.database import asyncpg_connect_args

PROJECT_ROOT = Path(__file__).resolve().parent
UNKNOWN_REVISION = "0002_email_verification"


def _build_config() -> Config:
    alembic_cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(PROJECT_ROOT / "migrations"))
    return alembic_cfg


def _known_revisions(cfg: Config) -> set[str]:
    script = ScriptDirectory.from_config(cfg)
    return {revision.revision for revision in script.walk_revisions()}


def _create_engine():
    return create_async_engine(
        settings.database_url,
        connect_args=asyncpg_connect_args(),
    )


async def _table_exists(connection, table_name: str) -> bool:
    result = await connection.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = :table_name
            )
            """
        ),
        {"table_name": table_name},
    )
    return bool(result.scalar())


async def _database_revision() -> str | None:
    engine = _create_engine()
    try:
        async with engine.connect() as connection:
            if not await _table_exists(connection, "alembic_version"):
                return None
            result = await connection.execute(
                text("SELECT version_num FROM alembic_version LIMIT 1")
            )
            return result.scalar_one_or_none()
    finally:
        await engine.dispose()


async def _users_has_email_verification_columns() -> bool:
    engine = _create_engine()
    try:
        async with engine.connect() as connection:
            if not await _table_exists(connection, "users"):
                return False
            result = await connection.execute(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'users'
                          AND column_name = 'email_verified'
                    )
                    """
                )
            )
            return bool(result.scalar())
    finally:
        await engine.dispose()


async def _reset_database_revision(target_revision: str) -> None:
    engine = _create_engine()
    try:
        async with engine.begin() as connection:
            await connection.execute(
                text("UPDATE alembic_version SET version_num = :revision"),
                {"revision": target_revision},
            )
    finally:
        await engine.dispose()
    print(f"Reset alembic_version to {target_revision!r}.")


def _reconcile_unknown_revision(cfg: Config, db_revision: str, known: set[str]) -> None:
    if db_revision in known:
        return

    print(
        f"Database revision {db_revision!r} is missing from this build.",
        file=sys.stderr,
    )
    print(f"Known revisions: {sorted(known)}", file=sys.stderr)

    if db_revision == UNKNOWN_REVISION and UNKNOWN_REVISION not in known:
        if asyncio.run(_users_has_email_verification_columns()):
            print(
                "Email verification columns already exist. Deploy the latest image "
                f"that includes migrations/versions/{UNKNOWN_REVISION}.py.",
                file=sys.stderr,
            )
            sys.exit(1)

        if "0001_initial" in known:
            print(
                "Email verification columns are missing; resetting alembic_version "
                "to 0001_initial so migrations can run after deploy.",
                file=sys.stderr,
            )
            asyncio.run(_reset_database_revision("0001_initial"))
            return

    print(
        "Fix: deploy the latest commit (includes 0002 migration) or run "
        "'alembic stamp <revision>' against this database.",
        file=sys.stderr,
    )
    sys.exit(1)


def main() -> None:
    cfg = _build_config()
    known = _known_revisions(cfg)
    db_revision = asyncio.run(_database_revision())

    print(f"Known migration revisions: {sorted(known)}")
    if db_revision:
        print(f"Database revision: {db_revision}")
        _reconcile_unknown_revision(cfg, db_revision, known)

    try:
        command.upgrade(cfg, "head")
    except CommandError as exc:
        if UNKNOWN_REVISION in str(exc):
            print(str(exc), file=sys.stderr)
            print(
                "This usually means Render/production is running an old image. "
                "Push the latest main branch and redeploy.",
                file=sys.stderr,
            )
            sys.exit(1)
        raise

    print("Database migrations applied successfully.")


if __name__ == "__main__":
    main()
