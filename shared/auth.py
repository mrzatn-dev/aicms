"""
JWT authentication utilities.
Token creation and verification using python-jose.
"""

import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from shared.config import settings
from shared.cookie_auth import get_token_from_request

# HTTP Bearer scheme (optional — cookie auth is preferred in browsers)
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(
    user_id: uuid.UUID,
    email: str,
    role: str,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token."""
    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """FastAPI dependency: extract and validate current user from JWT token."""
    auth_header = f"Bearer {credentials.credentials}" if credentials else None
    token = get_token_from_request(request, auth_header)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    return {
        "user_id": uuid.UUID(payload["sub"]),
        "email": payload["email"],
        "role": payload["role"],
    }


async def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict | None:
    """Return current user dict or None when unauthenticated."""
    auth_header = f"Bearer {credentials.credentials}" if credentials else None
    token = get_token_from_request(request, auth_header)
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except HTTPException:
        return None
    return {
        "user_id": uuid.UUID(payload["sub"]),
        "email": payload["email"],
        "role": payload["role"],
    }


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """FastAPI dependency: require admin role."""
    if current_user.get("internal"):
        return current_user
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_user_or_internal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """Allow authenticated users or trusted internal service callers."""
    from shared.service_auth import is_valid_internal_token

    if is_valid_internal_token(request):
        return {"internal": True, "role": "service", "user_id": None, "email": "service@internal"}

    return await get_current_user(request, credentials)
