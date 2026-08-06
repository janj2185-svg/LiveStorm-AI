import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_login_refresh_logout_flow(client: AsyncClient) -> None:
    register_payload = {
        "email": "creator@example.com",
        "password": "SecurePass123!",
        "handle": "creator_one",
        "display_name": "Creator One",
        "locale": "uk",
    }
    register = await client.post("/v1/auth/register", json=register_payload)
    assert register.status_code == 201, register.text
    body = register.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["handle"] == "creator_one"
    assert body["user"]["email_verified"] is False
    assert body["dev_verification_token"]

    access_token = body["access_token"]
    refresh_token = body["refresh_token"]

    me = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "creator@example.com"

    verify = await client.post(
        "/v1/auth/verify-email",
        json={"token": body["dev_verification_token"]},
    )
    assert verify.status_code == 200
    assert verify.json()["email_verified"] is True

    profile_update = await client.patch(
        "/v1/profile/me",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"bio": "Building SYLORA", "display_name": "Creator SYLORA"},
    )
    assert profile_update.status_code == 200
    assert profile_update.json()["bio"] == "Building SYLORA"

    refreshed = await client.post("/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    new_refresh = refreshed.json()["refresh_token"]

    logout = await client.post("/v1/auth/logout", json={"refresh_token": new_refresh})
    assert logout.status_code == 204

    login = await client.post(
        "/v1/auth/login",
        json={"email": "creator@example.com", "password": "SecurePass123!"},
    )
    assert login.status_code == 200
    assert login.json()["user"]["display_name"] == "Creator SYLORA"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient) -> None:
    payload = {
        "email": "dup@example.com",
        "password": "SecurePass123!",
        "handle": "dup_user",
        "display_name": "Dup",
    }
    first = await client.post("/v1/auth/register", json=payload)
    assert first.status_code == 201

    payload["handle"] = "dup_user2"
    second = await client.post("/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert second.json()["detail"]["code"] == "email_taken"
