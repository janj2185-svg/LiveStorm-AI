from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
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


class MusicTrackStatus(enum.StrEnum):
    draft = "draft"
    published = "published"


class MusicTrack(Base):
    __tablename__ = "music_tracks"
    __table_args__ = (CheckConstraint("duration_ms > 0", name="ck_music_tracks_positive_duration"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    creator_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200), index=True)
    artist_name: Mapped[str] = mapped_column(String(160), index=True)
    genre: Mapped[str] = mapped_column(String(64), index=True)
    duration_ms: Mapped[int] = mapped_column(Integer)
    cover_url: Mapped[str | None] = mapped_column(String(2048))
    audio_object_key: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[MusicTrackStatus] = mapped_column(
        Enum(MusicTrackStatus, native_enum=False, length=16),
        default=MusicTrackStatus.draft,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)


class MusicPlaylist(Base):
    __tablename__ = "music_playlists"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PlaylistTrack(Base):
    __tablename__ = "music_playlist_tracks"
    __table_args__ = (
        UniqueConstraint("playlist_id", "track_id", name="uq_music_playlist_track"),
        UniqueConstraint("playlist_id", "position", name="uq_music_playlist_position"),
        CheckConstraint("position >= 0", name="ck_music_playlist_position"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    playlist_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_playlists.id", ondelete="CASCADE"), index=True
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_tracks.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MusicLibraryItem(Base):
    __tablename__ = "music_library_items"
    __table_args__ = (UniqueConstraint("user_id", "track_id", name="uq_music_library_item"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("music_tracks.id", ondelete="CASCADE"), index=True
    )
    saved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


Index("ix_music_tracks_published", MusicTrack.status, MusicTrack.created_at, MusicTrack.id)
Index(
    "ix_music_playlist_tracks_order",
    PlaylistTrack.playlist_id,
    PlaylistTrack.position,
    PlaylistTrack.id,
)
Index(
    "ix_music_library_user_saved",
    MusicLibraryItem.user_id,
    MusicLibraryItem.saved_at,
    MusicLibraryItem.id,
)
