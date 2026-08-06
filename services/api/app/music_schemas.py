from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.music_models import MusicTrackStatus
from app.social_schemas import validate_plain_text, validate_reference


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ORMStrictSchema(StrictSchema):
    model_config = ConfigDict(extra="forbid", from_attributes=True)


class MusicTrackCreate(StrictSchema):
    title: str = Field(min_length=1, max_length=200)
    artist_name: str = Field(min_length=1, max_length=160)
    genre: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9][A-Za-z0-9 &/_-]*$")
    duration_ms: int = Field(gt=0, le=86_400_000)
    cover_url: str | None = Field(default=None, max_length=2048)
    audio_object_key: str | None = Field(default=None, min_length=1, max_length=512)
    status: MusicTrackStatus = MusicTrackStatus.draft

    _plain_title = field_validator("title")(validate_plain_text)
    _plain_artist = field_validator("artist_name")(validate_plain_text)
    _plain_genre = field_validator("genre")(validate_plain_text)
    _safe_cover = field_validator("cover_url")(
        lambda value: validate_reference(value) if value else value
    )
    _plain_object_key = field_validator("audio_object_key")(
        lambda value: validate_plain_text(value) if value else value
    )


class MusicTrackPatch(StrictSchema):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    artist_name: str | None = Field(default=None, min_length=1, max_length=160)
    genre: str | None = Field(
        default=None,
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9 &/_-]*$",
    )
    duration_ms: int | None = Field(default=None, gt=0, le=86_400_000)
    cover_url: str | None = Field(default=None, max_length=2048)
    audio_object_key: str | None = Field(default=None, min_length=1, max_length=512)

    _plain_title = field_validator("title")(
        lambda value: validate_plain_text(value) if value else value
    )
    _plain_artist = field_validator("artist_name")(
        lambda value: validate_plain_text(value) if value else value
    )
    _plain_genre = field_validator("genre")(
        lambda value: validate_plain_text(value) if value else value
    )
    _safe_cover = field_validator("cover_url")(
        lambda value: validate_reference(value) if value else value
    )
    _plain_object_key = field_validator("audio_object_key")(
        lambda value: validate_plain_text(value) if value else value
    )

    @model_validator(mode="after")
    def required_values_cannot_be_null(self) -> MusicTrackPatch:
        for field in {"title", "artist_name", "genre", "duration_ms"} & self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class MusicTrackResponse(ORMStrictSchema):
    id: uuid.UUID
    creator_user_id: uuid.UUID
    title: str
    artist_name: str
    genre: str
    duration_ms: int
    cover_url: str | None
    audio_object_key: str | None
    status: MusicTrackStatus
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class MusicTrackPage(StrictSchema):
    items: list[MusicTrackResponse]
    next_cursor: str | None


class MusicPlaylistCreate(StrictSchema):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=2000)

    _plain_name = field_validator("name")(validate_plain_text)
    _plain_description = field_validator("description")(
        lambda value: validate_plain_text(value) if value else value
    )


class PlaylistTrackAdd(StrictSchema):
    track_id: uuid.UUID
    position: int | None = Field(default=None, ge=0)


class PlaylistTrackResponse(StrictSchema):
    position: int
    added_at: datetime
    track: MusicTrackResponse


class MusicPlaylistResponse(ORMStrictSchema):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    tracks: list[PlaylistTrackResponse] = Field(default_factory=list)


class MusicLibraryResponse(StrictSchema):
    items: list[MusicTrackResponse]
