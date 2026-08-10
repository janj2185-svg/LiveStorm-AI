from __future__ import annotations

from typing import Any

import pytest
from sqlalchemy import select

from app.ai_models import AICapability, PromptTemplate, PromptTemplateState
from app.ai_providers import (
    ChatProviderRequest,
    ChatProviderResponse,
    ProviderRegistry,
    ProviderUsage,
)
from app.sylora_persona import (
    PERSONA_TEMPLATE_KEY,
    build_companion_system_messages,
    infer_companion_emotion,
)
from tests.conftest import bearer, login, register_and_verify
from tests.test_ai_brain import TestProvider, conversation, enable_ai


class CapturingProvider(TestProvider):
    def __init__(self) -> None:
        super().__init__()
        self.last_request: ChatProviderRequest | None = None

    async def chat(self, request: ChatProviderRequest) -> ChatProviderResponse:
        self.last_request = request
        return ChatProviderResponse(
            content="Хаха, чую тебе! А що далі зробимо — пожартуємо чи підемо вглиб?",
            model=self.model_for(AICapability.chat),
            usage=ProviderUsage(prompt_units=12, completion_units=7, cost_micros=19),
            citations=[],
            tool_proposals=(),
        )


def test_infer_emotion_playful_and_goodbye() -> None:
    playful = infer_companion_emotion(user_text="хаха це круто!")
    assert playful.mood == "sparkly"
    assert playful.laughter_ready is True
    assert playful.wants_follow_up is True

    goodbye = infer_companion_emotion(user_text="бувай, до зв'язку")
    assert goodbye.wants_follow_up is False
    assert goodbye.laughter_ready is False


def test_companion_system_messages_are_living() -> None:
    messages, emotion = build_companion_system_messages(
        locale="uk",
        user_text="розсміши мене",
        recent_messages=[],
        published_overlay="Follow the published account safety policy.",
    )
    assert emotion.playfulness >= 0.2
    joined = "\n".join(item["content"] for item in messages)
    assert "Sylora" in joined
    assert "follow-up" in joined.lower() or "follow-up" in joined or "гачком" in joined
    assert "Follow the published account safety policy." in joined


@pytest.mark.asyncio
async def test_persona_seed_and_emotion_endpoints(api_factory: Any) -> None:
    provider = CapturingProvider()
    async with api_factory(ai_provider_registry=ProviderRegistry([provider])) as api:
        email = f"sylora-persona-{provider.name}@example.com"
        await register_and_verify(api, email=email)
        headers = bearer((await login(api, email=email))["access_token"])

        async with api.app.state.session_factory() as session:
            seeded = (
                await session.scalars(
                    select(PromptTemplate).where(
                        PromptTemplate.template_key == PERSONA_TEMPLATE_KEY,
                        PromptTemplate.state == PromptTemplateState.published,
                    )
                )
            ).all()
            assert {item.locale for item in seeded} >= {"uk", "en"}

        await enable_ai(api, headers)
        settings = await api.client.get("/v1/ai/settings", headers=headers)
        assert settings.status_code == 200
        body = settings.json()
        assert body["consent_granted"] is True
        assert body["memory_enabled"] is True
        assert body["personalization_enabled"] is True

        emotion = await api.client.get("/v1/ai/emotion", headers=headers)
        assert emotion.status_code == 200, emotion.text
        assert emotion.json()["persona"] == "sylora"
        assert emotion.json()["display_name"] == "Sylora"
        assert "playfulness" in emotion.json()

        probed = await api.client.post(
            "/v1/ai/emotion",
            headers=headers,
            json={"text": "хаааа це смішно"},
        )
        assert probed.status_code == 200, probed.text
        assert probed.json()["laughter_ready"] is True

        conversation_id = await conversation(api, headers)
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Привіт, розсміши мене і підтримай розмову"},
        )
        assert sent.status_code == 201, sent.text
        assert provider.last_request is not None
        system_blobs = [
            message["content"]
            for message in provider.last_request.messages
            if message["role"] == "system"
        ]
        assert system_blobs
        assert any("жива" in blob.lower() or "living" in blob.lower() for blob in system_blobs)
        assert any("Sylora" in blob for blob in system_blobs)
