"""Aura presence endpoint smoke test."""

from __future__ import annotations

import pytest

from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member


@pytest.mark.asyncio
async def test_aura_presence(api: APIHarness) -> None:
    _, tokens = await create_member(api, email="aura-presence@example.com", display_name="Aura Fan")
    response = await api.client.get(
        "/v1/ai/aura/presence",
        headers=bearer(tokens["access_token"]),
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["emotion"] in {
        "idle",
        "greeting",
        "listening",
        "thinking",
        "speaking",
        "amused",
        "focused",
        "delighted",
        "thoughtful",
        "supportive",
    }
    assert "personality" in body
    assert body["voice_ready"] == body["voice_output_ready"]
    assert body["voice_input_ready"] == body["transcription_ready"]
    assert isinstance(body["transcription_ready"], bool)
    assert isinstance(body["avatar_ready"], bool)
    assert body["avatar_job_status"] is None
    assert isinstance(body["recommendations"], list)
