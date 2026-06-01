"""FastAPI dependency for AI quota enforcement."""

import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_current_user, security
from shared.database import get_session
from shared.subscription_quota import enforce_ai_quota


async def require_ai_quota(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    try:
        user_id = uuid.UUID(str(current_user["user_id"]))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        ) from exc

    await enforce_ai_quota(
        session,
        user_id,
        role=current_user.get("role"),
    )
    return current_user


async def require_ai_quota_or_internal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> dict:
    from shared.service_auth import is_valid_internal_token

    if is_valid_internal_token(request):
        return {"internal": True, "role": "service", "user_id": None, "email": "service@internal"}

    current_user = await get_current_user(request, credentials)
    try:
        user_id = uuid.UUID(str(current_user["user_id"]))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user",
        ) from exc

    await enforce_ai_quota(
        session,
        user_id,
        role=current_user.get("role"),
    )
    return current_user
