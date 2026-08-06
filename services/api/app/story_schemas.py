from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import Field, field_validator, model_validator

from app.social_schemas import (
    ORMStrictSchema,
    StrictSchema,
    validate_plain_text,
    validate_reference,
)
from app.story_models import StoryItemKind, StoryVisibility


class StoryItemCreate(StrictSchema):
    media_kind: StoryItemKind
    media_url: str | None = Field(default=None, max_length=2048)
    body: str | None = Field(default=None, max_length=2000)
    duration_ms: int = Field(default=5000, ge=500, le=60_000)

    _safe_url = field_validator("media_url")(
        lambda value: validate_reference(value) if value else value
    )
    _plain_body = field_validator("body")(
        lambda value: validate_plain_text(value) if value else value
    )

    @model_validator(mode="after")
    def media_matches_kind(self) -> StoryItemCreate:
        if self.media_kind == StoryItemKind.text:
            if not self.body:
                raise ValueError("text story items require a body")
        elif not self.media_url:
            raise ValueError("image and video story items require a media_url")
        return self


class StoryCreate(StrictSchema):
    visibility: StoryVisibility = StoryVisibility.friends
    items: list[StoryItemCreate] = Field(min_length=1, max_length=20)


class StoryItemResponse(ORMStrictSchema):
    id: uuid.UUID
    media_kind: StoryItemKind
    media_url: str | None
    body: str | None
    duration_ms: int
    sort_order: int


class StoryAuthorResponse(StrictSchema):
    user_id: uuid.UUID
    handle: str
    display_name: str
    avatar_url: str | None


class StoryResponse(StrictSchema):
    id: uuid.UUID
    author: StoryAuthorResponse
    visibility: StoryVisibility
    created_at: datetime
    expires_at: datetime
    reply_count: int
    viewed: bool
    items: list[StoryItemResponse]


class StoryFeedResponse(StrictSchema):
    items: list[StoryResponse]


class StoryViewResponse(StrictSchema):
    status: str = "viewed"
    story_id: uuid.UUID
