from __future__ import annotations

from typing import Any

import pytest

from tests.conftest import bearer, login, register_and_verify


async def _headers(
    api: Any,
    *,
    email: str,
    display_name: str,
) -> dict[str, str]:
    await register_and_verify(api, email=email, display_name=display_name)
    tokens = await login(api, email=email)
    return bearer(tokens["access_token"])


@pytest.mark.asyncio
async def test_conference_create_join_leave_and_media_fail_closed(api_factory: Any) -> None:
    async with api_factory() as api:
        host_headers = await _headers(
            api,
            email="conference-host@example.com",
            display_name="Conference Host",
        )
        guest_headers = await _headers(
            api,
            email="conference-guest@example.com",
            display_name="Conference Guest",
        )

        created = await api.client.post(
            "/v1/conferences",
            headers=host_headers,
            json={"title": "Business planning room", "purpose": "business"},
        )
        assert created.status_code == 201, created.text
        room = created.json()
        assert room["purpose"] == "business"
        assert room["status"] == "scheduled"
        assert room["is_host"] is True
        assert room["joined"] is True
        assert room["join_code"]

        media = await api.client.get(
            f"/v1/conferences/{room['id']}/media-credentials",
            headers=host_headers,
        )
        assert media.status_code == 200, media.text
        media_body = media.json()
        assert media_body["status"] == "awaiting_media_plane"
        assert media_body["reason"] == "mediamtx_control_unconfigured"
        assert media_body["whip_url"] is None
        assert media_body["bearer_token"] is None
        assert media_body["token_expires_in_seconds"] == 0

        joined = await api.client.post(
            f"/v1/conferences/{room['id']}/join",
            headers=guest_headers,
        )
        assert joined.status_code == 200, joined.text
        joined_room = joined.json()["conference"]
        assert joined_room["status"] == "live"
        assert joined_room["joined"] is True
        assert joined_room["active_participant_count"] == 1

        guest_mine = await api.client.get("/v1/conferences", headers=guest_headers)
        assert guest_mine.status_code == 200
        assert [item["id"] for item in guest_mine.json()] == [room["id"]]

        left = await api.client.post(
            f"/v1/conferences/{room['id']}/leave",
            headers=guest_headers,
        )
        assert left.status_code == 200, left.text
        assert left.json()["joined"] is False
        assert left.json()["conference"]["active_participant_count"] == 0

        after_leave = await api.client.get("/v1/conferences", headers=guest_headers)
        assert after_leave.status_code == 200
        assert after_leave.json() == []
