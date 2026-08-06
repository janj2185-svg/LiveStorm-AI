from __future__ import annotations

import uuid

from app.gift_models import GiftUserEligibility
from tests.conftest import bearer, login, register_and_verify


async def make_user(
    api,
    *,
    email: str,
    password: str,
    display_name: str,
    handle: str,
) -> dict[str, str]:
    await register_and_verify(api, email=email, password=password, display_name=display_name)
    tokens = await login(api, email=email, password=password)
    headers = bearer(tokens["access_token"])
    profile = await api.client.patch("/v1/profile", headers=headers, json={"handle": handle})
    assert profile.status_code == 200, profile.text
    settings_response = await api.client.patch(
        "/v1/settings", headers=headers, json={"profile_visibility": "public"}
    )
    assert settings_response.status_code == 200, settings_response.text
    return headers


async def befriend(
    api,
    requester_headers: dict[str, str],
    accepter_headers: dict[str, str],
    handle: str,
) -> None:
    request = await api.client.post(f"/v1/social/friends/{handle}", headers=requester_headers)
    assert request.status_code == 200, request.text
    accept = await api.client.post(
        f"/v1/social/friend-requests/{request.json()['id']}/accept",
        headers=accepter_headers,
    )
    assert accept.status_code == 200, accept.text


