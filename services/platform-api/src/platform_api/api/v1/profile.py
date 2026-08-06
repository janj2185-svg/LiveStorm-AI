from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import ProfileService, get_current_user
from platform_api.domains.identity.models import User
from platform_api.domains.identity.schemas import UserPublic
from platform_api.domains.profile.schemas import ProfilePublic, ProfileUpdateRequest
from platform_api.infrastructure.database import get_db

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=UserPublic)
async def get_me(user: User = Depends(get_current_user)) -> UserPublic:
    profile = user.profile
    return UserPublic(
        id=user.id,
        email=user.email,
        email_verified=user.email_verified_at is not None,
        handle=profile.handle,
        display_name=profile.display_name,
        locale=profile.locale,
        created_at=user.created_at,
    )


@router.patch("/me", response_model=ProfilePublic)
async def update_me(
    payload: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfilePublic:
    service = ProfileService(db)
    profile = await service.update_profile(user, payload)
    return ProfilePublic.model_validate(profile)
