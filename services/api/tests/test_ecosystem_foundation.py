from __future__ import annotations

from typing import Any

import pytest

from app.ecosystem_models import ActionPermissionLevel, ActionState, IdentityPrivacyLevel
from tests.conftest import bearer, login, register_and_verify


@pytest.mark.asyncio
async def test_personal_ai_dashboard_knowledge_and_actions(api: Any) -> None:
    email = "ecosystem-phase1@example.com"
    await register_and_verify(api, email=email)
    headers = bearer((await login(api, email=email))["access_token"])

    dashboard = await api.client.get("/v1/personal-ai", headers=headers)
    assert dashboard.status_code == 200, dashboard.text
    body = dashboard.json()
    assert body["agent"]["display_name"] == "Sylora"
    assert "profile_context" in body["access_scopes"]
    assert isinstance(body["what_ai_knows"], list)
    assert body["recent_activity"]

    privacy = await api.client.patch(
        "/v1/identity/privacy",
        headers=headers,
        json={"identity_privacy_level": IdentityPrivacyLevel.followers.value},
    )
    assert privacy.status_code == 200, privacy.text
    assert privacy.json()["identity_privacy_level"] == "followers"

    node = await api.client.post(
        "/v1/knowledge/nodes",
        headers=headers,
        json={
            "kind": "project",
            "external_id": "proj-1",
            "label": "My first project",
            "privacy_level": "private",
            "properties": {"status": "active"},
        },
    )
    assert node.status_code == 201, node.text
    node_id = node.json()["id"]

    node_b = await api.client.post(
        "/v1/knowledge/nodes",
        headers=headers,
        json={
            "kind": "skill",
            "external_id": "flutter",
            "label": "Flutter",
            "privacy_level": "connections",
        },
    )
    assert node_b.status_code == 201, node_b.text

    edge = await api.client.post(
        "/v1/knowledge/edges",
        headers=headers,
        json={
            "source_node_id": node_id,
            "target_node_id": node_b.json()["id"],
            "relation": "uses_skill",
            "privacy_level": "private",
        },
    )
    assert edge.status_code == 201, edge.text

    action = await api.client.post(
        "/v1/actions",
        headers=headers,
        json={
            "action_type": "prepare_live_outline",
            "permission_level": ActionPermissionLevel.request_confirmation.value,
            "input_payload": {"topic": "AI creators"},
        },
    )
    assert action.status_code == 201, action.text
    assert action.json()["state"] == ActionState.awaiting_confirmation.value

    confirmed = await api.client.post(
        f"/v1/actions/{action.json()['id']}/confirm",
        headers=headers,
        params={"approve": True},
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["state"] == ActionState.approved.value

    # EXECUTE_ALLOWED without permission must fail closed.
    denied = await api.client.post(
        "/v1/actions",
        headers=headers,
        json={
            "action_type": "publish_post",
            "permission_level": ActionPermissionLevel.execute_allowed.value,
            "input_payload": {"text": "hello"},
        },
    )
    assert denied.status_code == 403
