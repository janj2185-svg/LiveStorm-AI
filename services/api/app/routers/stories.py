from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import and_, exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import AuthContext, current_auth, get_session, get_settings
from app.errors import APIError
from app.models import Profile
from app.progress_service import award_xp
from app.rate_limit import rate_limit
from app.security import utcnow
from app.social_models import Follow, Friendship, RelationStatus
from app.social_service import not_blocked_condition, require_handle
from app.story_models import Story, StoryItem, StoryView
from app.story_schemas import (
    StoryAuthorResponse,
    StoryCreate,
    StoryFeedResponse,
    StoryItemResponse,
    StoryResponse,
    StoryViewResponse,
)

router = APIRouter(tags=["Stories"])


def story_visible_condition(viewer_id: uuid.UUID) -> Any:
    is_self = Story.author_user_id == viewer_id
    is_followed = exists(
        select(Follow.id).where(
            Follow.follower_id == viewer_id,
            Follow.followed_id == Story.author_user_id,
        )
    )
    is_friend = exists(
        select(Friendship.id).where(
            Friendship.status == RelationStatus.accepted,
            or_(
                and_(
                    Friendship.user_low_id == viewer_id,
                    Friendship.user_high_id == Story.author_user_id,
                ),
                and_(
                    Friendship.user_high_id == viewer_id,
                    Friendship.user_low_id == Story.author_user_id,
                ),
            ),
        )
    )
    return and_(
        Story.deleted_at.is_(None),
        Story.expires_at > utcnow(),
        not_blocked_condition(viewer_id, Story.author_user_id),
        or_(is_self, is_followed, is_friend),
    )


async def story_author_response(db: AsyncSession, author_id: uuid.UUID) -> StoryAuthorResponse:
    profile = await db.get(Profile, author_id)
    if profile is None or profile.handle is None:
        return StoryAuthorResponse(
            user_id=author_id,
            handle="deleted",
            display_name="Deleted user",
            avatar_url=None,
        )
    return StoryAuthorResponse(
        user_id=author_id,
        handle=profile.handle,
        display_name=profile.display_name,
        avatar_url=profile.avatar_url,
    )


async def story_response(db: AsyncSession, viewer_id: uuid.UUID, story: Story) -> StoryResponse:
    items = (
        await db.scalars(
            select(StoryItem)
            .where(StoryItem.story_id == story.id)
            .order_by(StoryItem.sort_order.asc())
        )
    ).all()
    viewed = (
        await db.get(StoryView, {"story_id": story.id, "viewer_user_id": viewer_id})
    ) is not None
    return StoryResponse(
        id=story.id,
        author=await story_author_response(db, story.author_user_id),
        visibility=story.visibility,
        created_at=story.created_at,
        expires_at=story.expires_at,
        reply_count=story.reply_count,
        viewed=viewed,
        items=[StoryItemResponse.model_validate(item) for item in items],
    )


async def visible_story(db: AsyncSession, viewer_id: uuid.UUID, story_id: uuid.UUID) -> Story:
    story = await db.scalar(
        select(Story).where(Story.id == story_id, story_visible_condition(viewer_id))
    )
    if story is None:
        raise APIError(
            404,
            "story_not_found",
            "Story not found",
            "The requested story does not exist or has expired.",
        )
    return story


@router.get("/stories/feed", response_model=StoryFeedResponse)
async def get_story_feed(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> StoryFeedResponse:
    await require_handle(db, auth.user.id)
    stories = (
        await db.scalars(
            select(Story)
            .where(story_visible_condition(auth.user.id))
            .order_by(Story.created_at.desc(), Story.id.desc())
        )
    ).all()
    return StoryFeedResponse(
        items=[await story_response(db, auth.user.id, story) for story in stories]
    )


@router.post("/stories", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
async def create_story(
    payload: StoryCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> StoryResponse:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="stories",
        subject=str(auth.user.id),
        limit=settings.story_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    story = Story(author_user_id=auth.user.id, visibility=payload.visibility)
    db.add(story)
    await db.flush()
    for position, item in enumerate(payload.items):
        db.add(
            StoryItem(
                story_id=story.id,
                media_kind=item.media_kind,
                media_url=item.media_url,
                body=item.body,
                duration_ms=item.duration_ms,
                sort_order=position,
            )
        )
    await award_xp(db, auth.user.id, 20, "story_created", achievement_code="first_story")
    await db.commit()
    await db.refresh(story)
    return await story_response(db, auth.user.id, story)


@router.get("/stories/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> StoryResponse:
    story = await visible_story(db, auth.user.id, story_id)
    return await story_response(db, auth.user.id, story)


@router.post("/stories/{story_id}/view", response_model=StoryViewResponse)
async def view_story(
    story_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> StoryViewResponse:
    story = await visible_story(db, auth.user.id, story_id)
    existing = await db.get(StoryView, {"story_id": story.id, "viewer_user_id": auth.user.id})
    if existing is None:
        db.add(StoryView(story_id=story.id, viewer_user_id=auth.user.id))
        await db.commit()
    return StoryViewResponse(story_id=story.id)
