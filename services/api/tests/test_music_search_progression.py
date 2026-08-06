from __future__ import annotations

from sqlalchemy import select

from app.models import Role, UserRole
from tests.conftest import APIHarness, bearer, login, register_and_verify


async def member(
    api: APIHarness,
    *,
    email: str,
    display_name: str,
    handle: str | None = None,
    role: str | None = None,
) -> dict[str, str]:
    await register_and_verify(api, email=email, display_name=display_name)
    user = await api.user(email)
    if role is not None:
        async with api.app.state.session_factory() as db:
            selected_role = await db.scalar(select(Role).where(Role.name == role))
            assert selected_role is not None
            db.add(UserRole(user_id=user.id, role_id=selected_role.id))
            await db.commit()
    tokens = await login(api, email=email)
    headers = bearer(tokens["access_token"])
    if handle is not None:
        profile = await api.client.patch(
            "/v1/profile",
            headers=headers,
            json={"handle": handle},
        )
        assert profile.status_code == 200, profile.text
        visibility = await api.client.patch(
            "/v1/settings",
            headers=headers,
            json={"profile_visibility": "public"},
        )
        assert visibility.status_code == 200, visibility.text
    return headers


async def test_music_create_publish_browse_and_library(api: APIHarness) -> None:
    creator_headers = await member(
        api,
        email="music-creator@example.com",
        display_name="Music Creator",
        role="creator",
    )
    listener_headers = await member(
        api,
        email="music-listener@example.com",
        display_name="Music Listener",
    )

    created = await api.client.post(
        "/v1/music/tracks",
        headers=creator_headers,
        json={
            "title": "Neon Horizon",
            "artist_name": "SYLORA Sound",
            "genre": "Electronic",
            "duration_ms": 184000,
            "cover_url": "https://cdn.example.com/neon-horizon.webp",
            "audio_object_key": "music/neon-horizon.mp3",
            "status": "draft",
        },
    )
    assert created.status_code == 201, created.text
    track_id = created.json()["id"]
    assert created.json()["status"] == "draft"

    before_publish = await api.client.get(
        "/v1/music/tracks",
        headers=listener_headers,
        params={"q": "Neon"},
    )
    assert before_publish.status_code == 200, before_publish.text
    assert before_publish.json()["items"] == []

    published = await api.client.post(
        f"/v1/music/tracks/{track_id}/publish",
        headers=creator_headers,
    )
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "published"
    assert published.json()["published_at"] is not None

    browse = await api.client.get(
        "/v1/music/tracks",
        headers=listener_headers,
        params={"q": "Neon", "genre": "electronic"},
    )
    assert browse.status_code == 200, browse.text
    assert [item["id"] for item in browse.json()["items"]] == [track_id]

    saved = await api.client.post(
        f"/v1/music/library/{track_id}",
        headers=listener_headers,
    )
    assert saved.status_code == 200, saved.text
    library = await api.client.get("/v1/music/library", headers=listener_headers)
    assert library.status_code == 200, library.text
    assert [item["id"] for item in library.json()["items"]] == [track_id]


async def test_global_search_returns_typed_sections(api: APIHarness) -> None:
    headers = await member(
        api,
        email="aurora-search@example.com",
        display_name="Aurora Explorer",
        handle="aurora.explorer",
    )
    post = await api.client.post(
        "/v1/social/posts",
        headers=headers,
        json={
            "kind": "text",
            "body": "Aurora discovery across SYLORA",
            "lifecycle": "published",
        },
    )
    assert post.status_code == 201, post.text

    response = await api.client.get(
        "/v1/search",
        headers=headers,
        params={"q": "Aurora", "limit": 5},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {
        "query",
        "users",
        "posts",
        "communities",
        "gifts",
        "marketplace_products",
        "courses",
        "live_sessions",
        "music_tracks",
        "documents",
    }
    assert body["query"] == "Aurora"
    assert body["users"][0]["handle"] == "aurora.explorer"
    assert body["posts"][0]["id"] == post.json()["id"]


async def test_progression_defaults_and_seeded_achievements(api: APIHarness) -> None:
    headers = await member(
        api,
        email="new-progress@example.com",
        display_name="New Progress",
    )
    progression = await api.client.get("/v1/progression/me", headers=headers)
    assert progression.status_code == 200, progression.text
    assert progression.json() == {
        "level": 1,
        "xp": 0,
        "xp_to_next": 100,
        "achievements": [],
    }

    achievements = await api.client.get(
        "/v1/progression/achievements",
        headers=headers,
    )
    assert achievements.status_code == 200, achievements.text
    assert {item["code"] for item in achievements.json()} == {
        "first_post",
        "first_follow",
        "first_gift_sent",
        "first_live",
        "aura_chat",
    }


async def test_friends_and_pending_request_lists(api: APIHarness) -> None:
    first_headers = await member(
        api,
        email="friend-first@example.com",
        display_name="Friend First",
        handle="friend.first",
    )
    second_headers = await member(
        api,
        email="friend-second@example.com",
        display_name="Friend Second",
        handle="friend.second",
    )

    requested = await api.client.post(
        "/v1/social/friends/friend.second",
        headers=first_headers,
    )
    assert requested.status_code == 200, requested.text
    friendship_id = requested.json()["id"]

    outgoing = await api.client.get(
        "/v1/social/friend-requests",
        headers=first_headers,
    )
    incoming = await api.client.get(
        "/v1/social/friend-requests",
        headers=second_headers,
    )
    assert outgoing.json()["outgoing"][0]["profile"]["handle"] == "friend.second"
    assert incoming.json()["incoming"][0]["profile"]["handle"] == "friend.first"

    accepted = await api.client.post(
        f"/v1/social/friend-requests/{friendship_id}/accept",
        headers=second_headers,
    )
    assert accepted.status_code == 200, accepted.text
    friends = await api.client.get("/v1/social/friends", headers=first_headers)
    assert friends.status_code == 200, friends.text
    assert friends.json()[0]["friend"]["handle"] == "friend.second"
