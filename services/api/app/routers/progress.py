from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.gift_models import GiftSend, GiftSendStatus
from app.progress_models import AchievementDefinition
from app.progress_schemas import AchievementResponse, ActivityStatsResponse, ProgressResponse
from app.progress_service import ensure_progress, xp_to_next_level
from app.social_models import Follow, Post, PostLifecycle
from app.story_models import Story

router = APIRouter(prefix="/me", tags=["Progress"])


@router.get("/progress", response_model=ProgressResponse)
async def get_my_progress(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ProgressResponse:
    progress = await ensure_progress(db, auth.user.id)
    await db.commit()
    definitions = (
        await db.scalars(select(AchievementDefinition).order_by(AchievementDefinition.code))
    ).all()
    unlocked = set(progress.achievements)
    achievements = [
        AchievementResponse(
            code=definition.code,
            title=definition.title,
            description=definition.description,
            icon=definition.icon,
            xp_reward=definition.xp_reward,
            unlocked=definition.code in unlocked,
        )
        for definition in definitions
    ]
    return ProgressResponse(
        xp=progress.xp,
        level=progress.level,
        xp_to_next=xp_to_next_level(progress.xp, progress.level),
        achievements=achievements,
    )


@router.get("/activity-stats", response_model=ActivityStatsResponse)
async def get_my_activity_stats(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ActivityStatsResponse:
    user_id = auth.user.id
    posts = await db.scalar(
        select(func.count())
        .select_from(Post)
        .where(
            Post.author_id == user_id,
            Post.lifecycle == PostLifecycle.published,
            Post.deleted_at.is_(None),
        )
    )
    followers = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.followed_id == user_id)
    )
    following = await db.scalar(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    )
    gifts_sent = await db.scalar(
        select(func.count())
        .select_from(GiftSend)
        .where(GiftSend.sender_user_id == user_id, GiftSend.status != GiftSendStatus.failed)
    )
    gifts_received = await db.scalar(
        select(func.count())
        .select_from(GiftSend)
        .where(
            GiftSend.recipient_user_id == user_id,
            GiftSend.status.in_([GiftSendStatus.delivered, GiftSendStatus.queued]),
        )
    )
    stories = await db.scalar(
        select(func.count())
        .select_from(Story)
        .where(Story.author_user_id == user_id, Story.deleted_at.is_(None))
    )
    return ActivityStatsResponse(
        posts=int(posts or 0),
        followers=int(followers or 0),
        following=int(following or 0),
        gifts_sent=int(gifts_sent or 0),
        gifts_received=int(gifts_received or 0),
        stories=int(stories or 0),
    )
