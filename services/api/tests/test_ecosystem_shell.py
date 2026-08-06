from __future__ import annotations

import uuid

from sqlalchemy import select

from app.progress_models import UserAchievement, UserProgress
from app.social_models import Story, StoryView
from tests.conftest import bearer, login, register_and_verify


async def ecosystem_user(
    api,
    *,
    email: str,
    password: str,
    display_name: str,
    handle: str,
) -> tuple[dict[str, str], dict[str, str]]:
    await register_and_verify(
        api,
        email=email,
        password=password,
        display_name=display_name,
    )
    tokens = await login(api, email=email, password=password)
    headers = bearer(tokens["access_token"])
    profile = await api.client.patch("/v1/profile", headers=headers, json={"handle": handle})
    assert profile.status_code == 200, profile.text
    settings = await api.client.patch(
        "/v1/settings",
        headers=headers,
        json={"profile_visibility": "public"},
    )
    assert settings.status_code == 200, settings.text
    return tokens, headers


async def test_global_search_aggregates_sections(api) -> None:
    _, headers = await ecosystem_user(
        api,
        email="searcher@example.com",
        password="CorrectHorse!2026",
        display_name="Searcher",
        handle="searcher.one",
    )
    _, other_headers = await ecosystem_user(
        api,
        email="found@example.com",
        password="CorrectHorse!2026",
        display_name="Found Light",
        handle="found.light",
    )
    post = await api.client.post(
        "/v1/social/posts",
        headers=other_headers,
        json={"kind": "text", "body": "Radiant aurora notes", "lifecycle": "published"},
    )
    assert post.status_code == 201, post.text
    community = await api.client.post(
        "/v1/social/communities",
        headers=other_headers,
        json={
            "slug": "aurora-circle",
            "name": "Aurora Circle",
            "description": "Soft light community",
            "visibility": "public",
        },
    )
    assert community.status_code == 201, community.text

    response = await api.client.get("/v1/search?q=aurora&limit=10", headers=headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["query"] == "aurora"
    types = {section["type"] for section in body["sections"]}
    assert "users" in types or "posts" in types or "communities" in types
    assert any(section["items"] for section in body["sections"])

    unauthorized = await api.client.get("/v1/search?q=aurora")
    assert unauthorized.status_code == 401


async def test_stories_create_feed_view_delete(api) -> None:
    _, author_headers = await ecosystem_user(
        api,
        email="story.author@example.com",
        password="CorrectHorse!2026",
        display_name="Story Author",
        handle="story.author",
    )
    _, viewer_headers = await ecosystem_user(
        api,
        email="story.viewer@example.com",
        password="CorrectHorse!2026",
        display_name="Story Viewer",
        handle="story.viewer",
    )

    follow = await api.client.post(
        "/v1/social/follows/story.author",
        headers=viewer_headers,
    )
    assert follow.status_code in {200, 201}, follow.text

    created = await api.client.post(
        "/v1/social/stories",
        headers=author_headers,
        json={
            "media_url": "https://cdn.example.com/stories/morning.jpg",
            "caption": "Morning light",
        },
    )
    assert created.status_code == 201, created.text
    story = created.json()
    assert story["media_url"].startswith("https://")
    assert story["caption"] == "Morning light"
    story_id = story["id"]
    story_uuid = uuid.UUID(story_id)

    insecure = await api.client.post(
        "/v1/social/stories",
        headers=author_headers,
        json={"media_url": "http://cdn.example.com/stories/bad.jpg"},
    )
    assert insecure.status_code == 422

    feed = await api.client.get("/v1/social/stories", headers=viewer_headers)
    assert feed.status_code == 200, feed.text
    groups = feed.json()["groups"]
    assert len(groups) >= 1
    assert any(
        item["id"] == story_id for group in groups for item in group["stories"]
    )

    viewed = await api.client.post(
        f"/v1/social/stories/{story_id}/view",
        headers=viewer_headers,
    )
    assert viewed.status_code == 200, viewed.text
    assert viewed.json()["story_id"] == story_id

    async with api.app.state.session_factory() as session:
        view = await session.scalar(
            select(StoryView).where(StoryView.story_id == story_uuid)
        )
        assert view is not None

    deleted = await api.client.delete(
        f"/v1/social/stories/{story_id}",
        headers=author_headers,
    )
    assert deleted.status_code == 200, deleted.text

    feed_after = await api.client.get("/v1/social/stories", headers=viewer_headers)
    assert feed_after.status_code == 200
    assert all(
        item["id"] != story_id
        for group in feed_after.json()["groups"]
        for item in group["stories"]
    )

    async with api.app.state.session_factory() as session:
        story_row = await session.get(Story, story_uuid)
        assert story_row is not None
        assert story_row.deleted_at is not None


async def test_profile_progress_and_xp_on_publish(api) -> None:
    _, headers = await ecosystem_user(
        api,
        email="progress@example.com",
        password="CorrectHorse!2026",
        display_name="Progress User",
        handle="progress.user",
    )

    before = await api.client.get("/v1/profile/progress", headers=headers)
    assert before.status_code == 200, before.text
    before_body = before.json()
    assert before_body["xp"] == 0
    assert before_body["level"] == 1
    assert before_body["xp_to_next"] == 100
    assert any(item["code"] == "first_post" for item in before_body["achievements_available"])

    post = await api.client.post(
        "/v1/social/posts",
        headers=headers,
        json={"kind": "text", "body": "First published light", "lifecycle": "published"},
    )
    assert post.status_code == 201, post.text

    after = await api.client.get("/v1/profile/progress", headers=headers)
    assert after.status_code == 200, after.text
    after_body = after.json()
    assert after_body["xp"] >= 25
    assert any(item["code"] == "first_post" for item in after_body["achievements_earned"])

    user = await api.user("progress@example.com")
    async with api.app.state.session_factory() as session:
        progress = await session.get(UserProgress, user.id)
        assert progress is not None
        assert progress.xp >= 25
        achievement = await session.scalar(
            select(UserAchievement).where(
                UserAchievement.user_id == user.id,
                UserAchievement.achievement_code == "first_post",
            )
        )
        assert achievement is not None


async def test_aura_status_and_pulse(api) -> None:
    _, headers = await ecosystem_user(
        api,
        email="aura@example.com",
        password="CorrectHorse!2026",
        display_name="Aura User",
        handle="aura.user",
    )

    status = await api.client.get("/v1/ai/aura/status", headers=headers)
    assert status.status_code == 200, status.text
    status_body = status.json()
    assert status_body["name"] == "Aura"
    assert "light" in status_body["tagline"].lower()
    assert "chat_available" in status_body["capabilities"]
    assert status_body["capabilities"]["chat_available"] is False

    pulse = await api.client.post("/v1/ai/aura/pulse", headers=headers)
    assert pulse.status_code == 200, pulse.text
    pulse_body = pulse.json()
    assert pulse_body["name"] == "Aura"
    assert pulse_body["llm_enriched"] is False
    assert "pulse_text" in pulse_body
    assert "Aura" in pulse_body["pulse_text"] or "light" in pulse_body["pulse_text"].lower()
    counts = pulse_body["counts"]
    assert counts["unread_notifications"] >= 0
    assert counts["pending_friend_requests"] >= 0
    assert counts["wallet_spendable_minor"] >= 0
    assert counts["active_live_sessions_following"] >= 0
    assert counts["learning_enrollments"] >= 0
    assert isinstance(pulse_body["suggested_actions"], list)
    assert pulse_body["suggested_actions"], "Aura pulse must suggest at least one action"
    assert any(
        action["route"].startswith("/") and not action["route"].startswith("/v1/")
        for action in pulse_body["suggested_actions"]
    )
