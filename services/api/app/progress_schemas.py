from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class AchievementItem(ORMStrictSchema):
    code: str
    name: str
    description: str
    xp_reward: int
    earned_at: datetime | None = None


class ProgressResponse(StrictSchema):
    xp: int
    level: int
    xp_to_next: int
    achievements_earned: list[AchievementItem]
    achievements_available: list[AchievementItem]
