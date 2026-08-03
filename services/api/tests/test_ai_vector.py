from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

import pytest
from sqlalchemy import select

from app.ai_models import (
    AICapability,
    AIEmbeddingState,
    AIMemory,
    AIMemoryEmbedding,
    AIMemoryKind,
)
from app.ai_providers import (
    ChatProviderRequest,
    ChatProviderResponse,
    EmbeddingProviderResponse,
    ProviderRegistry,
    ProviderUsage,
)
from app.ai_vector import (
    InMemoryEmbeddingStore,
    cosine_similarity,
    delete_embedding,
    semantic_search,
)
from app.security import encrypt_secret, utcnow
from tests.conftest import bearer, login, register_and_verify


class VectorTestProvider:
    __test__ = False

    def __init__(self) -> None:
        self.name = "vector-test-provider"
        self.capabilities = frozenset({AICapability.chat, AICapability.embeddings})
        self.chat_requests: list[ChatProviderRequest] = []

    def model_for(self, capability: AICapability) -> str:
        if capability not in self.capabilities:
            raise ValueError("unsupported test capability")
        return f"vector-test-{capability.value}"

    async def embed(self, texts: Sequence[str]) -> EmbeddingProviderResponse:
        vectors: list[list[float]] = []
        for text in texts:
            lowered = text.lower()
            if "coffee" in lowered:
                vectors.append([1.0, 0.0])
            elif "blue" in lowered:
                vectors.append([0.0, 1.0])
            else:
                vectors.append([0.2, 0.2])
        return EmbeddingProviderResponse(
            vectors=vectors,
            model=self.model_for(AICapability.embeddings),
            usage=ProviderUsage(prompt_units=len(texts)),
        )

    async def chat(self, request: ChatProviderRequest) -> ChatProviderResponse:
        self.chat_requests.append(request)
        return ChatProviderResponse(
            content="Grounded with hybrid memory.",
            model=self.model_for(AICapability.chat),
            usage=ProviderUsage(prompt_units=5, completion_units=4, cost_micros=1),
        )


async def authenticated(api: Any) -> tuple[dict[str, str], uuid.UUID]:
    await register_and_verify(api)
    tokens = await login(api)
    user = await api.user("member@example.com")
    return bearer(tokens["access_token"]), user.id


async def enable_memory(api: Any, headers: dict[str, str]) -> None:
    response = await api.client.patch(
        "/v1/ai/settings",
        headers=headers,
        json={
            "consent_granted": True,
            "memory_enabled": True,
            "personalization_enabled": True,
        },
    )
    assert response.status_code == 200, response.text


async def test_cosine_semantic_search_ranks_mocked_embeddings(api_factory: Any) -> None:
    provider = VectorTestProvider()
    store = InMemoryEmbeddingStore()
    async with api_factory(ai_provider_registry=ProviderRegistry([provider])) as api:
        headers, user_id = await authenticated(api)
        await enable_memory(api, headers)

        async with api.app.state.session_factory() as session:
            coffee = AIMemory(
                user_id=user_id,
                kind=AIMemoryKind.preference,
                encrypted_content=encrypt_secret("I love iced coffee.", api.app.state.settings),
                consented_at=utcnow(),
                embedding_state=AIEmbeddingState.ready,
            )
            blue = AIMemory(
                user_id=user_id,
                kind=AIMemoryKind.preference,
                encrypted_content=encrypt_secret(
                    "My favorite color is blue.",
                    api.app.state.settings,
                ),
                consented_at=utcnow(),
                embedding_state=AIEmbeddingState.ready,
            )
            session.add_all([coffee, blue])
            await session.flush()
            await store.upsert_memory_embedding(
                session,
                coffee,
                [1.0, 0.0],
                provider=provider.name,
                model=provider.model_for(AICapability.embeddings),
            )
            await store.upsert_memory_embedding(
                session,
                blue,
                [0.0, 1.0],
                provider=provider.name,
                model=provider.model_for(AICapability.embeddings),
            )

            hits = await semantic_search(
                session,
                ProviderRegistry([provider]),
                api.app.state.settings,
                user_id,
                "coffee recommendations",
                k=2,
                store=store,
            )

        assert cosine_similarity([1.0, 0.0], [1.0, 0.0]) == pytest.approx(1.0)
        assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)
        assert [hit.memory.id for hit in hits] == [coffee.id, blue.id]


async def test_hybrid_grounding_uses_semantic_and_recent_memory(api_factory: Any) -> None:
    provider = VectorTestProvider()
    registry = ProviderRegistry([provider])
    async with api_factory(ai_provider_registry=registry) as api:
        headers, _ = await authenticated(api)
        await enable_memory(api, headers)

        coffee = await api.client.post(
            "/v1/ai/memory",
            headers=headers,
            json={"kind": "preference", "content": "I love iced coffee."},
        )
        assert coffee.status_code == 201, coffee.text
        assert coffee.json()["embedding_state"] == "ready"

        blue = await api.client.post(
            "/v1/ai/memory",
            headers=headers,
            json={"kind": "preference", "content": "My favorite color is blue."},
        )
        assert blue.status_code == 201, blue.text

        blue_id = uuid.UUID(blue.json()["id"])
        async with api.app.state.session_factory() as session:
            blue_record = await session.get(AIMemory, blue_id)
            assert blue_record is not None
            await delete_embedding(session, blue_id)
            blue_record.embedding_state = AIEmbeddingState.disabled
            blue_record.embedding_ref = None
            await session.commit()
            stale_embedding = await session.scalar(
                select(AIMemoryEmbedding).where(AIMemoryEmbedding.memory_id == blue_id)
            )
            assert stale_embedding is None

        conversation = await api.client.post(
            "/v1/ai/conversations",
            headers=headers,
            json={"title": "Hybrid grounding"},
        )
        assert conversation.status_code == 201, conversation.text
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation.json()['id']}/send",
            headers=headers,
            json={"content": "Use my coffee preference."},
        )
        assert sent.status_code == 201, sent.text
        assert provider.chat_requests

        memory_sources = [
            source
            for source in provider.chat_requests[-1].grounding_sources
            if source.source_type == "ai_memory"
        ]
        source_ids = [source.source_id for source in memory_sources]
        assert source_ids.count(coffee.json()["id"]) == 1
        assert source_ids.count(blue.json()["id"]) == 1
        assert memory_sources[0].source_id == coffee.json()["id"]
