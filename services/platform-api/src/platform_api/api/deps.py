from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from platform_api.core.exceptions import unauthorized
from platform_api.core.security import decode_access_token
from platform_api.domains.identity.models import User, UserStatus
from platform_api.domains.profile.models import Profile
from platform_api.domains.profile.schemas import ProfileUpdateRequest
from platform_api.infrastructure.database import get_db
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise unauthorized()
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(payload["sub"])
        session_id = UUID(payload["sid"])
    except (ValueError, KeyError):
        raise unauthorized("Invalid access token") from None

    result = await db.execute(
        select(User)
        .options(selectinload(User.profile))
        .where(User.id == user_id, User.status == UserStatus.ACTIVE)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise unauthorized("Invalid access token")

    # Session must still be active
    from platform_api.domains.identity.models import Session

    session = await db.get(Session, session_id)
    if session is None or session.revoked_at is not None:
        raise unauthorized("Session expired")

    return user


class ProfileService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def update_profile(self, user: User, payload: ProfileUpdateRequest) -> Profile:
        profile = user.profile
        if payload.display_name is not None:
            profile.display_name = payload.display_name.strip()
        if payload.bio is not None:
            profile.bio = payload.bio
        if payload.avatar_url is not None:
            profile.avatar_url = payload.avatar_url
        if payload.locale is not None:
            profile.locale = payload.locale
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
