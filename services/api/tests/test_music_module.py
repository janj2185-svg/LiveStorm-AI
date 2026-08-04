"""Music module API smoke tests."""

from __future__ import annotations

import pytest

from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member


@pytest.mark.asyncio
async def test_music_home_playlists_and_ai(api: APIHarness) -> None:
    _, tokens = await create_member(
        api, email="music-user@example.com", display_name="Music User"
    )
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
