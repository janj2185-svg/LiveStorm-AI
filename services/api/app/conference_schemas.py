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
    whep_available: bool = False
    role: Literal["host", "participant"] = "participant"
    ingest_path: str
    whip_url: str | None
    whep_url: str | None = None
    playback_url: str | None
    bearer_token: str | None
    subscribe_bearer_token: str | None = None
    token_expires_at: datetime | None
    token_expires_in_seconds: int
    ice_servers: list[ConferenceIceServerResponse] = Field(default_factory=list)
    media_layout: Literal["contribution_gallery"] = "contribution_gallery"
    media_layout_note: str = (
        "Each participant publishes an isolated WHIP contribution. Peers subscribe via WHEP "
        "to build a gallery. This is not an SFU composite program feed."
    )


class ConferenceJoinByCodeRequest(StrictSchema):
    join_code: str = Field(min_length=4, max_length=24)

    @field_validator("join_code")
    @classmethod
    def normalize_join_code(cls, value: str) -> str:
        code = value.strip().upper().replace(" ", "")
        if not code:
            raise ValueError("join code is required")
        return code


class ConferenceParticipantResponse(StrictSchema):
    user_id: uuid.UUID
    role: Literal["host", "participant"]
    contribution_ingest_path: str | None
    contribution_provisioned: bool = False
    playback_url: str | None = None
    whep_url: str | None = None
    subscribe_bearer_token: str | None = None
    token_expires_at: datetime | None = None
    is_self: bool = False
    joined_at: datetime | None = None


class ConferenceAuraAskRequest(StrictSchema):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: uuid.UUID | None = None

    _message = field_validator("message")(safe_text)


class ConferenceAuraAskResponse(StrictSchema):
    conversation_id: uuid.UUID
    message: AIMessageResponse
