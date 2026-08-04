"""Music module API smoke tests."""

from __future__ import annotations

import pytest

from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member


@pytest.mark.asyncio
async def test_music_home_playlists_and_ai(api: APIHarness) -> None:
    _, tokens = await create_member(api, email="music-user@example.com", display_name="Music User")
    headers = bearer(tokens["access_token"])

    home = await api.client.get("/v1/music/home", headers=headers)
    assert home.status_code == 200, home.text
    body = home.json()
    assert len(body["royalty_free"]) >= 1
    assert len(body["mood_playlists"]) >= 1
    assert len(body["creator_bgm"]) >= 1

    track_id = body["royalty_free"][0]["id"]
    played = await api.client.post(
        "/v1/music/play",
        headers=headers,
        json={"track_id": track_id, "context": "player"},
    )
    assert played.status_code == 204, played.text

    favored = await api.client.post(f"/v1/music/favorites/{track_id}", headers=headers)
    assert favored.status_code == 200
    assert favored.json()["favorited"] is True

    playlist = await api.client.post(
        "/v1/music/playlists",
        headers=headers,
        json={"title": "Late Night", "kind": "personal"},
    )
    assert playlist.status_code == 201, playlist.text

    ai = await api.client.post(
        "/v1/music/ai-playlists",
        headers=headers,
        json={"prompt": "calm focus for coding"},
    )
    assert ai.status_code == 201, ai.text
    assert ai.json()["kind"] == "ai"
    assert ai.json()["track_count"] >= 1

    home2 = await api.client.get("/v1/music/home", headers=headers)
    assert home2.status_code == 200
    assert any(t["id"] == track_id for t in home2.json()["recently_played"])
    assert any(t["id"] == track_id for t in home2.json()["favorites"])


@pytest.mark.asyncio
async def test_music_catalog_searches_title_and_artist(api: APIHarness) -> None:
    _, tokens = await create_member(
        api, email="music-search@example.com", display_name="Music Search"
    )
    headers = bearer(tokens["access_token"])

    by_title = await api.client.get("/v1/music/tracks", headers=headers, params={"q": "AURORA"})
    assert by_title.status_code == 200, by_title.text
    title_items = by_title.json()["items"]
    assert [track["title"] for track in title_items] == ["Aurora Focus"]
    assert title_items[0]["allows_listening"] is True
    assert title_items[0]["allows_live_bgm"] is True
    assert title_items[0]["allows_vod"] is True
    assert title_items[0]["territory_code"] == "WW"
    assert title_items[0]["license_code"] == "royalty_free_demo"

    by_artist = await api.client.get(
        "/v1/music/tracks",
        headers=headers,
        params={"q": "sylora creators", "creator_bgm": True},
    )
    assert by_artist.status_code == 200, by_artist.text
    artist_items = by_artist.json()["items"]
    assert [track["title"] for track in artist_items] == ["Live Stage Underscore"]


@pytest.mark.asyncio
async def test_playlist_owner_can_update_remove_tracks_and_delete(api: APIHarness) -> None:
    _, owner_tokens = await create_member(
        api, email="playlist-owner@example.com", display_name="Playlist Owner"
    )
    _, other_tokens = await create_member(
        api, email="playlist-other@example.com", display_name="Playlist Other"
    )
    owner_headers = bearer(owner_tokens["access_token"])
    other_headers = bearer(other_tokens["access_token"])

    tracks = await api.client.get("/v1/music/tracks", headers=owner_headers)
    assert tracks.status_code == 200, tracks.text
    track_id = tracks.json()["items"][0]["id"]

    created = await api.client.post(
        "/v1/music/playlists",
        headers=owner_headers,
        json={"title": "Working title", "kind": "personal"},
    )
    assert created.status_code == 201, created.text
    playlist_id = created.json()["id"]

    added = await api.client.post(
        f"/v1/music/playlists/{playlist_id}/tracks",
        headers=owner_headers,
        json={"track_id": track_id},
    )
    assert added.status_code == 201, added.text

    forbidden_patch = await api.client.patch(
        f"/v1/music/playlists/{playlist_id}",
        headers=other_headers,
        json={"title": "Not yours"},
    )
    assert forbidden_patch.status_code == 404

    updated = await api.client.patch(
        f"/v1/music/playlists/{playlist_id}",
        headers=owner_headers,
        json={"title": "Road Trip", "description": "Favorites for the road."},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Road Trip"
    assert updated.json()["description"] == "Favorites for the road."
    assert updated.json()["track_count"] == 1

    forbidden_remove = await api.client.delete(
        f"/v1/music/playlists/{playlist_id}/tracks/{track_id}",
        headers=other_headers,
    )
    assert forbidden_remove.status_code == 404

    removed = await api.client.delete(
        f"/v1/music/playlists/{playlist_id}/tracks/{track_id}",
        headers=owner_headers,
    )
    assert removed.status_code == 204, removed.text

    playlist_tracks = await api.client.get(
        f"/v1/music/playlists/{playlist_id}/tracks", headers=owner_headers
    )
    assert playlist_tracks.status_code == 200, playlist_tracks.text
    assert playlist_tracks.json()["items"] == []

    forbidden_delete = await api.client.delete(
        f"/v1/music/playlists/{playlist_id}", headers=other_headers
    )
    assert forbidden_delete.status_code == 404

    deleted = await api.client.delete(f"/v1/music/playlists/{playlist_id}", headers=owner_headers)
    assert deleted.status_code == 204, deleted.text

    playlists = await api.client.get("/v1/music/playlists", headers=owner_headers)
    assert playlists.status_code == 200, playlists.text
    assert all(item["id"] != playlist_id for item in playlists.json()["items"])
