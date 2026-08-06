from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class AchievementResponse(ORMSchema):
    id: uuid.UUID
    code: str
    name: str
    description: str
    xp_reward: int


class UnlockedAchievementResponse(AchievementResponse):
    unlocked_at: datetime


class ProgressionResponse(StrictSchema):
    level: int
    xp: int
    xp_to_next: int
    achievements: list[UnlockedAchievementResponse]
