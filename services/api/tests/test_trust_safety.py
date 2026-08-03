from __future__ import annotations

import uuid

from sqlalchemy import select

from app.models import Role, SecurityAuditEvent, User, UserRole
from app.social_models import ModerationAction, Post, PostLifecycle
from tests.conftest import bearer, login, register_and_verify


async def trust_safety_user(
    api,
    *,
    email: str,
    display_name: str,
    handle: str,
    role: str | None = None,
) -> tuple[User, dict[str, str]]:
    await register_and_verify(api, email=email, display_name=display_name)
    tokens = await login(api, email=email)
    headers = bearer(tokens["access_token"])
    profile = await api.client.patch("/v1/profile", headers=headers, json={"handle": handle})
    assert profile.status_code == 200, profile.text
    settings = await api.client.patch(
        "/v1/settings",
        headers=headers,
        json={"profile_visibility": "public"},
    )
    assert settings.status_code == 200, settings.text
    user = await api.user(email)
    if role is not None:
        async with api.app.state.session_factory() as session:
            selected_role = await session.scalar(select(Role).where(Role.name == role))
            assert selected_role is not None
            session.add(UserRole(user_id=user.id, role_id=selected_role.id, granted_by=user.id))
            await session.commit()
    return user, headers


async def test_trust_safety_report_queue_escalate_resolve_and_appeal(api) -> None:
    author, author_headers = await trust_safety_user(
        api,
        email="ts-author@example.com",
        display_name="TS Author",
        handle="ts.author",
    )
    _, reporter_headers = await trust_safety_user(
        api,
        email="ts-reporter@example.com",
        display_name="TS Reporter",
        handle="ts.reporter",
    )
    _, moderator_headers = await trust_safety_user(
        api,
        email="ts-moderator@example.com",
        display_name="TS Moderator",
        handle="ts.moderator",
        role="moderator",
    )

    post = await api.client.post(
        "/v1/social/posts",
        headers=author_headers,
        json={"kind": "text", "body": "Trust safety report target", "lifecycle": "published"},
    )
    assert post.status_code == 201, post.text
    report = await api.client.post(
        "/v1/social/reports",
        headers=reporter_headers,
        json={
            "target_type": "post",
            "target_id": post.json()["id"],
            "reason": "harassment",
            "evidence": "Repeated abusive comments",
        },
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]

    denied = await api.client.get("/v1/trust-safety/reports", headers=reporter_headers)
    assert denied.status_code == 403
    queue = await api.client.get("/v1/trust-safety/reports", headers=moderator_headers)
    assert queue.status_code == 200, queue.text
    assert queue.json()["items"][0]["id"] == report_id

    escalated = await api.client.post(
        f"/v1/trust-safety/reports/{report_id}/escalate",
        headers=moderator_headers,
        json={"notes": "Needs senior review"},
    )
    assert escalated.status_code == 200, escalated.text
    assert escalated.json()["status"] == "reviewing"

    appeal = await api.client.post(
        "/v1/trust-safety/appeals",
        headers=author_headers,
        json={
            "report_id": report_id,
            "statement": "This report needs a second look from support.",
        },
    )
    assert appeal.status_code == 202, appeal.text
    assert appeal.json()["status"] == "received"
    assert appeal.json()["persisted"] is False

    resolved = await api.client.post(
        f"/v1/trust-safety/reports/{report_id}/resolve",
        headers=moderator_headers,
        json={"status": "resolved", "action": "hide_content", "notes": "Policy applied"},
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["status"] == "resolved"

    async with api.app.state.session_factory() as session:
        stored_post = await session.get(Post, uuid.UUID(post.json()["id"]))
        assert stored_post is not None
        assert stored_post.lifecycle == PostLifecycle.archived
        actions = (
            await session.scalars(
                select(ModerationAction).order_by(ModerationAction.created_at.asc())
            )
        ).all()
        assert [action.action for action in actions] == ["escalate", "hide_content"]
        audit_actions = set(
            (
                await session.scalars(
                    select(SecurityAuditEvent.action).where(
                        SecurityAuditEvent.actor_user_id.in_([author.id, actions[0].moderator_id])
                    )
                )
            ).all()
        )
        assert "trust_safety.report_escalated" in audit_actions
        assert "trust_safety.report_decision" in audit_actions
        assert "trust_safety.appeal_received" in audit_actions


async def test_trust_safety_ai_moderation_assist_reports_unavailable(api) -> None:
    _, moderator_headers = await trust_safety_user(
        api,
        email="ts-ai-moderator@example.com",
        display_name="TS AI Moderator",
        handle="ts.ai.mod",
        role="moderator",
    )

    response = await api.client.post(
        "/v1/trust-safety/ai/moderate",
        headers=moderator_headers,
        json={"text": "Please classify this moderation sample."},
    )

    assert response.status_code == 200, response.text
    assert response.json()["available"] is False
    assert response.json()["unavailable_code"] == "ai_consent_required"
