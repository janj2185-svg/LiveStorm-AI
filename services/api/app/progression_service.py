from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.progression_models import Achievement, UserAchievement, UserProgression, XPAward
from app.progression_schemas import ProgressionResponse, UnlockedAchievementResponse

ACHIEVEMENT_CATALOG = (
    (
        "first_post",
        "First Post",
        "Publish your first post on SYLORA.",
        25,
    ),
    (
        "first_follow",
        "First Follow",
        "Follow another SYLORA member.",
        15,
    ),
    (
        "first_gift_sent",
        "First Gift Sent",
        "Send your first gift.",
        30,
    ),
    (
        "first_live",
        "First Live",
        "Start your first live session.",
        50,
    ),
    (
        "aura_chat",
        "Aura Chat",
        "Complete your first Aura assistant conversation.",
        20,
    ),
)


def xp_threshold_for_level(level: int) -> int:
    """Return cumulative XP required to reach a one-indexed level."""
    return 50 * level * (level - 1)


def level_for_xp(xp: int) -> int:
    level = 1
    while xp >= xp_threshold_for_level(level + 1):
        level += 1
    return level


async def seed_achievements(session: AsyncSession) -> None:
    for code, name, description, xp_reward in ACHIEVEMENT_CATALOG:
        achievement = await session.scalar(select(Achievement).where(Achievement.code == code))
        if achievement is None:
            session.add(
                Achievement(
                    code=code,
                    name=name,
                    description=description,
                    xp_reward=xp_reward,
                )
            )
        else:
            achievement.name = name
            achievement.description = description
            achievement.xp_reward = xp_reward
    await session.commit()


async def get_or_create_progression(
    session: AsyncSession, user_id: uuid.UUID
) -> UserProgression:
    progression = await session.get(UserProgression, user_id)
    if progression is None:
        progression = UserProgression(user_id=user_id, level=1, xp=0)
        session.add(progression)
        await session.flush()
    return progression


async def award_xp(
    session: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    reason: str,
) -> UserProgression:
    """Award persisted XP within the caller's transaction."""
    if amount <= 0:
        raise ValueError("XP award amount must be positive")
    normalized_reason = reason.strip()
    if not normalized_reason or len(normalized_reason) > 160:
        raise ValueError("XP award reason must contain 1-160 characters")
    progression = await session.scalar(
        select(UserProgression)
        .where(UserProgression.user_id == user_id)
        .with_for_update()
    )
    if progression is None:
        progression = UserProgression(user_id=user_id, level=1, xp=0)
        session.add(progression)
        await session.flush()
    progression.xp += amount
    progression.level = level_for_xp(progression.xp)
    session.add(
        XPAward(
            user_id=user_id,
            amount=amount,
            reason=normalized_reason,
        )
    )
    await session.flush()
    return progression


async def progression_response(
    session: AsyncSession, user_id: uuid.UUID
) -> ProgressionResponse:
    progression = await get_or_create_progression(session, user_id)
    rows = (
        await session.execute(
            select(UserAchievement, Achievement)
            .join(Achievement, Achievement.id == UserAchievement.achievement_id)
            .where(UserAchievement.user_id == user_id)
            .order_by(UserAchievement.unlocked_at.desc(), UserAchievement.id.desc())
        )
    ).all()
    return ProgressionResponse(
        level=progression.level,
        xp=progression.xp,
        xp_to_next=xp_threshold_for_level(progression.level + 1) - progression.xp,
        achievements=[
            UnlockedAchievementResponse(
                id=achievement.id,
                code=achievement.code,
                name=achievement.name,
                description=achievement.description,
                xp_reward=achievement.xp_reward,
                unlocked_at=unlocked.unlocked_at,
            )
            for unlocked, achievement in rows
        ],
    )
