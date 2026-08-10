from __future__ import annotations

import os

from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+pysqlite:////tmp/sylora2-test.db"
os.environ["INTERNAL_API_SECRET"] = "test-secret"

from app.db import init_db  # noqa: E402
from app.main import app  # noqa: E402

init_db()
client = TestClient(app)
HEADERS = {
    "X-Sylora-User-Id": "user-1",
    "X-Sylora-Internal-Secret": "test-secret",
}


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_personal_ai_chat_memory_actions_marketplace_developer() -> None:
    dash = client.get("/v1/personal-ai", headers=HEADERS)
    assert dash.status_code == 200
    assert dash.json()["agent"]["display_name"] == "Sylora"

    chat = client.post(
        "/v1/personal-ai/chat",
        headers=HEADERS,
        json={"content": "хаха привіт, розкажи хто ти", "locale": "uk"},
    )
    assert chat.status_code == 200
    body = chat.json()
    assert "Sylora" in body["reply"] or "sylora" in body["reply"].lower() or body["reply"]
    assert body["emotion"]["laughter_ready"] is True

    mem = client.post(
        "/v1/personal-ai/memory",
        headers=HEADERS,
        json={"tier": "long_term", "content": "Любить Flutter"},
    )
    assert mem.status_code == 201

    identity = client.patch(
        "/v1/identity",
        headers=HEADERS,
        json={
            "username": "ivan",
            "privacy_level": "followers",
            "skills": ["Flutter", "AI"],
        },
    )
    assert identity.status_code == 200
    assert identity.json()["privacy_level"] == "followers"

    node = client.post(
        "/v1/knowledge/nodes",
        headers=HEADERS,
        json={
            "kind": "project",
            "external_id": "p1",
            "label": "Sylora Core",
            "privacy_level": "private",
        },
    )
    assert node.status_code == 201

    action = client.post(
        "/v1/actions",
        headers=HEADERS,
        json={
            "action_type": "prepare_live_outline",
            "permission_level": "REQUEST_CONFIRMATION",
            "input_payload": {"topic": "AI"},
        },
    )
    assert action.status_code == 201
    confirmed = client.post(
        f"/v1/actions/{action.json()['id']}/confirm",
        headers=HEADERS,
        params={"approve": True},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["state"] == "approved"

    market = client.get("/v1/marketplace/agents")
    assert market.status_code == 200
    assert len(market.json()) >= 3
    agent_id = market.json()[0]["id"]
    installed = client.post(
        f"/v1/marketplace/agents/{agent_id}/install",
        headers=HEADERS,
        json={"granted_permissions": ["live_moderate"]},
    )
    assert installed.status_code == 201

    denied = client.post(
        "/v1/actions",
        headers=HEADERS,
        json={
            "action_type": "publish_post",
            "permission_level": "EXECUTE_ALLOWED",
            "input_payload": {},
        },
    )
    assert denied.status_code == 403

    app_row = client.post(
        "/v1/developer/apps",
        headers=HEADERS,
        json={"name": "Partner App", "scopes": ["identity:read"], "sandbox": True},
    )
    assert app_row.status_code == 201
    assert app_row.json()["api_key"].startswith("syl_")
