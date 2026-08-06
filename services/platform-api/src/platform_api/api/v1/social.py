from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from platform_api.api.deps import get_current_user
from platform_api.domains.identity.models import User
from platform_api.domains.notifications.schemas import NotificationListResponse, NotificationPublic
from platform_api.domains.notifications.service import NotificationService
from platform_api.domains.social_graph.service import SocialGraphService
from platform_api.infrastructure.database import get_db

router = APIRouter(tags=["social"])


@router.post("/users/{handle}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def follow_user(
    handle: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await SocialGraphService(db).follow(user.id, handle)


@router.delete("/users/{handle}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    handle: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await SocialGraphService(db).unfollow(user.id, handle)


@router.post("/users/{handle}/block", status_code=status.HTTP_204_NO_CONTENT)
async def block_user(
    handle: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await SocialGraphService(db).block(user.id, handle)


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    items, unread = await NotificationService(db).list_for_user(user.id)
    return NotificationListResponse(
        items=[NotificationPublic(**item) for item in items],
        unread_count=unread,
    )


@router.post("/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_read(
    notification_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await NotificationService(db).mark_read(user.id, notification_id)
