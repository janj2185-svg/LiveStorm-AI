"""Music API schemas."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.music_models import MusicMood, MusicPlaylistKind, MusicTrackKind


class MusicTrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    title: str
    artist_name: str
    kind: MusicTrackKind
    mood: MusicMood | None
    duration_seconds: int
    audio_url: str
    cover_url: str | None
    license_label: str
    allows_listening: bool
    allows_live_bgm: bool
    allows_vod: bool
    territory_code: str | None
    license_code: str | None
    is_creator_bgm: bool


class MusicTrackPage(BaseModel):
    items: list[MusicTrackResponse]
    next_cursor: str | None = None


class MusicPlaylistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: str | None
    kind: MusicPlaylistKind
    mood: MusicMood | None
    cover_url: str | None
    is_public: bool
    track_count: int = 0


class MusicPlaylistPage(BaseModel):
    items: list[MusicPlaylistResponse]


class MusicPlaylistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    kind: MusicPlaylistKind = MusicPlaylistKind.personal
    mood: MusicMood | None = None
    is_public: bool = False


class MusicPlaylistUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)


class MusicPlaylistAddTrack(BaseModel):
    track_id: uuid.UUID


class MusicAiPlaylistRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    mood: MusicMood | None = None
    title: str | None = Field(default=None, max_length=200)


class MusicPlayRequest(BaseModel):
    track_id: uuid.UUID
    context: str = Field(default="player", max_length=32)


class MusicHomeResponse(BaseModel):
    recently_played: list[MusicTrackResponse]
    favorites: list[MusicTrackResponse]
    mood_playlists: list[MusicPlaylistResponse]
    royalty_free: list[MusicTrackResponse]
    creator_bgm: list[MusicTrackResponse]
    ai_playlists: list[MusicPlaylistResponse]
    personal_playlists: list[MusicPlaylistResponse]
