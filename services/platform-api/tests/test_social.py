import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, *, email: str, handle: str, name: str) -> dict:
    response = await client.post(
        "/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePass123!",
            "handle": handle,
            "display_name": name,
            "locale": "en",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_social_flow_user_a_posts_user_b_reacts_and_notified(client: AsyncClient) -> None:
    user_a = await _register(client, email="alice@example.com", handle="alice", name="Alice")
    user_b = await _register(client, email="bob@example.com", handle="bob", name="Bob")

    post = await client.post(
        "/v1/posts",
        headers=_auth(user_a["access_token"]),
        json={"body": "Hello SYLORA from Alice!"},
    )
    assert post.status_code == 201
    post_id = post.json()["id"]

    follow = await client.post(
        "/v1/users/alice/follow",
        headers=_auth(user_b["access_token"]),
    )
    assert follow.status_code == 204

    feed = await client.get("/v1/feed", headers=_auth(user_b["access_token"]))
    assert feed.status_code == 200
    assert any(item["id"] == post_id for item in feed.json()["items"])

    react = await client.post(
        "/v1/reactions",
        headers=_auth(user_b["access_token"]),
        json={"target_type": "post", "target_id": post_id, "kind": "like"},
    )
    assert react.status_code == 200
    assert react.json()["reacted"] is True

    comment = await client.post(
        f"/v1/posts/{post_id}/comments",
        headers=_auth(user_b["access_token"]),
        json={"body": "Great first post!"},
    )
    assert comment.status_code == 201

    notifications = await client.get("/v1/notifications", headers=_auth(user_a["access_token"]))
    assert notifications.status_code == 200
    body = notifications.json()
    assert body["unread_count"] >= 2
    types = {item["type"] for item in body["items"]}
    assert "follow" in types
    assert "reaction" in types
    assert "comment" in types

    explore = await client.get("/v1/explore", headers=_auth(user_b["access_token"]))
    assert explore.status_code == 200
    assert len(explore.json()["items"]) >= 1

    search = await client.get(
        "/v1/search?q=SYLORA",
        headers=_auth(user_b["access_token"]),
    )
    assert search.status_code == 200
    assert len(search.json()["posts"]) >= 1
