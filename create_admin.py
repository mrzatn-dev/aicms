"""
Script to create an admin user for the CMS admin panel.
Run: python create_admin.py
"""

import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(__file__))

from shared.database import async_session_factory, init_db
from shared.auth import hash_password
from shared.models.user import User, UserRole


async def create_admin():
    """Create an admin user in the database."""
    # Admin credentials
    ADMIN_EMAIL = "admin@cms.local"
    ADMIN_USERNAME = "admin"
    ADMIN_PASSWORD = "admin123"
    ADMIN_FULL_NAME = "System Administrator"

    await init_db()

    async with async_session_factory() as session:
        try:
            # Check if admin already exists
            from sqlalchemy import select

            result = await session.execute(
                select(User).where(User.email == ADMIN_EMAIL)
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"⚠️  Admin user already exists: {existing.email} (role: {existing.role.value})")
                if existing.role != UserRole.ADMIN:
                    existing.role = UserRole.ADMIN
                    await session.commit()
                    print("✅ Updated existing user role to ADMIN")
                return

            # Create admin user
            admin = User(
                email=ADMIN_EMAIL,
                username=ADMIN_USERNAME,
                hashed_password=hash_password(ADMIN_PASSWORD),
                full_name=ADMIN_FULL_NAME,
                role=UserRole.ADMIN,
                is_active=True,
            )
            session.add(admin)
            await session.commit()

            print("✅ Admin user created successfully!")
            print(f"   Email:    {ADMIN_EMAIL}")
            print(f"   Username: {ADMIN_USERNAME}")
            print(f"   Password: {ADMIN_PASSWORD}")
            print(f"   Role:     admin")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error creating admin: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(create_admin())
