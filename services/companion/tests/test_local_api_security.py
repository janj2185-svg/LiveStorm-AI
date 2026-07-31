from __future__ import annotations

import time
from pathlib import Path

import pytest
from conftest import MemorySecretStore, TestOBSTransport, mode
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from sylora_companion.app import create_app
from sylora_companion.config import ConfigurationError, Settings
from sylora_companion.events import EventBus
from sylora_companion.obs import OBSClient
from sylora_companion.security import LocalTokenManager, SecretStore


def build_app(tmp_path: Path) -> tuple[TestClient, str, TestOBSTransport]:
    transport = TestOBSTransport(responses={"StartStream": {}})

    async def factory() -> TestOBSTransport:
        return transport

    obs = OBSClient(factory, "", EventBus(), request_timeout=0.2)
    store = MemorySecretStore()
    settings = Settings(
        state_dir=tmp_path,
        allowed_hosts=("testserver", "127.0.0.1"),
        rate_limit_per_minute=1000,
    )
    app = create_app(settings, obs=obs, secret_store=store)  # type: ignore[arg-type]
    token = app.state.tokens.load_or_create()
    return TestClient(app, client=("127.0.0.1", 50000)), token, transport


def test_local_token_auth_host_validation_and_health(tmp_path: Path) -> None:
    client, token, _ = build_app(tmp_path)
    with client:
        assert client.get("/health/live").json() == {"status": "live"}
        assert client.get("/v1/status").status_code == 401
        response = client.get(
            "/v1/status",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json()["cloud"]["state"] == "unpaired"
        rejected = client.get(
            "/v1/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Host": "attacker.example",
            },
        )
        assert rejected.status_code == 400
        assert client.get("/metrics").status_code == 401


def test_websocket_requires_bearer_header(tmp_path: Path) -> None:
    client, _, _ = build_app(tmp_path)
    with client, pytest.raises(WebSocketDisconnect) as caught:
        with client.websocket_connect("/v1/events"):
            raise AssertionError("unauthenticated WebSocket connected")
    assert caught.value.code == 4401


def test_strict_body_cors_and_real_obs_response_path(tmp_path: Path) -> None:
    client, token, transport = build_app(tmp_path)
    headers = {
        "Authorization": f"Bearer {token}",
        "Origin": "http://127.0.0.1:5173",
    }
    with client:
        for _ in range(50):
            if client.get("/health/ready").status_code == 200:
                break
            time.sleep(0.002)
        response = client.post("/v1/obs/stream/start", headers=headers)
        assert response.status_code == 200
        assert response.json() == {}
        assert response.headers["access-control-allow-origin"] == headers["Origin"]
        assert any(
            message.get("d", {}).get("requestType") == "StartStream"
            for message in transport.sent
        )
        invalid = client.put(
            "/v1/obs/scenes/current",
            headers=headers,
            json={"sceneName": "Live", "unknown": True},
        )
        assert invalid.status_code == 422
        disallowed_origin = client.get(
            "/v1/status",
            headers={
                "Authorization": f"Bearer {token}",
                "Origin": "https://attacker.example",
            },
        )
        assert "access-control-allow-origin" not in disallowed_origin.headers


def test_fallback_secret_file_is_permission_0600(tmp_path: Path) -> None:
    store = SecretStore(tmp_path)
    manager = LocalTokenManager(store)
    token = manager.rotate()
    assert manager.verify(token)
    assert not manager.verify(f"{token}x")
    assert mode(tmp_path / "local-api-token.secret") == 0o600


def test_non_loopback_bind_requires_all_lan_controls(tmp_path: Path) -> None:
    with pytest.raises(ConfigurationError, match="non-loopback bind refused"):
        Settings(bind_host="0.0.0.0", state_dir=tmp_path)  # noqa: S104
    with pytest.raises(ConfigurationError, match="TLS_CERT"):
        Settings(bind_host="192.168.1.10", allow_lan=True, state_dir=tmp_path)
    certificate = tmp_path / "certificate.pem"
    key = tmp_path / "key.pem"
    certificate.write_text("test certificate", encoding="utf-8")
    key.write_text("test key", encoding="utf-8")
    key.chmod(0o600)
    configured = Settings(
        bind_host="192.168.1.10",
        allow_lan=True,
        tls_cert=certificate,
        tls_key=key,
        lan_cidrs=("192.168.1.40/32",),
        allowed_hosts=("companion.local",),
        state_dir=tmp_path,
    )
    assert configured.allow_lan
