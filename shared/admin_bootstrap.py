"""One-time admin bootstrap (promote existing user or create new admin)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import hash_password
from shared.models.user import User, UserRole


async def bootstrap_admin_user(
    session: AsyncSession,
    *,
    email: str,
    username: str | None = None,
    password: str | None = None,
    full_name: str | None = None,
) -> dict[str, str]:
    """Promote an existing user to admin or create a new admin account."""
    normalized_email = email.strip().lower()
    result = await session.execute(select(User).where(User.email == normalized_email))
    existing = result.scalar_one_or_none()

    if existing:
        changed = False
        if existing.role != UserRole.ADMIN:
            existing.role = UserRole.ADMIN
            changed = True
        if not existing.email_verified:
            existing.email_verified = True
            existing.verification_token = None
            existing.verification_token_expires = None
            changed = True
        if not existing.is_active:
            existing.is_active = True
            changed = True

        if changed:
            await session.commit()
            action = "promoted"
        else:
            action = "already_admin"

        return {
            "action": action,
            "email": existing.email,
            "username": existing.username,
            "role": existing.role.value,
            "message": "Пользователь назначен администратором. Перелогиньтесь.",
        }

    if not password or len(password) < 6:
        raise ValueError(
            "Пользователь не найден. Укажите password (мин. 6 символов) для создания нового админа, "
            "или сначала войдите через Google с этим email."
        )

    admin_username = (username or normalized_email.split("@")[0]).strip()
    admin = User(
        email=normalized_email,
        username=admin_username,
        hashed_password=hash_password(password),
        full_name=full_name or "System Administrator",
        role=UserRole.ADMIN,
        is_active=True,
        email_verified=True,
    )
    session.add(admin)
    await session.commit()

    return {
        "action": "created",
        "email": normalized_email,
        "username": admin_username,
        "role": UserRole.ADMIN.value,
        "message": "Администратор создан. Войдите по email и паролю.",
    }
