from __future__ import annotations

from app.social_schemas import StrictSchema


class AchievementResponse(StrictSchema):
    code: str
    title: str
    description: str
    icon: str | None
    xp_reward: int
    unlocked: bool


class ProgressResponse(StrictSchema):
    xp: int
    level: int
    xp_to_next: int | None
    achievements: list[AchievementResponse]


class ActivityStatsResponse(StrictSchema):
    posts: int
    followers: int
    following: int
    gifts_sent: int
    gifts_received: int
    stories: int
