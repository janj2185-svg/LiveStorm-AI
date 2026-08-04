"""Music module HTTP API."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import AuthContext, current_auth, get_session
from app.errors import APIError
from app.music_models import MusicMood, MusicPlaylist, MusicTrackKind
from app.music_schemas import (
    MusicAiPlaylistRequest,
    MusicHomeResponse,
    MusicPlayRequest,
    MusicPlaylistAddTrack,
    MusicPlaylistCreate,
    MusicPlaylistPage,
    MusicPlaylistResponse,
    MusicTrackPage,
    MusicTrackResponse,
)
from app.music_service import (
    add_track_to_playlist,
    create_ai_playlist,
    create_playlist,
    list_tracks,
    music_home,
    playlist_response,
    playlist_tracks,
    record_play,
    toggle_favorite,
    track_response,
)

router = APIRouter(prefix="/music", tags=["Music"])
Authenticated = Annotated[AuthContext, Depends(current_auth)]


@router.get("/home", response_model=MusicHomeResponse)
async def get_music_home(
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicHomeResponse:
    home = await music_home(db, auth.user.id)
    await db.commit()
    return home


@router.get("/tracks", response_model=MusicTrackPage)
async def get_tracks(
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
    kind: MusicTrackKind | None = None,
    mood: MusicMood | None = None,
    creator_bgm: bool | None = None,
    limit: int = Query(default=50, ge=1, le=100),
) -> MusicTrackPage:
    tracks = await list_tracks(
        db, kind=kind, mood=mood, creator_bgm=creator_bgm, limit=limit
    )
    await db.commit()
    return MusicTrackPage(items=[track_response(t) for t in tracks])


@router.get("/playlists", response_model=MusicPlaylistPage)
async def get_playlists(
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistPage:
    personal = (
        await db.scalars(
            select(MusicPlaylist)
            .where(MusicPlaylist.owner_user_id == auth.user.id)
            .order_by(MusicPlaylist.updated_at.desc())
        )
    ).all()
    system = (
        await db.scalars(
            select(MusicPlaylist)
            .where(MusicPlaylist.owner_user_id.is_(None), MusicPlaylist.is_public.is_(True))
            .order_by(MusicPlaylist.title.asc())
        )
    ).all()
    items = [await playlist_response(db, p) for p in [*personal, *system]]
    await db.commit()
    return MusicPlaylistPage(items=items)


@router.post(
    "/playlists",
    response_model=MusicPlaylistResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_playlist(
    payload: MusicPlaylistCreate,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistResponse:
    playlist = await create_playlist(db, auth.user.id, payload)
    response = await playlist_response(db, playlist)
    await db.commit()
    return response


@router.get("/playlists/{playlist_id}/tracks", response_model=MusicTrackPage)
async def get_playlist_tracks(
    playlist_id: uuid.UUID,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicTrackPage:
    playlist = await db.get(MusicPlaylist, playlist_id)
    if playlist is None:
        raise APIError(404, "playlist_not_found", "Playlist not found", "Playlist not found.")
    if playlist.owner_user_id not in {None, auth.user.id} and not playlist.is_public:
        raise APIError(403, "playlist_forbidden", "Forbidden", "You cannot access this playlist.")
    tracks = await playlist_tracks(db, playlist_id)
    return MusicTrackPage(items=[track_response(t) for t in tracks])


@router.post(
    "/playlists/{playlist_id}/tracks",
    response_model=MusicTrackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_playlist_track(
    playlist_id: uuid.UUID,
    payload: MusicPlaylistAddTrack,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicTrackResponse:
    await add_track_to_playlist(db, auth.user.id, playlist_id, payload.track_id)
    tracks = await playlist_tracks(db, playlist_id)
    match = next((t for t in tracks if t.id == payload.track_id), None)
    if match is None:
        raise APIError(404, "track_not_found", "Track not found", "Track not found.")
    await db.commit()
    return track_response(match)


@router.post("/favorites/{track_id}")
async def post_favorite(
    track_id: uuid.UUID,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> dict[str, bool]:
    favored = await toggle_favorite(db, auth.user.id, track_id)
    await db.commit()
    return {"favorited": favored}


@router.post("/play", status_code=status.HTTP_204_NO_CONTENT)
async def post_play(
    payload: MusicPlayRequest,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> None:
    await record_play(db, auth.user.id, payload.track_id, payload.context)
    await db.commit()


@router.post(
    "/ai-playlists",
    response_model=MusicPlaylistResponse,
    status_code=status.HTTP_201_CREATED,
)
async def post_ai_playlist(
    payload: MusicAiPlaylistRequest,
    auth: Authenticated,
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistResponse:
    playlist = await create_ai_playlist(db, auth.user.id, payload)
    response = await playlist_response(db, playlist)
    await db.commit()
    return response
