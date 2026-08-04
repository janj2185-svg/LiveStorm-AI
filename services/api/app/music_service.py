"""Music service — catalog, playlists, favorites, AI mood playlists."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import APIError
from app.music_models import (
    MusicFavorite,
    MusicMood,
    MusicPlayEvent,
    MusicPlaylist,
    MusicPlaylistItem,
    MusicPlaylistKind,
    MusicTrack,
    MusicTrackKind,
)
from app.music_schemas import (
    MusicAiPlaylistRequest,
    MusicHomeResponse,
    MusicPlaylistCreate,
    MusicPlaylistResponse,
    MusicTrackResponse,
)

_SEED_TRACKS: list[dict[str, object]] = [
    {
        "slug": "aurora-focus-01",
        "title": "Aurora Focus",
        "artist_name": "SYLORA Library",
        "kind": MusicTrackKind.royalty_free,
        "mood": MusicMood.focus,
        "duration_seconds": 204,
        "audio_url": "https://cdn.getsylora.com/music/seed/aurora-focus-01.mp3",
        "is_creator_bgm": True,
        "license_label": "Royalty-free",
    },
    {
        "slug": "pulse-energy-01",
        "title": "Pulse Energy",
        "artist_name": "SYLORA Library",
        "kind": MusicTrackKind.royalty_free,
        "mood": MusicMood.energy,
        "duration_seconds": 188,
        "audio_url": "https://cdn.getsylora.com/music/seed/pulse-energy-01.mp3",
        "is_creator_bgm": True,
        "license_label": "Royalty-free",
    },
    {
        "slug": "glass-calm-01",
        "title": "Glass Calm",
        "artist_name": "SYLORA Library",
        "kind": MusicTrackKind.mood,
        "mood": MusicMood.calm,
        "duration_seconds": 240,
        "audio_url": "https://cdn.getsylora.com/music/seed/glass-calm-01.mp3",
        "is_creator_bgm": True,
        "license_label": "Royalty-free",
    },
    {
        "slug": "night-orbit-01",
        "title": "Night Orbit",
        "artist_name": "SYLORA Library",
        "kind": MusicTrackKind.mood,
        "mood": MusicMood.night,
        "duration_seconds": 216,
        "audio_url": "https://cdn.getsylora.com/music/seed/night-orbit-01.mp3",
        "is_creator_bgm": False,
        "license_label": "Royalty-free",
    },
    {
        "slug": "creative-spark-01",
        "title": "Creative Spark",
        "artist_name": "SYLORA Library",
        "kind": MusicTrackKind.royalty_free,
        "mood": MusicMood.creative,
        "duration_seconds": 192,
        "audio_url": "https://cdn.getsylora.com/music/seed/creative-spark-01.mp3",
        "is_creator_bgm": True,
        "license_label": "Royalty-free",
    },
    {
        "slug": "live-stage-01",
        "title": "Live Stage Underscore",
        "artist_name": "SYLORA Creators",
        "kind": MusicTrackKind.royalty_free,
        "mood": MusicMood.live,
        "duration_seconds": 300,
        "audio_url": "https://cdn.getsylora.com/music/seed/live-stage-01.mp3",
        "is_creator_bgm": True,
        "license_label": "Royalty-free · Creator BGM",
    },
]


def track_response(track: MusicTrack) -> MusicTrackResponse:
    return MusicTrackResponse.model_validate(track)


async def ensure_seed_catalog(db: AsyncSession) -> None:
    existing = await db.scalar(select(func.count()).select_from(MusicTrack))
    if existing and int(existing) > 0:
        return
    for item in _SEED_TRACKS:
        db.add(MusicTrack(**item))
    for mood in MusicMood:
        db.add(
            MusicPlaylist(
                owner_user_id=None,
                title=f"{mood.value.title()} Moments",
                description=f"Curated {mood.value} playlist for SYLORA.",
                kind=MusicPlaylistKind.mood,
                mood=mood,
                is_public=True,
            )
        )
    await db.flush()
    tracks = (await db.scalars(select(MusicTrack))).all()
    playlists = (
        await db.scalars(
            select(MusicPlaylist).where(MusicPlaylist.kind == MusicPlaylistKind.mood)
        )
    ).all()
    by_mood = {t.mood: t for t in tracks if t.mood is not None}
    for playlist in playlists:
        track = by_mood.get(playlist.mood)
        if track is None:
            continue
        db.add(
            MusicPlaylistItem(playlist_id=playlist.id, track_id=track.id, position=0)
        )
    await db.flush()


async def playlist_response(db: AsyncSession, playlist: MusicPlaylist) -> MusicPlaylistResponse:
    count = int(
        await db.scalar(
            select(func.count())
            .select_from(MusicPlaylistItem)
            .where(MusicPlaylistItem.playlist_id == playlist.id)
        )
        or 0
    )
    base = MusicPlaylistResponse.model_validate(playlist)
    return base.model_copy(update={"track_count": count})


async def music_home(db: AsyncSession, user_id: uuid.UUID) -> MusicHomeResponse:
    await ensure_seed_catalog(db)
    recent_ids = (
        await db.scalars(
            select(MusicPlayEvent.track_id)
            .where(MusicPlayEvent.user_id == user_id)
            .order_by(MusicPlayEvent.created_at.desc())
            .limit(12)
        )
    ).all()
    recent_tracks: list[MusicTrack] = []
    seen: set[uuid.UUID] = set()
    for track_id in recent_ids:
        if track_id in seen:
            continue
        seen.add(track_id)
        track = await db.get(MusicTrack, track_id)
        if track is not None:
            recent_tracks.append(track)

    favorite_ids = (
        await db.scalars(
            select(MusicFavorite.track_id)
            .where(MusicFavorite.user_id == user_id)
            .order_by(MusicFavorite.created_at.desc())
            .limit(24)
        )
    ).all()
    favorites = [
        track
        for track_id in favorite_ids
        if (track := await db.get(MusicTrack, track_id)) is not None
    ]

    mood_playlists = (
        await db.scalars(
            select(MusicPlaylist)
            .where(MusicPlaylist.kind == MusicPlaylistKind.mood)
            .order_by(MusicPlaylist.title.asc())
        )
    ).all()
    royalty_free = (
        await db.scalars(
            select(MusicTrack)
            .where(MusicTrack.kind == MusicTrackKind.royalty_free)
            .order_by(MusicTrack.title.asc())
            .limit(24)
        )
    ).all()
    creator_bgm = (
        await db.scalars(
            select(MusicTrack)
            .where(MusicTrack.is_creator_bgm.is_(True))
            .order_by(MusicTrack.title.asc())
            .limit(24)
        )
    ).all()
    ai_playlists = (
        await db.scalars(
            select(MusicPlaylist)
            .where(
                MusicPlaylist.owner_user_id == user_id,
                MusicPlaylist.kind == MusicPlaylistKind.ai,
            )
            .order_by(MusicPlaylist.updated_at.desc())
            .limit(12)
        )
    ).all()
    personal = (
        await db.scalars(
            select(MusicPlaylist)
            .where(
                MusicPlaylist.owner_user_id == user_id,
                MusicPlaylist.kind == MusicPlaylistKind.personal,
            )
            .order_by(MusicPlaylist.updated_at.desc())
            .limit(24)
        )
    ).all()

    return MusicHomeResponse(
        recently_played=[track_response(t) for t in recent_tracks],
        favorites=[track_response(t) for t in favorites],
        mood_playlists=[await playlist_response(db, p) for p in mood_playlists],
        royalty_free=[track_response(t) for t in royalty_free],
        creator_bgm=[track_response(t) for t in creator_bgm],
        ai_playlists=[await playlist_response(db, p) for p in ai_playlists],
        personal_playlists=[await playlist_response(db, p) for p in personal],
    )


async def list_tracks(
    db: AsyncSession,
    *,
    kind: MusicTrackKind | None = None,
    mood: MusicMood | None = None,
    creator_bgm: bool | None = None,
    limit: int = 50,
) -> list[MusicTrack]:
    await ensure_seed_catalog(db)
    stmt = select(MusicTrack).order_by(MusicTrack.title.asc()).limit(limit)
    if kind is not None:
        stmt = stmt.where(MusicTrack.kind == kind)
    if mood is not None:
        stmt = stmt.where(MusicTrack.mood == mood)
    if creator_bgm is not None:
        stmt = stmt.where(MusicTrack.is_creator_bgm.is_(creator_bgm))
    return list(await db.scalars(stmt))


async def create_playlist(
    db: AsyncSession, user_id: uuid.UUID, payload: MusicPlaylistCreate
) -> MusicPlaylist:
    playlist = MusicPlaylist(
        owner_user_id=user_id,
        title=payload.title.strip(),
        description=payload.description,
        kind=payload.kind,
        mood=payload.mood,
        is_public=payload.is_public,
    )
    db.add(playlist)
    await db.flush()
    return playlist


async def add_track_to_playlist(
    db: AsyncSession, user_id: uuid.UUID, playlist_id: uuid.UUID, track_id: uuid.UUID
) -> MusicPlaylistItem:
    playlist = await db.get(MusicPlaylist, playlist_id)
    if playlist is None or playlist.owner_user_id != user_id:
        raise APIError(404, "playlist_not_found", "Playlist not found", "Playlist not found.")
    track = await db.get(MusicTrack, track_id)
    if track is None:
        raise APIError(404, "track_not_found", "Track not found", "Track not found.")
    existing = await db.scalar(
        select(MusicPlaylistItem).where(
            MusicPlaylistItem.playlist_id == playlist_id,
            MusicPlaylistItem.track_id == track_id,
        )
    )
    if existing is not None:
        return existing
    position = int(
        await db.scalar(
            select(func.coalesce(func.max(MusicPlaylistItem.position), -1)).where(
                MusicPlaylistItem.playlist_id == playlist_id
            )
        )
        or -1
    )
    item = MusicPlaylistItem(
        playlist_id=playlist_id, track_id=track_id, position=position + 1
    )
    db.add(item)
    await db.flush()
    return item


async def playlist_tracks(db: AsyncSession, playlist_id: uuid.UUID) -> list[MusicTrack]:
    items = (
        await db.scalars(
            select(MusicPlaylistItem)
            .where(MusicPlaylistItem.playlist_id == playlist_id)
            .order_by(MusicPlaylistItem.position.asc())
        )
    ).all()
    tracks: list[MusicTrack] = []
    for item in items:
        track = await db.get(MusicTrack, item.track_id)
        if track is not None:
            tracks.append(track)
    return tracks


async def toggle_favorite(db: AsyncSession, user_id: uuid.UUID, track_id: uuid.UUID) -> bool:
    track = await db.get(MusicTrack, track_id)
    if track is None:
        raise APIError(404, "track_not_found", "Track not found", "Track not found.")
    existing = await db.scalar(
        select(MusicFavorite).where(
            MusicFavorite.user_id == user_id, MusicFavorite.track_id == track_id
        )
    )
    if existing is not None:
        await db.execute(delete(MusicFavorite).where(MusicFavorite.id == existing.id))
        await db.flush()
        return False
    db.add(MusicFavorite(user_id=user_id, track_id=track_id))
    await db.flush()
    return True


async def record_play(
    db: AsyncSession, user_id: uuid.UUID, track_id: uuid.UUID, context: str
) -> None:
    track = await db.get(MusicTrack, track_id)
    if track is None:
        raise APIError(404, "track_not_found", "Track not found", "Track not found.")
    db.add(MusicPlayEvent(user_id=user_id, track_id=track_id, context=context[:32]))
    await db.flush()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (slug[:60] or "ai-playlist") + f"-{uuid.uuid4().hex[:6]}"


async def create_ai_playlist(
    db: AsyncSession, user_id: uuid.UUID, payload: MusicAiPlaylistRequest
) -> MusicPlaylist:
    await ensure_seed_catalog(db)
    mood = payload.mood
    prompt = payload.prompt.lower()
    if mood is None:
        for candidate in MusicMood:
            if candidate.value in prompt:
                mood = candidate
                break
    if mood is None:
        mood = MusicMood.creative
    title = payload.title or f"Aura · {mood.value.title()}"
    playlist = MusicPlaylist(
        owner_user_id=user_id,
        title=title[:200],
        description=payload.prompt[:2000],
        kind=MusicPlaylistKind.ai,
        mood=mood,
        is_public=False,
    )
    db.add(playlist)
    await db.flush()
    tracks = await list_tracks(db, mood=mood, limit=8)
    if not tracks:
        tracks = await list_tracks(db, limit=8)
    for index, track in enumerate(tracks):
        db.add(
            MusicPlaylistItem(
                playlist_id=playlist.id, track_id=track.id, position=index
            )
        )
    # Keep slug helper available for future AI-generated track inserts.
    _ = _slugify(title)
    await db.flush()
    return playlist
