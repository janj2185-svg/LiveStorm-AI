from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import ConfigDict, Field, computed_field, field_validator

from app.push_models import PushPlatform
from app.social_schemas import StrictSchema


class DevicePushTokenRegister(StrictSchema):
    platform: PushPlatform
    token: str = Field(min_length=16, max_length=4096)

    @field_validator("token")
    @classmethod
    def clean_token(cls, value: str) -> str:
        token = value.strip()
        if not token:
            raise ValueError("token is required")
        return token


class DevicePushTokenUnregister(DevicePushTokenRegister):
    pass


class DevicePushTokenResponse(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    platform: PushPlatform
    token: str
    created_at: datetime
    updated_at: datetime
    revoked_at: datetime | None = None

    @computed_field
    @property
    def revoked(self) -> bool:
        return self.revoked_at is not None
