from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.gift_models import GiftUserEligibility
from app.progress_models import AchievementDefinition, UserProgress

logger = logging.getLogger("sylora.progress")

MAX_LEVEL = 100
XP_PER_LEVEL = 500

# (code, title, description, xp_reward, icon)
DEFAULT_ACHIEVEMENTS: tuple[tuple[str, str, str, int, str | None], ...] = (
    ("welcome", "Welcome to SYLORA", "Joined the SYLORA community.", 25, "sparkles"),
    ("first_post", "First Post", "Published your first post.", 50, "megaphone"),
    ("first_follow", "First Follow", "Followed your first creator.", 25, "heart"),
    ("first_story", "First Story", "Shared your first story.", 50, "camera"),
    ("first_gift_send", "First Gift", "Sent your first gift.", 75, "gift"),
)


def level_for_xp(xp: int) -> int:
    """Level 1 + xp // 500, capped at MAX_LEVEL."""
    return min(MAX_LEVEL, 1 + max(0, xp) // XP_PER_LEVEL)


def xp_to_next_level(xp: int, level: int) -> int | None:
    if level >= MAX_LEVEL:
        return None
    next_level_threshold = level * XP_PER_LEVEL
    return max(0, next_level_threshold - xp)


async def seed_default_achievements(db: AsyncSession) -> None:
    existing = set((await db.scalars(select(AchievementDefinition.code))).all())
    for code, title, description, xp_reward, icon in DEFAULT_ACHIEVEMENTS:
        if code in existing:
            continue
        db.add(
            AchievementDefinition(
                code=code,
                title=title,
                description=description,
                xp_reward=xp_reward,
                icon=icon,
            )
        )
    await db.commit()


async def ensure_progress(db: AsyncSession, user_id: uuid.UUID) -> UserProgress:
    progress = await db.get(UserProgress, user_id)
    if progress is None:
        progress = UserProgress(user_id=user_id, xp=0, level=1, achievements=[])
        db.add(progress)
        await db.flush()
    return progress


async def _sync_gift_eligibility(db: AsyncSession, progress: UserProgress) -> None:
    """Mirror level and merged achievements onto GiftUserEligibility for gift gating."""
    eligibility = await db.get(GiftUserEligibility, progress.user_id)
    if eligibility is None:
        eligibility = GiftUserEligibility(
            user_id=progress.user_id, level=progress.level, achievements=[]
        )
        db.add(eligibility)
        await db.flush()
    merged = list(dict.fromkeys([*eligibility.achievements, *progress.achievements]))
    eligibility.level = progress.level
    eligibility.achievements = merged
    progress.achievements = merged


async def award_xp(
    db: AsyncSession,
    user_id: uuid.UUID,
    amount: int,
    reason: str,
    *,
    achievement_code: str | None = None,
) -> UserProgress:
    """Grant XP (and optionally unlock an achievement) then sync gift eligibility."""
    progress = await ensure_progress(db, user_id)
    total_xp = amount
    if achievement_code is not None and achievement_code not in progress.achievements:
        progress.achievements = [*progress.achievements, achievement_code]
        definition = await db.get(AchievementDefinition, achievement_code)
        if definition is not None:
            total_xp += definition.xp_reward
    progress.xp = max(0, progress.xp + total_xp)
    progress.level = level_for_xp(progress.xp)
    await _sync_gift_eligibility(db, progress)
    await db.flush()
    logger.info(
        "progress.xp_awarded",
        extra={
            "user_id": str(user_id),
            "amount": total_xp,
            "reason": reason,
            "achievement_code": achievement_code,
            "level": progress.level,
        },
    )
    return progress
