from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import (
    AuthContext,
    current_auth,
    get_session,
    get_settings,
    require_permission,
)
from app.music_models import MusicLibraryItem, MusicPlaylist, MusicTrack, MusicTrackStatus
from app.music_schemas import (
    MusicLibraryResponse,
    MusicPlaylistCreate,
    MusicPlaylistResponse,
    MusicTrackCreate,
    MusicTrackPage,
    MusicTrackPatch,
    MusicTrackResponse,
    PlaylistTrackAdd,
)
from app.music_service import (
    add_playlist_track,
    browse_tracks,
    owned_playlist,
    owned_track,
    playlist_response,
    publish_track,
    published_track,
    remove_playlist_track,
    save_library_track,
    visible_track,
)
from app.schemas import MessageResponse
from app.security import utcnow

router = APIRouter(prefix="/music", tags=["Music"])


@router.get("/tracks", response_model=MusicTrackPage)
async def list_tracks(
    q: str | None = Query(default=None, min_length=1, max_length=100),
    genre: str | None = Query(default=None, min_length=1, max_length=64),
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    _: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MusicTrackPage:
    return await browse_tracks(
        db,
        settings,
        q=q,
        genre=genre,
        cursor=cursor,
        limit=limit,
    )


@router.get("/tracks/{track_id}", response_model=MusicTrackResponse)
async def get_track(
    track_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicTrack:
    return await visible_track(db, track_id, auth.user.id)


@router.post(
    "/tracks",
    response_model=MusicTrackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_track(
    payload: MusicTrackCreate,
    auth: AuthContext = Depends(require_permission("creator:manage")),
    db: AsyncSession = Depends(get_session),
) -> MusicTrack:
    values = payload.model_dump()
    track = MusicTrack(
        creator_user_id=auth.user.id,
        published_at=utcnow() if payload.status == MusicTrackStatus.published else None,
        **values,
    )
    db.add(track)
    await db.commit()
    await db.refresh(track)
    return track


@router.patch("/tracks/{track_id}", response_model=MusicTrackResponse)
async def update_track(
    track_id: uuid.UUID,
    payload: MusicTrackPatch,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicTrack:
    track = await owned_track(db, track_id, auth.user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(track, field, value)
    await db.commit()
    await db.refresh(track)
    return track


@router.post("/tracks/{track_id}/publish", response_model=MusicTrackResponse)
async def publish_music_track(
    track_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicTrack:
    return await publish_track(db, await owned_track(db, track_id, auth.user.id))


@router.get("/playlists", response_model=list[MusicPlaylistResponse])
async def list_playlists(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[MusicPlaylistResponse]:
    playlists = (
        await db.scalars(
            select(MusicPlaylist)
            .where(MusicPlaylist.owner_user_id == auth.user.id)
            .order_by(MusicPlaylist.updated_at.desc(), MusicPlaylist.id.desc())
            .limit(200)
        )
    ).all()
    return [await playlist_response(db, playlist) for playlist in playlists]


@router.post(
    "/playlists",
    response_model=MusicPlaylistResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_playlist(
    payload: MusicPlaylistCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistResponse:
    playlist = MusicPlaylist(owner_user_id=auth.user.id, **payload.model_dump())
    db.add(playlist)
    await db.commit()
    await db.refresh(playlist)
    return await playlist_response(db, playlist)


@router.get("/playlists/{playlist_id}", response_model=MusicPlaylistResponse)
async def get_playlist(
    playlist_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistResponse:
    return await playlist_response(db, await owned_playlist(db, playlist_id, auth.user.id))


@router.post("/playlists/{playlist_id}/tracks", response_model=MusicPlaylistResponse)
async def add_track_to_playlist(
    playlist_id: uuid.UUID,
    payload: PlaylistTrackAdd,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicPlaylistResponse:
    playlist = await owned_playlist(db, playlist_id, auth.user.id)
    track = await published_track(db, payload.track_id)
    await add_playlist_track(db, playlist, track, payload.position)
    await db.refresh(playlist)
    return await playlist_response(db, playlist)


@router.delete(
    "/playlists/{playlist_id}/tracks/{track_id}",
    response_model=MessageResponse,
)
async def delete_track_from_playlist(
    playlist_id: uuid.UUID,
    track_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    playlist = await owned_playlist(db, playlist_id, auth.user.id)
    await remove_playlist_track(db, playlist, track_id)
    return MessageResponse(status="removed")


@router.get("/library", response_model=MusicLibraryResponse)
async def get_library(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicLibraryResponse:
    tracks = (
        await db.scalars(
            select(MusicTrack)
            .join(MusicLibraryItem, MusicLibraryItem.track_id == MusicTrack.id)
            .where(
                MusicLibraryItem.user_id == auth.user.id,
                MusicTrack.status == MusicTrackStatus.published,
            )
            .order_by(MusicLibraryItem.saved_at.desc(), MusicLibraryItem.id.desc())
        )
    ).all()
    return MusicLibraryResponse(
        items=[MusicTrackResponse.model_validate(track) for track in tracks]
    )


@router.post("/library/{track_id}", response_model=MusicTrackResponse)
async def save_track(
    track_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MusicTrack:
    track = await published_track(db, track_id)
    await save_library_track(db, auth.user.id, track)
    return track


@router.delete("/library/{track_id}", response_model=MessageResponse)
async def remove_saved_track(
    track_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    await db.execute(
        delete(MusicLibraryItem).where(
            MusicLibraryItem.user_id == auth.user.id,
            MusicLibraryItem.track_id == track_id,
        )
    )
    await db.commit()
    return MessageResponse(status="removed")
