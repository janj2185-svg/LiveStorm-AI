from __future__ import annotations

import uuid
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.errors import APIError
from app.models import (
    AccessSession,
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
    UserStatus,
)
from app.security import decode_jwt, utcnow

bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    session: AccessSession


def aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.session_factory() as session:
        yield session


async def current_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise APIError(
            401,
            "authentication_required",
            "Authentication required",
            "Provide a valid bearer access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_jwt(credentials.credentials, settings, "access")
    try:
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (ValueError, KeyError, TypeError) as exc:
        raise APIError(
            401,
            "invalid_token",
            "Invalid authentication token",
            "Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await db.scalar(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    access_session = await db.get(AccessSession, session_id)
    if (
        user is None
        or access_session is None
        or access_session.user_id != user_id
        or access_session.revoked_at is not None
        or aware(access_session.expires_at) <= utcnow()
        or user.status != UserStatus.active
        or user.token_version != payload.get("ver")
    ):
        raise APIError(
            401,
            "invalid_token",
            "Invalid authentication token",
            "Authentication is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthContext(user=user, session=access_session)


async def current_user(auth: AuthContext = Depends(current_auth)) -> User:
    return auth.user


async def has_permission(db: AsyncSession, user_id: uuid.UUID, permission_name: str) -> bool:
    statement = (
        select(Permission.id)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user_id, Permission.name == permission_name)
        .limit(1)
    )
    return await db.scalar(statement) is not None


def require_permission(
    permission_name: str,
) -> Callable[..., object]:
    async def permission_dependency(
        auth: AuthContext = Depends(current_auth),
        db: AsyncSession = Depends(get_session),
    ) -> AuthContext:
        if not await has_permission(db, auth.user.id, permission_name):
            raise APIError(
                403,
                "permission_denied",
                "Permission denied",
                "You do not have permission to perform this action.",
            )
        return auth

    return permission_dependency
