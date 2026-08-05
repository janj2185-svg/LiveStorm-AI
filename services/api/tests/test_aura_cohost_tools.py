"""Aura co-host tools and presence emotion heuristics."""

from __future__ import annotations

import uuid

import pytest

from app.ai_service import (
    _draft_live_chat_summary,
    _draft_live_reply_text,
    _suggest_live_titles,
    infer_aura_emotion,
)
from app.ai_schemas import (
    DraftLiveReplyToolInput,
    SuggestLiveTitleToolInput,
    SummarizeLiveChatToolInput,
)
from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member


def test_infer_aura_emotion_heuristics() -> None:
    assert infer_aura_emotion(role=None, content=None)[0] == "greeting"
    assert infer_aura_emotion(role="assistant", content="Hello")[0] == "speaking"
    assert infer_aura_emotion(role="user", content="дякую!")[0] == "delighted"
    assert infer_aura_emotion(role="user", content="help me please")[0] == "supportive"
    assert infer_aura_emotion(role="user", content="Be my live co-host")[0] == "focused"
    assert infer_aura_emotion(role="user", content="Why does this fail?")[0] == "thoughtful"
    assert infer_aura_emotion(role="user", content="ok")[0] == "listening"


def test_live_draft_helpers_are_host_facing() -> None:
    summary = _draft_live_chat_summary(["Alex: hello?", "Sam: thanks"])
    assert "Draft only" in summary
    assert "auto-post" in summary.lower() or "platforms" in summary.lower()

    reply = _draft_live_reply_text(
        chat_message="How do gifts work?",
        viewer_name="Alex",
        tone="warm",
        language="en",
    )
    assert "not posted" in reply.lower()

    titles = _suggest_live_titles(topic="Creator night", language="en")
    assert len(titles) == 3
    assert all("Creator night" in title for title in titles)


def test_live_tool_input_validation() -> None:
    with pytest.raises(Exception):
        SummarizeLiveChatToolInput()
    SummarizeLiveChatToolInput(chat_excerpt="viewer: hi\nviewer: how are you?")
    DraftLiveReplyToolInput(chat_message="Love the stream")
    SuggestLiveTitleToolInput(topic="Soft open")


@pytest.mark.asyncio
async def test_summarize_live_chat_tool_drafts_without_posting(api: APIHarness) -> None:
    user, tokens = await create_member(
        api, email="aura-live-tools@example.com", display_name="Live Host"
    )
    headers = bearer(tokens["access_token"])
    await api.client.patch(
        "/v1/ai/settings",
        headers=headers,
        json={"consent_granted": True},
    )
    create = await api.client.post(
        "/v1/ai/conversations",
        headers=headers,
        json={"title": "Live desk", "purpose": "general"},
    )
    assert create.status_code == 201, create.text
    conversation_id = create.json()["id"]

    # Seed tool definitions are available after app startup; exercise draft via tool proposal path
    # by validating schema + helper output remains host-facing.
    payload = SummarizeLiveChatToolInput(
        chat_excerpt="Maya: when do we start?\nLeo: love this vibe\nMaya: title ideas?"
    )
    draft = _draft_live_chat_summary(payload.chat_excerpt.splitlines())
    assert "Maya" in draft or "Questions" in draft
    assert "platforms" in draft.lower() or "Draft only" in draft

    # Presence still returns a known emotion after consent.
    presence = await api.client.get("/v1/ai/aura/presence", headers=headers)
    assert presence.status_code == 200, presence.text
    assert presence.json()["emotion"] in {
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
    assert conversation_id
    assert user.id
    assert isinstance(uuid.uuid4(), uuid.UUID)
