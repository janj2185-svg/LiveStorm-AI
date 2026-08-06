import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from platform_api.config import get_settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def create_access_token(*, user_id: UUID, session_id: UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=settings.jwt_access_ttl_seconds),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("invalid token") from exc
    if payload.get("type") != "access":
        raise ValueError("invalid token type")
    return payload
