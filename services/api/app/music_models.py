"""SYLORA Music module — playlists, catalog, creator BGM, listening history."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models import Base


class MusicTrackKind(enum.StrEnum):
    royalty_free = "royalty_free"
    creator_upload = "creator_upload"
    ai_generated = "ai_generated"
    mood = "mood"


class MusicMood(enum.StrEnum):
    focus = "focus"
    energy = "energy"
    calm = "calm"
    night = "night"
    creative = "creative"
    live = "live"


class MusicPlaylistKind(enum.StrEnum):
    personal = "personal"
    favorites = "favorites"
    ai = "ai"
    mood = "mood"
    creator_bgm = "creator_bgm"
    system = "system"


class MusicTrack(Base):
    __tablename__ = "music_tracks"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_music_tracks_slug"),
        Index("ix_music_tracks_kind_mood", "kind", "mood"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(80), index=True)
    title: Mapped[str] = mapped_column(String(200))
    artist_name: Mapped[str] = mapped_column(String(120), default="SYLORA")
    kind: Mapped[MusicTrackKind] = mapped_column(
        Enum(MusicTrackKind, native_enum=False, length=24),
        default=MusicTrackKind.royalty_free,
        index=True,
    )
    mood: Mapped[MusicMood | None] = mapped_column(
        Enum(MusicMood, native_enum=False, length=24),
        nullable=True,
        index=True,
    )
    duration_seconds: Mapped[int] = mapped_column(Integer, default=180)
    audio_url: Mapped[str] = mapped_column(String(2048))
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    license_label: Mapped[str] = mapped_column(String(64), default="Royalty-free")
    allows_listening: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    allows_live_bgm: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    allows_vod: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    territory_code: Mapped[str | None] = mapped_column(String(8), nullable=True)
    license_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    is_creator_bgm: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    meta: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


class MusicPlaylist(Base):
    __tablename__ = "music_playlists"
    __table_args__ = (Index("ix_music_playlists_owner_kind", "owner_user_id", "kind"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    kind: Mapped[MusicPlaylistKind] = mapped_column(
        Enum(MusicPlaylistKind, native_enum=False, length=24),
        default=MusicPlaylistKind.personal,
        index=True,
    )
    mood: Mapped[MusicMood | None] = mapped_column(
        Enum(MusicMood, native_enum=False, length=24),
        nullable=True,
    )
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MusicPlaylistItem(Base):
    __tablename__ = "music_playlist_items"
    __table_args__ = (
        UniqueConstraint("playlist_id", "track_id", name="uq_music_playlist_track"),
        Index("ix_music_playlist_items_order", "playlist_id", "position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    playlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_playlists.id", ondelete="CASCADE"), index=True
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_tracks.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MusicFavorite(Base):
    __tablename__ = "music_favorites"
    __table_args__ = (UniqueConstraint("user_id", "track_id", name="uq_music_favorite_user_track"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_tracks.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MusicPlayEvent(Base):
    __tablename__ = "music_play_events"
    __table_args__ = (Index("ix_music_play_events_user_created", "user_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_tracks.id", ondelete="CASCADE"), index=True
    )
    context: Mapped[str] = mapped_column(String(32), default="player")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