async def test_progress_defaults_and_achievement_catalog(api) -> None:
    headers = await make_user(
        api,
        email="progress@example.com",
        password="CorrectHorse!2026",
        display_name="Progress",
        handle="progress.one",
    )
    response = await api.client.get("/v1/me/progress", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["xp"] == 0
    assert body["level"] == 1
    assert body["xp_to_next"] == 500
    codes = {item["code"] for item in body["achievements"]}
    assert {"welcome", "first_post", "first_follow", "first_story", "first_gift_send"} <= codes
    assert all(item["unlocked"] is False for item in body["achievements"])


async def test_activity_stats_counts_posts_and_follows(api) -> None:
    headers = await make_user(
        api,
        email="alice.stats@example.com",
        password="CorrectHorse!2026",
        display_name="Alice",
        handle="alice.stats",
    )
    other_headers = await make_user(
        api,
        email="bob.stats@example.com",
        password="CorrectHorse!2026",
        display_name="Bob",
        handle="bob.stats",
    )
    post = await api.client.post(
        "/v1/social/posts",
        headers=headers,
        json={"kind": "text", "body": "Hello world", "lifecycle": "published"},
    )
    assert post.status_code == 201, post.text
    follow = await api.client.post("/v1/social/follows/bob.stats", headers=headers)
    assert follow.status_code == 200, follow.text

    stats = await api.client.get("/v1/me/activity-stats", headers=headers)
    assert stats.status_code == 200, stats.text
    body = stats.json()
    assert body["posts"] == 1
    assert body["following"] == 1
    assert body["followers"] == 0
    assert body["gifts_sent"] == 0
    assert body["gifts_received"] == 0
    assert body["stories"] == 0

    other_stats = await api.client.get("/v1/me/activity-stats", headers=other_headers)
    assert other_stats.status_code == 200, other_stats.text
    assert other_stats.json()["followers"] == 1


async def test_create_story_feed_visibility_and_view(api) -> None:
    author_headers = await make_user(
        api,
        email="author.story@example.com",
        password="CorrectHorse!2026",
        display_name="Author",
        handle="author.story",
    )
    friend_headers = await make_user(
        api,
        email="friend.story@example.com",
        password="CorrectHorse!2026",
        display_name="Friend",
        handle="friend.story",
    )
    stranger_headers = await make_user(
        api,
        email="stranger.story@example.com",
        password="CorrectHorse!2026",
        display_name="Stranger",
        handle="stranger.story",
    )
    await befriend(api, author_headers, friend_headers, "friend.story")

    create = await api.client.post(
        "/v1/stories",
        headers=author_headers,
        json={
            "visibility": "friends",
            "items": [
                {
                    "media_kind": "image",
                    "media_url": "https://cdn.example.com/story.jpg",
                    "duration_ms": 4000,
                },
                {"media_kind": "text", "body": "hello moment"},
            ],
        },
    )
    assert create.status_code == 201, create.text
    story = create.json()
    assert story["author"]["handle"] == "author.story"
    assert len(story["items"]) == 2
    assert story["items"][0]["media_kind"] == "image"
    assert story["items"][1]["media_kind"] == "text"
    assert story["viewed"] is False

    # Creating a story awards XP and unlocks the first_story achievement.
    progress = await api.client.get("/v1/me/progress", headers=author_headers)
    assert progress.status_code == 200, progress.text
    progress_body = progress.json()
    assert progress_body["xp"] > 0
    unlocked = {item["code"]: item["unlocked"] for item in progress_body["achievements"]}
    assert unlocked["first_story"] is True

    # GiftUserEligibility stays in sync with the progress system.
    async with api.app.state.session_factory() as session:
        eligibility = await session.get(
            GiftUserEligibility, uuid.UUID(story["author"]["user_id"])
        )
        assert eligibility is not None
        assert "first_story" in eligibility.achievements
        assert eligibility.level == progress_body["level"]

    # A friend sees the story in their feed.
    friend_feed = await api.client.get("/v1/stories/feed", headers=friend_headers)
    assert friend_feed.status_code == 200, friend_feed.text
    friend_feed_ids = [item["id"] for item in friend_feed.json()["items"]]
    assert story["id"] in friend_feed_ids

    # A stranger cannot see the friends-only story, in feed or by id.
    stranger_feed = await api.client.get("/v1/stories/feed", headers=stranger_headers)
    assert stranger_feed.status_code == 200, stranger_feed.text
    assert story["id"] not in [item["id"] for item in stranger_feed.json()["items"]]
    stranger_get = await api.client.get(f"/v1/stories/{story['id']}", headers=stranger_headers)
    assert stranger_get.status_code == 404

    # Recording a view is idempotent and flips the viewed flag for that viewer.
    view = await api.client.post(f"/v1/stories/{story['id']}/view", headers=friend_headers)
    assert view.status_code == 200, view.text
    assert view.json() == {"status": "viewed", "story_id": story["id"]}
    repeat_view = await api.client.post(f"/v1/stories/{story['id']}/view", headers=friend_headers)
    assert repeat_view.status_code == 200, repeat_view.text

    friend_fetch = await api.client.get(f"/v1/stories/{story['id']}", headers=friend_headers)
    assert friend_fetch.status_code == 200, friend_fetch.text
    assert friend_fetch.json()["viewed"] is True

    author_stats = await api.client.get("/v1/me/activity-stats", headers=author_headers)
    assert author_stats.status_code == 200, author_stats.text
    assert author_stats.json()["stories"] == 1


async def test_public_story_visible_to_non_friends(api) -> None:
    author_headers = await make_user(
        api,
        email="public.author@example.com",
        password="CorrectHorse!2026",
        display_name="PublicAuthor",
        handle="public.author",
    )
    viewer_headers = await make_user(
        api,
        email="public.viewer@example.com",
        password="CorrectHorse!2026",
        display_name="PublicViewer",
        handle="public.viewer",
    )
    create = await api.client.post(
        "/v1/stories",
        headers=author_headers,
        json={
            "visibility": "public",
            "items": [{"media_kind": "text", "body": "public moment"}],
        },
    )
    assert create.status_code == 201, create.text

    # Not followed and not friends: still invisible, since the feed graph is self + follows/friends.
    feed = await api.client.get("/v1/stories/feed", headers=viewer_headers)
    assert feed.status_code == 200, feed.text
    assert create.json()["id"] not in [item["id"] for item in feed.json()["items"]]

    follow = await api.client.post("/v1/social/follows/public.author", headers=viewer_headers)
    assert follow.status_code == 200, follow.text
    feed_after_follow = await api.client.get("/v1/stories/feed", headers=viewer_headers)
    assert feed_after_follow.status_code == 200, feed_after_follow.text
    assert create.json()["id"] in [item["id"] for item in feed_after_follow.json()["items"]]


async def test_story_item_validation_rejects_mismatched_media(api) -> None:
    headers = await make_user(
        api,
        email="invalid.story@example.com",
        password="CorrectHorse!2026",
        display_name="Invalid",
        handle="invalid.story",
    )
    response = await api.client.post(
        "/v1/stories",
        headers=headers,
        json={"visibility": "public", "items": [{"media_kind": "image"}]},
    )
    assert response.status_code == 422
