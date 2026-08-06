from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.errors import APIError
from app.music_models import (
    MusicLibraryItem,
    MusicPlaylist,
    MusicTrack,
    MusicTrackStatus,
    PlaylistTrack,
)
from app.music_schemas import (
    MusicPlaylistResponse,
    MusicTrackPage,
    MusicTrackResponse,
    PlaylistTrackResponse,
)
from app.security import utcnow
from app.social_service import apply_cursor, decode_cursor, encode_cursor


async def owned_track(
    db: AsyncSession, track_id: uuid.UUID, user_id: uuid.UUID
) -> MusicTrack:
    track = await db.scalar(
        select(MusicTrack).where(
            MusicTrack.id == track_id,
            MusicTrack.creator_user_id == user_id,
        )
    )
    if track is None:
        raise APIError(404, "music_track_not_found", "Track not found", "The track does not exist.")
    return track


async def visible_track(
    db: AsyncSession, track_id: uuid.UUID, user_id: uuid.UUID
) -> MusicTrack:
    track = await db.scalar(
        select(MusicTrack).where(
            MusicTrack.id == track_id,
            or_(
                MusicTrack.status == MusicTrackStatus.published,
                MusicTrack.creator_user_id == user_id,
            ),
        )
    )
    if track is None:
        raise APIError(404, "music_track_not_found", "Track not found", "The track is unavailable.")
    return track


async def published_track(db: AsyncSession, track_id: uuid.UUID) -> MusicTrack:
    track = await db.scalar(
        select(MusicTrack).where(
            MusicTrack.id == track_id,
            MusicTrack.status == MusicTrackStatus.published,
        )
    )
    if track is None:
        raise APIError(404, "music_track_not_found", "Track not found", "The track is unavailable.")
    return track


async def browse_tracks(
    db: AsyncSession,
    settings: Settings,
    *,
    q: str | None,
    genre: str | None,
    cursor: str | None,
    limit: int,
) -> MusicTrackPage:
    scope = f"music-tracks:{q}:{genre}"
    statement = select(MusicTrack).where(MusicTrack.status == MusicTrackStatus.published)
    if q:
        pattern = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                MusicTrack.title.ilike(pattern),
                MusicTrack.artist_name.ilike(pattern),
                MusicTrack.genre.ilike(pattern),
            )
        )
    if genre:
        statement = statement.where(func.lower(MusicTrack.genre) == genre.strip().lower())
    statement = apply_cursor(
        statement,
        MusicTrack.created_at,
        MusicTrack.id,
        decode_cursor(settings, scope, cursor),
    )
    records = list(
        (
            await db.scalars(
                statement.order_by(MusicTrack.created_at.desc(), MusicTrack.id.desc()).limit(
                    limit + 1
                )
            )
        ).all()
    )
    visible = records[:limit]
    return MusicTrackPage(
        items=[MusicTrackResponse.model_validate(item) for item in visible],
        next_cursor=(
            encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
            if len(records) > limit and visible
            else None
        ),
    )


async def owned_playlist(
    db: AsyncSession, playlist_id: uuid.UUID, user_id: uuid.UUID
) -> MusicPlaylist:
    playlist = await db.scalar(
        select(MusicPlaylist).where(
            MusicPlaylist.id == playlist_id,
            MusicPlaylist.owner_user_id == user_id,
        )
    )
    if playlist is None:
        raise APIError(
            404,
            "music_playlist_not_found",
            "Playlist not found",
            "The playlist does not exist.",
        )
    return playlist


async def playlist_response(
    db: AsyncSession, playlist: MusicPlaylist
) -> MusicPlaylistResponse:
    rows = (
        await db.execute(
            select(PlaylistTrack, MusicTrack)
            .join(MusicTrack, MusicTrack.id == PlaylistTrack.track_id)
            .where(PlaylistTrack.playlist_id == playlist.id)
            .order_by(PlaylistTrack.position, PlaylistTrack.id)
        )
    ).all()
    return MusicPlaylistResponse(
        **MusicPlaylistResponse.model_validate(playlist).model_dump(exclude={"tracks"}),
        tracks=[
            PlaylistTrackResponse(
                position=item.position,
                added_at=item.added_at,
                track=MusicTrackResponse.model_validate(track),
            )
            for item, track in rows
        ],
    )


async def add_playlist_track(
    db: AsyncSession,
    playlist: MusicPlaylist,
    track: MusicTrack,
    position: int | None,
) -> None:
    duplicate = await db.scalar(
        select(PlaylistTrack.id).where(
            PlaylistTrack.playlist_id == playlist.id,
            PlaylistTrack.track_id == track.id,
        )
    )
    if duplicate is not None:
        raise APIError(
            409,
            "music_playlist_track_exists",
            "Track already in playlist",
            "This track is already in the playlist.",
        )
    count = int(
        await db.scalar(
            select(func.count())
            .select_from(PlaylistTrack)
            .where(PlaylistTrack.playlist_id == playlist.id)
        )
        or 0
    )
    target = count if position is None else min(position, count)
    if target < count:
        later = (
            await db.scalars(
                select(PlaylistTrack)
                .where(
                    PlaylistTrack.playlist_id == playlist.id,
                    PlaylistTrack.position >= target,
                )
                .order_by(PlaylistTrack.position.desc())
            )
        ).all()
        for item in later:
            item.position += 1
            await db.flush()
    db.add(PlaylistTrack(playlist_id=playlist.id, track_id=track.id, position=target))
    await db.commit()


async def remove_playlist_track(
    db: AsyncSession, playlist: MusicPlaylist, track_id: uuid.UUID
) -> None:
    item = await db.scalar(
        select(PlaylistTrack).where(
            PlaylistTrack.playlist_id == playlist.id,
            PlaylistTrack.track_id == track_id,
        )
    )
    if item is None:
        raise APIError(
            404,
            "music_playlist_track_not_found",
            "Playlist track not found",
            "The track is not in this playlist.",
        )
    removed_position = item.position
    await db.delete(item)
    await db.flush()
    later = (
        await db.scalars(
            select(PlaylistTrack)
            .where(
                PlaylistTrack.playlist_id == playlist.id,
                PlaylistTrack.position > removed_position,
            )
            .order_by(PlaylistTrack.position)
        )
    ).all()
    for later_item in later:
        later_item.position -= 1
        await db.flush()
    await db.commit()


async def save_library_track(
    db: AsyncSession, user_id: uuid.UUID, track: MusicTrack
) -> MusicLibraryItem:
    item = await db.scalar(
        select(MusicLibraryItem).where(
            MusicLibraryItem.user_id == user_id,
            MusicLibraryItem.track_id == track.id,
        )
    )
    if item is None:
        item = MusicLibraryItem(user_id=user_id, track_id=track.id)
        db.add(item)
        await db.commit()
        await db.refresh(item)
    return item


async def publish_track(db: AsyncSession, track: MusicTrack) -> MusicTrack:
    if track.status != MusicTrackStatus.published:
        track.status = MusicTrackStatus.published
        track.published_at = utcnow()
        await db.commit()
        await db.refresh(track)
    return track
