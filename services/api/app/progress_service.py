from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gift_models import GiftUserEligibility
from app.progress_models import AchievementDefinition, UserAchievement, UserProgress
from app.progress_schemas import AchievementItem, ProgressResponse
from app.security import utcnow

XP_PER_LEVEL = 100

DEFAULT_ACHIEVEMENTS: tuple[dict[str, str | int], ...] = (
    {
        "code": "first_post",
        "name": "First Light",
        "description": "Publish your first post on SYLORA.",
        "xp_reward": 50,
    },
    {
        "code": "first_friend",
        "name": "Kindred Spark",
        "description": "Accept or form your first friendship.",
        "xp_reward": 50,
    },
    {
        "code": "first_gift_sent",
        "name": "Gift of Presence",
        "description": "Send your first gift.",
        "xp_reward": 75,
    },
    {
        "code": "first_story",
        "name": "Moment Keeper",
        "description": "Share your first story.",
        "xp_reward": 40,
    },
    {
        "code": "level_5",
        "name": "Rising Aura",
        "description": "Reach level 5.",
        "xp_reward": 100,
    },
    {
        "code": "level_10",
        "name": "Steady Glow",
        "description": "Reach level 10.",
        "xp_reward": 200,
    },
)


def level_from_xp(xp: int) -> int:
    return 1 + max(0, xp) // XP_PER_LEVEL


def xp_to_next_level(xp: int) -> int:
    return XP_PER_LEVEL - (max(0, xp) % XP_PER_LEVEL)


async def seed_achievements(db: AsyncSession) -> None:
    for spec in DEFAULT_ACHIEVEMENTS:
        existing = await db.get(AchievementDefinition, spec["code"])
        if existing is None:
            db.add(
                AchievementDefinition(
                    code=str(spec["code"]),
                    name=str(spec["name"]),
                    description=str(spec["description"]),
                    xp_reward=int(spec["xp_reward"]),
                )
            )
        else:
            existing.name = str(spec["name"])
            existing.description = str(spec["description"])
            existing.xp_reward = int(spec["xp_reward"])
    await db.commit()


async def ensure_progress(db: AsyncSession, user_id: uuid.UUID) -> UserProgress:
    progress = await db.get(UserProgress, user_id)
    if progress is None:
        progress = UserProgress(user_id=user_id, xp=0, level=1)
        db.add(progress)
        await db.flush()
    return progress


async def sync_gift_eligibility_level(
    db: AsyncSession, user_id: uuid.UUID, level: int
) -> None:
    eligibility = await db.get(GiftUserEligibility, user_id)
    if eligibility is None:
        eligibility = GiftUserEligibility(user_id=user_id, level=level)
        db.add(eligibility)
    else:
        eligibility.level = level
        eligibility.updated_at = utcnow()


async def grant_achievement(
    db: AsyncSession, user_id: uuid.UUID, code: str
) -> UserAchievement | None:
    definition = await db.get(AchievementDefinition, code)
    if definition is None:
        return None
    existing = await db.scalar(
        select(UserAchievement).where(
            UserAchievement.user_id == user_id,
            UserAchievement.achievement_code == code,
        )
    )
    if existing is not None:
        return None
    record = UserAchievement(
        user_id=user_id,
        achievement_code=code,
        earned_at=utcnow(),
    )
    db.add(record)
    await db.flush()
    if definition.xp_reward > 0:
        await award_xp(db, user_id, definition.xp_reward, reason=f"achievement:{code}")
    return record


async def award_xp(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    reason: str,
) -> UserProgress:
    """Award XP and keep level + gift eligibility in sync.

    ``reason`` is retained for call-site clarity and future audit wiring.
    """
    _ = reason
    if amount <= 0:
        return await ensure_progress(db, user_id)
    progress = await ensure_progress(db, user_id)
    previous_level = progress.level
    progress.xp = max(0, progress.xp) + amount
    new_level = level_from_xp(progress.xp)
    if new_level != progress.level:
        progress.level = new_level
        await sync_gift_eligibility_level(db, user_id, new_level)
    progress.updated_at = utcnow()
    await db.flush()
    if new_level >= 5 and previous_level < 5:
        await grant_achievement(db, user_id, "level_5")
    if new_level >= 10 and previous_level < 10:
        await grant_achievement(db, user_id, "level_10")
    return progress


async def get_progress_response(db: AsyncSession, user_id: uuid.UUID) -> ProgressResponse:
    progress = await ensure_progress(db, user_id)
    definitions = (
        await db.scalars(select(AchievementDefinition).order_by(AchievementDefinition.code))
    ).all()
    earned_rows = (
        await db.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user_id)
        )
    ).all()
    earned_by_code = {row.achievement_code: row for row in earned_rows}
    earned: list[AchievementItem] = []
    available: list[AchievementItem] = []
    for definition in definitions:
        item = AchievementItem(
            code=definition.code,
            name=definition.name,
            description=definition.description,
            xp_reward=definition.xp_reward,
            earned_at=earned_by_code[definition.code].earned_at
            if definition.code in earned_by_code
            else None,
        )
        if definition.code in earned_by_code:
            earned.append(item)
        else:
            available.append(item)
    return ProgressResponse(
        xp=progress.xp,
        level=progress.level,
        xp_to_next=xp_to_next_level(progress.xp),
        achievements_earned=earned,
        achievements_available=available,
    )
