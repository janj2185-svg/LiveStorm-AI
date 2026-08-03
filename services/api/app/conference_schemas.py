from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.ai_schemas import AIMessageResponse
from app.conference_models import ConferencePurpose, ConferenceStatus
from app.social_schemas import validate_plain_text


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


def safe_text(value: str) -> str:
    return validate_plain_text(value.strip())


class ConferenceCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    purpose: ConferencePurpose = ConferencePurpose.business

    _title = field_validator("title")(safe_text)


class ConferenceResponse(ORMStrictSchema):
    id: uuid.UUID
    host_id: uuid.UUID
    title: str
    purpose: ConferencePurpose
    status: ConferenceStatus
    join_code: str
    created_at: datetime
    active_participant_count: int = 0
    is_host: bool = False
    joined: bool = False


class ConferenceJoinResponse(StrictSchema):
    conference: ConferenceResponse
    joined: bool


class ConferenceIceServerResponse(StrictSchema):
    urls: list[str] = Field(min_length=1, max_length=16)
    username: str | None = None
    credential: str | None = None


class ConferenceMediaCredentialsResponse(StrictSchema):
    conference_id: uuid.UUID
    status: Literal["available", "awaiting_media_plane"]
    reason: str | None
    whip_available: bool
    playback_available: bool
    ingest_path: str
    whip_url: str | None
    playback_url: str | None
    bearer_token: str | None
    token_expires_at: datetime | None
    token_expires_in_seconds: int
    ice_servers: list[ConferenceIceServerResponse] = Field(default_factory=list)


class ConferenceAuraAskRequest(StrictSchema):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: uuid.UUID | None = None

    _message = field_validator("message")(safe_text)


class ConferenceAuraAskResponse(StrictSchema):
    conversation_id: uuid.UUID
    message: AIMessageResponse
