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
async def test_forgot_and_reset_password(client: AsyncClient) -> None:
    user = await _register(client, email="reset@example.com", handle="resetuser", name="Reset User")

    forgot = await client.post("/v1/auth/forgot-password", json={"email": "reset@example.com"})
    assert forgot.status_code == 200
    dev_token = forgot.json().get("dev_reset_token")
    assert dev_token

    reset = await client.post(
        "/v1/auth/reset-password",
        json={"token": dev_token, "password": "NewSecurePass456!"},
    )
    assert reset.status_code == 204

    login_old = await client.post(
        "/v1/auth/login",
        json={"email": "reset@example.com", "password": "SecurePass123!"},
    )
    assert login_old.status_code == 401

    login_new = await client.post(
        "/v1/auth/login",
        json={"email": "reset@example.com", "password": "NewSecurePass456!"},
    )
    assert login_new.status_code == 200


@pytest.mark.asyncio
async def test_admin_stats_requires_admin(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_BOOTSTRAP_EMAIL", "admin@example.com")
    from platform_api.config import get_settings

    get_settings.cache_clear()

    admin = await _register(client, email="admin@example.com", handle="adminuser", name="Admin")
    regular = await _register(client, email="user2@example.com", handle="user2", name="User")

    denied = await client.get("/v1/admin/stats", headers=_auth(regular["access_token"]))
    assert denied.status_code == 403

    allowed = await client.get("/v1/admin/stats", headers=_auth(admin["access_token"]))
    assert allowed.status_code == 200
    assert allowed.json()["users_total"] >= 2
