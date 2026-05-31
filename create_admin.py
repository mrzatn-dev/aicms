"""
Create or promote an admin user for the CMS admin panel.

Local:
  python create_admin.py

With Render External Database URL (no Shell):
  DATABASE_URL='postgresql://...?sslmode=require' ADMIN_EMAIL=you@gmail.com python create_admin.py

Production HTTP (after deploy, no Shell):
  curl -X POST "https://aicms-frontend.onrender.com/api/auth/bootstrap-admin" \\
    -H "Content-Type: application/json" \\
    -H "X-Admin-Bootstrap-Secret: YOUR_SECRET_FROM_RENDER" \\
    -d '{"email":"you@gmail.com"}'
"""

from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

from shared.admin_bootstrap import bootstrap_admin_user
from shared.database import async_session_factory

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@cms.local").strip().lower()
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
ADMIN_FULL_NAME = os.environ.get("ADMIN_FULL_NAME", "System Administrator").strip()


async def create_admin() -> None:
    if os.environ.get("SKIP_MIGRATIONS", "").lower() not in {"1", "true", "yes"}:
        script = Path(__file__).resolve().parent / "apply_db.py"
        print("Применяем миграции БД...")
        subprocess.run([sys.executable, str(script)], check=True)

    from shared.config import settings
    from urllib.parse import urlparse

    db_host = urlparse(settings.database_url_sync).hostname
    print(f"Подключение к БД: {db_host}")

    async with async_session_factory() as session:
        try:
            result = await bootstrap_admin_user(
                session,
                email=ADMIN_EMAIL,
                username=ADMIN_USERNAME,
                password=ADMIN_PASSWORD,
                full_name=ADMIN_FULL_NAME,
            )
            print(f"✅ {result['message']}")
            print(f"   Email:    {result['email']}")
            print(f"   Username: {result['username']}")
            print(f"   Role:     {result['role']}")
            if result["action"] == "created":
                print(f"   Password: {ADMIN_PASSWORD}")
        except Exception as exc:
            await session.rollback()
            print(f"❌ Ошибка: {exc}")
            raise


if __name__ == "__main__":
    asyncio.run(create_admin())
