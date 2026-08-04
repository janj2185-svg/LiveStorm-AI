from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.models import (
    Role,
    SecurityAuditEvent,
    User,
    UserRole,
)
from app.social_models import (
    Block,
    Follow,
    Friendship,
    MessageEvent,
    ModerationAction,
    Notification,
    Post,
    PostLifecycle,
)
from tests.conftest import bearer, login, register_and_verify


async def social_user(
    api,
    *,
    email: str,
    password: str,
    display_name: str,
    handle: str,
    public: bool = True,
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
    if public:
        settings = await api.client.patch(
            "/v1/settings",
            headers=headers,
            json={"profile_visibility": "public"},
        )
        assert settings.status_code == 200, settings.text
    return tokens, headers


async def make_friends(
    api,
    requester_headers: dict[str, str],
    accepter_headers: dict[str, str],
    handle: str,
) -> str:
    requested = await api.client.post(f"/v1/social/friends/{handle}", headers=requester_headers)
    assert requested.status_code == 200, requested.text
    accepted = await api.client.post(
        f"/v1/social/friend-requests/{requested.json()['id']}/accept",
        headers=accepter_headers,
    )
    assert accepted.status_code == 200, accepted.text
    return requested.json()["id"]


async def test_handle_validation_reserved_and_uniqueness(api) -> None:
    await register_and_verify(api)
    tokens = await login(api)
    headers = bearer(tokens["access_token"])

    missing = await api.client.post(
        "/v1/social/communities",
        headers=headers,
        json={"slug": "without-handle", "name": "No handle"},
    )
    assert missing.status_code == 409
    assert missing.json()["code"] == "handle_required"

    reserved = await api.client.patch("/v1/profile", headers=headers, json={"handle": "admin"})
    assert reserved.status_code == 422
    uppercase = await api.client.patch("/v1/profile", headers=headers, json={"handle": "Member"})
    assert uppercase.status_code == 422
    valid = await api.client.patch("/v1/profile", headers=headers, json={"handle": "member.one"})
    assert valid.status_code == 200
    assert valid.json()["handle"] == "member.one"

    _, other_headers = await social_user(
        api,
        email="other@example.com",
        password="DistinctHorse!2026",
        display_name="Other",
        handle="other.one",
    )
    duplicate = await api.client.patch(
        "/v1/profile", headers=other_headers, json={"handle": "member.one"}
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "handle_unavailable"


async def test_social_mutation_rate_limit_uses_redis_window(api_factory) -> None:
    async with api_factory(post_rate_limit=1) as limited:
        _, headers = await social_user(
            limited,
            email="limited@example.com",
            password="CorrectHorse!2026",
            display_name="Limited",
            handle="limited.user",
        )
        first = await limited.client.post(
            "/v1/social/posts",
            headers=headers,
            json={"kind": "text", "body": "First allowed post"},
        )
        second = await limited.client.post(
            "/v1/social/posts",
            headers=headers,
            json={"kind": "text", "body": "Second limited post"},
        )
        assert first.status_code == 201
        assert second.status_code == 429
        assert second.json()["code"] == "rate_limit_exceeded"


async def test_private_follow_friendship_canonical_and_block_cleanup(api) -> None:
    _, first_headers = await social_user(
        api,
        email="first@example.com",
        password="DistinctHorse!2026",
        display_name="First",
        handle="first.user",
    )
    _, second_headers = await social_user(
        api,
        email="second@example.com",
        password="AnotherHorse!2026",
        display_name="Second",
        handle="second.user",
        public=False,
    )

    hidden = await api.client.get("/v1/social/profiles/second.user", headers=first_headers)
    assert hidden.status_code == 404
    requested = await api.client.post("/v1/social/follows/second.user", headers=first_headers)
    assert requested.status_code == 200
    assert requested.json()["status"] == "requested"
    accepted = await api.client.post(
        f"/v1/social/follow-requests/{requested.json()['id']}/accept",
        headers=second_headers,
    )
    assert accepted.status_code == 200
    visible = await api.client.get("/v1/social/profiles/second.user", headers=first_headers)
    assert visible.status_code == 200

    friendship = await api.client.post("/v1/social/friends/second.user", headers=first_headers)
    assert friendship.status_code == 200
    reverse = await api.client.post("/v1/social/friends/first.user", headers=second_headers)
    assert reverse.status_code == 200
    async with api.app.state.session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(Friendship)) == 1
    accepted_friend = await api.client.post(
        f"/v1/social/friend-requests/{reverse.json()['id']}/accept",
        headers=first_headers,
    )
    assert accepted_friend.status_code == 200

    blocked = await api.client.post("/v1/social/blocks/first.user", headers=second_headers)
    assert blocked.status_code == 200
    hidden_after_block = await api.client.get(
        "/v1/social/profiles/second.user", headers=first_headers
    )
    assert hidden_after_block.status_code == 404
    async with api.app.state.session_factory() as session:
        first = await session.scalar(select(User).where(User.email == "first@example.com"))
        second = await session.scalar(select(User).where(User.email == "second@example.com"))
        assert (
            await session.get(Block, {"blocker_id": second.id, "blocked_id": first.id}) is not None
        )
        assert await session.scalar(select(func.count()).select_from(Follow)) == 0
        assert await session.scalar(select(func.count()).select_from(Friendship)) == 0
        audit = await session.scalar(
            select(SecurityAuditEvent).where(SecurityAuditEvent.action == "social.user_blocked")
        )
        assert audit is not None


async def test_friend_reads_requests_cancel_suggestions_and_mutuals(api) -> None:
    _, alice_headers = await social_user(
        api,
        email="friend.alice@example.com",
        password="CorrectHorse!2026",
        display_name="Alice",
        handle="friend.alice",
    )
    _, bob_headers = await social_user(
        api,
        email="friend.bob@example.com",
        password="CorrectHorse!2026",
        display_name="Bob",
        handle="friend.bob",
    )
    _, carol_headers = await social_user(
        api,
        email="friend.carol@example.com",
        password="CorrectHorse!2026",
        display_name="Carol",
        handle="friend.carol",
    )
    _, dave_headers = await social_user(
        api,
        email="friend.dave@example.com",
        password="CorrectHorse!2026",
        display_name="Dave",
        handle="friend.dave",
    )
    _, erin_headers = await social_user(
        api,
        email="friend.erin@example.com",
        password="CorrectHorse!2026",
        display_name="Erin",
        handle="friend.erin",
    )
    _, faye_headers = await social_user(
        api,
        email="friend.faye@example.com",
        password="CorrectHorse!2026",
        display_name="Faye",
        handle="friend.faye",
    )
    _, blocked_headers = await social_user(
        api,
        email="friend.blocked@example.com",
        password="CorrectHorse!2026",
        display_name="Blocked",
        handle="friend.blocked",
    )

    await make_friends(api, alice_headers, bob_headers, "friend.bob")
    await make_friends(api, alice_headers, carol_headers, "friend.carol")
    await make_friends(api, bob_headers, carol_headers, "friend.carol")
    await make_friends(api, bob_headers, faye_headers, "friend.faye")
    await make_friends(api, bob_headers, blocked_headers, "friend.blocked")

    incoming = await api.client.post("/v1/social/friends/friend.alice", headers=dave_headers)
    assert incoming.status_code == 200, incoming.text
    outgoing = await api.client.post("/v1/social/friends/friend.erin", headers=alice_headers)
    assert outgoing.status_code == 200, outgoing.text
    assert erin_headers["Authorization"]

    blocked = await api.client.post("/v1/social/blocks/friend.blocked", headers=alice_headers)
    assert blocked.status_code == 200, blocked.text

    friends = await api.client.get("/v1/social/friends", headers=alice_headers)
    assert friends.status_code == 200, friends.text
    friends_by_handle = {item["handle"]: item for item in friends.json()}
    assert set(friends_by_handle) == {"friend.bob", "friend.carol"}
    assert friends_by_handle["friend.bob"]["friendship_id"]
    assert isinstance(friends_by_handle["friend.bob"]["online"], bool)
    assert "last_seen_at" in friends_by_handle["friend.bob"]

    requests = await api.client.get("/v1/social/friend-requests", headers=alice_headers)
    assert requests.status_code == 200, requests.text
    assert [item["handle"] for item in requests.json()["incoming"]] == ["friend.dave"]
    assert [item["handle"] for item in requests.json()["outgoing"]] == ["friend.erin"]

    cancelled = await api.client.delete(
        f"/v1/social/friend-requests/{outgoing.json()['id']}/cancel",
        headers=alice_headers,
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"
    after_cancel = await api.client.get("/v1/social/friend-requests", headers=alice_headers)
    assert after_cancel.status_code == 200
    assert after_cancel.json()["outgoing"] == []

    suggestions = await api.client.get("/v1/social/friends/suggestions", headers=alice_headers)
    assert suggestions.status_code == 200, suggestions.text
    suggestions_by_handle = {item["handle"]: item for item in suggestions.json()}
    assert suggestions_by_handle["friend.faye"]["mutual_count"] >= 1
    assert "friend.bob" not in suggestions_by_handle
    assert "friend.carol" not in suggestions_by_handle
    assert "friend.blocked" not in suggestions_by_handle

    mutuals = await api.client.get("/v1/social/friends/friend.bob/mutuals", headers=alice_headers)
    assert mutuals.status_code == 200, mutuals.text
    assert [item["handle"] for item in mutuals.json()] == ["friend.carol"]
    assert mutuals.json()[0]["friendship_id"] == friends_by_handle["friend.carol"]["friendship_id"]


async def test_community_private_join_roles_and_last_owner(api) -> None:
    _, owner_headers = await social_user(
        api,
        email="owner@example.com",
        password="CorrectHorse!2026",
        display_name="Owner",
        handle="community.owner",
    )
    _, member_headers = await social_user(
        api,
        email="joiner@example.com",
        password="CorrectHorse!2026",
        display_name="Joiner",
        handle="community.joiner",
    )
    created = await api.client.post(
        "/v1/social/communities",
        headers=owner_headers,
        json={
            "slug": "private-space",
            "name": "Private space",
            "visibility": "private",
        },
    )
    assert created.status_code == 201, created.text
    public = await api.client.post(
        "/v1/social/communities",
        headers=owner_headers,
        json={
            "slug": "public-builders",
            "name": "Public Builders",
            "description": "Build in public together",
            "visibility": "public",
        },
    )
    assert public.status_code == 201, public.text
    owner_browse = await api.client.get(
        "/v1/social/communities", headers=owner_headers, params={"limit": 1}
    )
    assert owner_browse.status_code == 200, owner_browse.text
    assert owner_browse.json()["has_more"] is True
    member_browse = await api.client.get("/v1/social/communities", headers=member_headers)
    assert member_browse.status_code == 200, member_browse.text
    assert [item["slug"] for item in member_browse.json()["items"]] == ["public-builders"]
    searched = await api.client.get(
        "/v1/social/communities",
        headers=member_headers,
        params={"q": "builders"},
    )
    assert searched.status_code == 200, searched.text
    assert searched.json()["items"][0]["name"] == "Public Builders"
    hidden = await api.client.get("/v1/social/communities/private-space", headers=member_headers)
    assert hidden.status_code == 404
    requested = await api.client.post(
        "/v1/social/communities/private-space/join", headers=member_headers
    )
    assert requested.status_code == 200
    assert requested.json()["status"] == "pending"
    approved = await api.client.post(
        f"/v1/social/communities/private-space/memberships/{requested.json()['id']}/approve",
        headers=owner_headers,
    )
    assert approved.status_code == 200
    channel = await api.client.post(
        "/v1/social/communities/private-space/channels",
        headers=owner_headers,
        json={"slug": "general", "name": "General"},
    )
    assert channel.status_code == 201
    channels = await api.client.get(
        "/v1/social/communities/private-space/channels",
        headers=member_headers,
    )
    assert channels.status_code == 200
    assert channels.json()[0]["slug"] == "general"
    updated_channel = await api.client.patch(
        f"/v1/social/communities/private-space/channels/{channel.json()['id']}",
        headers=owner_headers,
        json={"name": "General discussion"},
    )
    assert updated_channel.status_code == 200
    channel_message = await api.client.post(
        f"/v1/messages/channels/{channel.json()['id']}",
        headers=member_headers,
        json={"body": "Persisted community message"},
    )
    assert channel_message.status_code == 201
    channel_history = await api.client.get(
        f"/v1/messages/channels/{channel.json()['id']}",
        headers=owner_headers,
    )
    assert channel_history.status_code == 200
    assert channel_history.json()["items"][0]["body"] == "Persisted community message"
    owner_membership = created.json()
    assert owner_membership["viewer_role"] == "owner"
    async with api.app.state.session_factory() as session:
        from app.social_models import CommunityMembership

        owner = await session.scalar(select(User).where(User.email == "owner@example.com"))
        membership = await session.scalar(
            select(CommunityMembership).where(
                CommunityMembership.user_id == owner.id,
                CommunityMembership.community_id == uuid.UUID(created.json()["id"]),
            )
        )
        membership_id = membership.id
    last_owner = await api.client.delete(
        f"/v1/social/communities/private-space/memberships/{membership_id}",
        headers=owner_headers,
    )
    assert last_owner.status_code == 409
    assert last_owner.json()["code"] == "last_owner_required"


async def test_post_lifecycle_feed_cursor_mute_and_search_privacy(api) -> None:
    _, author_headers = await social_user(
        api,
        email="author@example.com",
        password="CorrectHorse!2026",
        display_name="Author",
        handle="post.author",
    )
    _, reader_headers = await social_user(
        api,
        email="reader@example.com",
        password="CorrectHorse!2026",
        display_name="Reader",
        handle="post.reader",
    )
    await api.client.post("/v1/social/follows/post.author", headers=reader_headers)

    draft = await api.client.post(
        "/v1/social/posts",
        headers=author_headers,
        json={"kind": "text", "body": "Cursor lifecycle content"},
    )
    assert draft.status_code == 201
    assert draft.json()["lifecycle"] == "draft"
    hidden = await api.client.get(f"/v1/social/posts/{draft.json()['id']}", headers=reader_headers)
    assert hidden.status_code == 404
    published = await api.client.post(
        f"/v1/social/posts/{draft.json()['id']}/publish", headers=author_headers
    )
    assert published.status_code == 200
    for number in range(2):
        response = await api.client.post(
            "/v1/social/posts",
            headers=author_headers,
            json={
                "kind": "text",
                "body": f"Cursor lifecycle content {number}",
                "lifecycle": "published",
                "category": "engineering",
            },
        )
        assert response.status_code == 201, response.text

    first_page = await api.client.get(
        "/v1/social/feed?mode=following&limit=2", headers=reader_headers
    )
    assert first_page.status_code == 200, first_page.text
    assert len(first_page.json()["items"]) == 2
    assert first_page.json()["next_cursor"]
    second_page = await api.client.get(
        "/v1/social/feed",
        headers=reader_headers,
        params={
            "mode": "following",
            "limit": 2,
            "cursor": first_page.json()["next_cursor"],
        },
    )
    assert second_page.status_code == 200
    assert len(second_page.json()["items"]) == 1
    tampered = await api.client.get(
        "/v1/social/feed",
        headers=reader_headers,
        params={"cursor": first_page.json()["next_cursor"] + "x"},
    )
    assert tampered.status_code == 400
    search = await api.client.get("/v1/social/search/posts?q=lifecycle", headers=reader_headers)
    assert search.status_code == 200
    assert len(search.json()["items"]) == 3
    muted = await api.client.post("/v1/social/mutes/post.author", headers=reader_headers)
    assert muted.status_code == 200
    empty_feed = await api.client.get("/v1/social/feed?mode=following", headers=reader_headers)
    assert empty_feed.json()["items"] == []


async def test_comments_reactions_reposts_bookmarks_polls_and_notifications(api) -> None:
    _, author_headers = await social_user(
        api,
        email="poller@example.com",
        password="CorrectHorse!2026",
        display_name="Poller",
        handle="poll.author",
    )
    _, voter_headers = await social_user(
        api,
        email="voter@example.com",
        password="CorrectHorse!2026",
        display_name="Voter",
        handle="poll.voter",
    )
    closes_at = (datetime.now(UTC) + timedelta(days=1)).isoformat()
    post = await api.client.post(
        "/v1/social/posts",
        headers=author_headers,
        json={
            "kind": "poll",
            "body": "Choose a deterministic option",
            "lifecycle": "published",
            "poll": {
                "options": [{"text": "One"}, {"text": "Two"}],
                "closes_at": closes_at,
            },
        },
    )
    assert post.status_code == 201, post.text
    post_id = post.json()["id"]
    option_id = post.json()["poll_options"][0]["id"]
    comment = await api.client.post(
        f"/v1/social/posts/{post_id}/comments",
        headers=voter_headers,
        json={"body": "A useful comment"},
    )
    assert comment.status_code == 201
    reply = await api.client.post(
        f"/v1/social/comments/{comment.json()['id']}/replies",
        headers=author_headers,
        json={"body": "A bounded reply"},
    )
    assert reply.status_code == 201
    too_deep = await api.client.post(
        f"/v1/social/comments/{reply.json()['id']}/replies",
        headers=voter_headers,
        json={"body": "Too deep"},
    )
    assert too_deep.status_code == 422
    reaction = await api.client.put(
        f"/v1/social/reactions/post/{post_id}",
        headers=voter_headers,
        json={"value": "like"},
    )
    assert reaction.status_code == 200
    assert (
        await api.client.post(f"/v1/social/posts/{post_id}/repost", headers=voter_headers)
    ).status_code == 200
    assert (
        await api.client.post(f"/v1/social/posts/{post_id}/bookmark", headers=voter_headers)
    ).status_code == 200
    vote = await api.client.post(
        f"/v1/social/polls/{post_id}/vote",
        headers=voter_headers,
        json={"option_id": option_id},
    )
    assert vote.status_code == 200
    bookmarks = await api.client.get("/v1/social/bookmarks", headers=voter_headers)
    assert [item["id"] for item in bookmarks.json()] == [post_id]
    refreshed = await api.client.get(f"/v1/social/posts/{post_id}", headers=voter_headers)
    assert refreshed.json()["reaction_count"] == 1
    assert refreshed.json()["repost_count"] == 1
    assert refreshed.json()["poll_options"][0]["vote_count"] == 1
    notifications = await api.client.get("/v1/social/notifications", headers=author_headers)
    assert notifications.status_code == 200
    assert {item["notification_type"] for item in notifications.json()["items"]} >= {
        "comment",
        "reaction",
        "repost",
    }
    read_all = await api.client.post("/v1/social/notifications/read-all", headers=author_headers)
    assert read_all.status_code == 200
    preference = await api.client.put(
        "/v1/social/notifications/mutes/reaction",
        headers=author_headers,
        json={"muted": True},
    )
    assert preference.status_code == 200
    muted_reaction = await api.client.put(
        f"/v1/social/reactions/post/{post_id}",
        headers=voter_headers,
        json={"value": "love"},
    )
    assert muted_reaction.status_code == 200
    async with api.app.state.session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(Notification)) >= 3
        latest_reaction = await session.scalar(
            select(Notification).where(
                Notification.notification_type == "reaction",
                Notification.muted_at.is_not(None),
            )
        )
        assert latest_reaction.muted_at is not None


async def test_direct_message_request_edit_delete_receipt_events_and_block(api) -> None:
    _, sender_headers = await social_user(
        api,
        email="sender@example.com",
        password="CorrectHorse!2026",
        display_name="Sender",
        handle="message.sender",
    )
    _, recipient_headers = await social_user(
        api,
        email="recipient@example.com",
        password="CorrectHorse!2026",
        display_name="Recipient",
        handle="message.recipient",
    )
    conversation = await api.client.post(
        "/v1/messages/conversations",
        headers=sender_headers,
        json={"recipient_handle": "message.recipient"},
    )
    assert conversation.status_code == 201, conversation.text
    assert conversation.json()["state"] == "request"
    conversation_id = conversation.json()["id"]
    message = await api.client.post(
        f"/v1/messages/conversations/{conversation_id}/messages",
        headers=sender_headers,
        json={"body": "Persisted request message"},
    )
    assert message.status_code == 201, message.text
    message_id = message.json()["id"]
    denied_reply = await api.client.post(
        f"/v1/messages/conversations/{conversation_id}/messages",
        headers=recipient_headers,
        json={"body": "Not accepted yet"},
    )
    assert denied_reply.status_code == 403
    accepted = await api.client.post(
        f"/v1/messages/conversations/{conversation_id}/accept",
        headers=recipient_headers,
    )
    assert accepted.status_code == 200
    reply = await api.client.post(
        f"/v1/messages/conversations/{conversation_id}/messages",
        headers=recipient_headers,
        json={"body": "Accepted reply"},
    )
    assert reply.status_code == 201
    edited = await api.client.patch(
        f"/v1/messages/{message_id}",
        headers=sender_headers,
        json={"body": "Edited request message"},
    )
    assert edited.status_code == 200
    receipt = await api.client.post(
        f"/v1/messages/conversations/{conversation_id}/read",
        headers=recipient_headers,
        json={"through_message_id": message_id},
    )
    assert receipt.status_code == 200
    history = await api.client.get(
        f"/v1/messages/conversations/{conversation_id}/messages?limit=1",
        headers=recipient_headers,
    )
    assert history.status_code == 200
    assert history.json()["next_cursor"]
    deleted = await api.client.delete(f"/v1/messages/{message_id}", headers=sender_headers)
    assert deleted.status_code == 200
    async with api.app.state.session_factory() as session:
        assert await session.scalar(select(func.count()).select_from(MessageEvent)) >= 8
    blocked = await api.client.post("/v1/social/blocks/message.sender", headers=recipient_headers)
    assert blocked.status_code == 200
    hidden = await api.client.get(
        f"/v1/messages/conversations/{conversation_id}/messages",
        headers=sender_headers,
    )
    assert hidden.status_code == 404


async def test_report_moderation_decision_is_audited_and_append_only(api) -> None:
    _, author_headers = await social_user(
        api,
        email="reported@example.com",
        password="CorrectHorse!2026",
        display_name="Reported",
        handle="reported.author",
    )
    _, reporter_headers = await social_user(
        api,
        email="reporter@example.com",
        password="CorrectHorse!2026",
        display_name="Reporter",
        handle="content.reporter",
    )
    _, moderator_headers = await social_user(
        api,
        email="moderator@example.com",
        password="CorrectHorse!2026",
        display_name="Moderator",
        handle="content.moderator",
    )
    post = await api.client.post(
        "/v1/social/posts",
        headers=author_headers,
        json={
            "kind": "text",
            "body": "Report target",
            "lifecycle": "published",
        },
    )
    report = await api.client.post(
        "/v1/social/reports",
        headers=reporter_headers,
        json={
            "target_type": "post",
            "target_id": post.json()["id"],
            "reason": "spam",
            "evidence": "Repeated unwanted promotion",
        },
    )
    assert report.status_code == 201, report.text
    async with api.app.state.session_factory() as session:
        moderator = await session.scalar(select(User).where(User.email == "moderator@example.com"))
        role = await session.scalar(select(Role).where(Role.name == "moderator"))
        session.add(
            UserRole(
                user_id=moderator.id,
                role_id=role.id,
                granted_by=moderator.id,
            )
        )
        await session.commit()
    queue = await api.client.get("/v1/social/moderation/reports", headers=moderator_headers)
    assert queue.status_code == 200
    assert queue.json()["items"][0]["id"] == report.json()["id"]
    decision = await api.client.post(
        f"/v1/social/moderation/reports/{report.json()['id']}/decision",
        headers=moderator_headers,
        json={
            "status": "resolved",
            "action": "hide_content",
            "notes": "Policy applied",
        },
    )
    assert decision.status_code == 200, decision.text
    assert decision.json()["status"] == "resolved"
    async with api.app.state.session_factory() as session:
        stored_post = await session.get(Post, uuid.UUID(post.json()["id"]))
        assert stored_post.lifecycle == PostLifecycle.archived
        action = await session.scalar(select(ModerationAction))
        assert action is not None
        audit = await session.scalar(
            select(SecurityAuditEvent).where(
                SecurityAuditEvent.action == "social.moderation_decision"
            )
        )
        assert audit is not None
