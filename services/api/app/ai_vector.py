from __future__ import annotations

import json
import math
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import AICapability, AIEmbeddingState, AIMemory, AIMemoryEmbedding
from app.ai_providers import (
    EmbeddingProviderResponse,
    EmbeddingsProvider,
    ProviderCallError,
    ProviderRegistry,
    ProviderUnavailableError,
)
from app.config import Settings
from app.security import decrypt_secret, utcnow

DEFAULT_SEMANTIC_LIMIT = 8


@dataclass(frozen=True)
class VectorSearchHit:
    memory: AIMemory
    score: float


@runtime_checkable
class VectorStore(Protocol):
    """Vector store boundary; a Milvus adapter can implement this later.

    The Phase A production default is an in-database JSON vector table with
    Python cosine ranking. This module intentionally does not attempt Milvus
    connectivity just because Milvus appears in local compose.
    """

    async def upsert_memory_embedding(
        self,
        db: AsyncSession,
        memory: AIMemory,
        vector: Sequence[float],
        *,
        provider: str,
        model: str,
    ) -> None: ...

    async def search_memories(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        query_vector: Sequence[float],
        *,
        k: int,
    ) -> Sequence[VectorSearchHit]: ...

    async def delete_memory_embedding(self, db: AsyncSession, memory_id: uuid.UUID) -> None: ...


class PostgresEmbeddingStore:
    """Simple SQL-backed JSON vector store.

    Despite the name, this uses portable SQLAlchemy JSON storage so tests can
    run on SQLite. PostgreSQL is the deployment target; pgvector or Milvus can
    replace this behind the VectorStore protocol later.
    """

    async def upsert_memory_embedding(
        self,
        db: AsyncSession,
        memory: AIMemory,
        vector: Sequence[float],
        *,
        provider: str,
        model: str,
    ) -> None:
        existing = await db.get(AIMemoryEmbedding, memory.id)
        values = [float(component) for component in vector]
        if existing is None:
            db.add(
                AIMemoryEmbedding(
                    memory_id=memory.id,
                    user_id=memory.user_id,
                    provider=provider,
                    model=model,
                    dimension=len(values),
                    vector_json=values,
                )
            )
            return
        existing.user_id = memory.user_id
        existing.provider = provider
        existing.model = model
        existing.dimension = len(values)
        existing.vector_json = values

    async def search_memories(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        query_vector: Sequence[float],
        *,
        k: int,
    ) -> Sequence[VectorSearchHit]:
        if k <= 0:
            return ()
        rows = (
            await db.execute(
                select(AIMemoryEmbedding, AIMemory)
                .join(AIMemory, AIMemory.id == AIMemoryEmbedding.memory_id)
                .where(
                    AIMemoryEmbedding.user_id == user_id,
                    AIMemory.user_id == user_id,
                    AIMemory.deleted_at.is_(None),
                    AIMemory.embedding_state == AIEmbeddingState.ready,
                    or_(AIMemory.expires_at.is_(None), AIMemory.expires_at > utcnow()),
                )
            )
        ).all()
        hits: list[VectorSearchHit] = []
        for embedding, memory in rows:
            if embedding.dimension != len(query_vector):
                continue
            score = cosine_similarity(query_vector, embedding.vector_json)
            if score is None:
                continue
            hits.append(VectorSearchHit(memory=memory, score=score))
        hits.sort(key=lambda item: (item.score, item.memory.updated_at), reverse=True)
        return hits[:k]

    async def delete_memory_embedding(self, db: AsyncSession, memory_id: uuid.UUID) -> None:
        await db.execute(
            delete(AIMemoryEmbedding).where(AIMemoryEmbedding.memory_id == memory_id)
        )


class InMemoryEmbeddingStore(PostgresEmbeddingStore):
    """Process-local vector store for narrow unit tests and future adapters."""

    def __init__(self) -> None:
        self._vectors: dict[uuid.UUID, tuple[uuid.UUID, list[float], str, str]] = {}

    async def upsert_memory_embedding(
        self,
        db: AsyncSession,
        memory: AIMemory,
        vector: Sequence[float],
        *,
        provider: str,
        model: str,
    ) -> None:
        self._vectors[memory.id] = (
            memory.user_id,
            [float(component) for component in vector],
            provider,
            model,
        )

    async def search_memories(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        query_vector: Sequence[float],
        *,
        k: int,
    ) -> Sequence[VectorSearchHit]:
        if k <= 0:
            return ()
        scored_ids: list[tuple[uuid.UUID, float]] = []
        for memory_id, (stored_user_id, vector, _, _) in self._vectors.items():
            if stored_user_id != user_id or len(vector) != len(query_vector):
                continue
            score = cosine_similarity(query_vector, vector)
            if score is not None:
                scored_ids.append((memory_id, score))
        scored_ids.sort(key=lambda item: item[1], reverse=True)
        memory_ids = [memory_id for memory_id, _ in scored_ids[:k]]
        if not memory_ids:
            return ()
        memories = {
            memory.id: memory
            for memory in (
                await db.scalars(
                    select(AIMemory).where(
                        AIMemory.id.in_(memory_ids),
                        AIMemory.user_id == user_id,
                        AIMemory.deleted_at.is_(None),
                        AIMemory.embedding_state == AIEmbeddingState.ready,
                        or_(AIMemory.expires_at.is_(None), AIMemory.expires_at > utcnow()),
                    )
                )
            ).all()
        }
        return [
            VectorSearchHit(memory=memories[memory_id], score=score)
            for memory_id, score in scored_ids[:k]
            if memory_id in memories
        ]

    async def delete_memory_embedding(self, db: AsyncSession, memory_id: uuid.UUID) -> None:
        self._vectors.pop(memory_id, None)


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float | None:
    if len(left) != len(right) or not left:
        return None
    dot = 0.0
    left_norm = 0.0
    right_norm = 0.0
    for left_value, right_value in zip(left, right, strict=True):
        left_component = float(left_value)
        right_component = float(right_value)
        if not math.isfinite(left_component) or not math.isfinite(right_component):
            return None
        dot += left_component * right_component
        left_norm += left_component * left_component
        right_norm += right_component * right_component
    if left_norm == 0.0 or right_norm == 0.0:
        return None
    return dot / (math.sqrt(left_norm) * math.sqrt(right_norm))


def memory_embedding_text(memory: AIMemory, settings: Settings) -> str:
    if memory.encrypted_content:
        value = decrypt_secret(memory.encrypted_content, settings)
    else:
        value = json.dumps(memory.structured_value, sort_keys=True, separators=(",", ":"))
    return f"{memory.kind.value}: {value}"


async def embed_and_index(
    db: AsyncSession,
    registry: ProviderRegistry,
    settings: Settings,
    memory: AIMemory,
    *,
    store: VectorStore | None = None,
) -> bool:
    vector_store = store or PostgresEmbeddingStore()
    if settings.ai_vector_backend == "none":
        await vector_store.delete_memory_embedding(db, memory.id)
        memory.embedding_state = AIEmbeddingState.disabled
        memory.embedding_ref = None
        return False

    provider = _resolve_embedding_provider(registry)
    if provider is None:
        await vector_store.delete_memory_embedding(db, memory.id)
        memory.embedding_state = AIEmbeddingState.disabled
        memory.embedding_ref = None
        return False

    try:
        response = await provider.embed([memory_embedding_text(memory, settings)])
        vector = _single_valid_vector(response)
    except ProviderCallError:
        await vector_store.delete_memory_embedding(db, memory.id)
        memory.embedding_state = AIEmbeddingState.failed
        memory.embedding_ref = None
        return False

    await vector_store.upsert_memory_embedding(
        db,
        memory,
        vector,
        provider=provider.name,
        model=response.model,
    )
    memory.embedding_state = AIEmbeddingState.ready
    memory.embedding_ref = f"{settings.ai_vector_backend}:ai_memory_embeddings:{memory.id}"
    return True


async def semantic_search(
    db: AsyncSession,
    registry: ProviderRegistry,
    settings: Settings,
    user_id: uuid.UUID,
    query: str,
    *,
    k: int = DEFAULT_SEMANTIC_LIMIT,
    store: VectorStore | None = None,
) -> Sequence[VectorSearchHit]:
    if settings.ai_vector_backend == "none" or not query.strip() or k <= 0:
        return ()
    provider = _resolve_embedding_provider(registry)
    if provider is None:
        return ()
    try:
        response = await provider.embed([query])
        query_vector = _single_valid_vector(response)
    except ProviderCallError:
        return ()
    return await (store or PostgresEmbeddingStore()).search_memories(
        db,
        user_id,
        query_vector,
        k=k,
    )


async def delete_embedding(
    db: AsyncSession,
    memory_id: uuid.UUID,
    *,
    store: VectorStore | None = None,
) -> None:
    await (store or PostgresEmbeddingStore()).delete_memory_embedding(db, memory_id)


def _resolve_embedding_provider(registry: ProviderRegistry) -> EmbeddingsProvider | None:
    try:
        provider = registry.resolve(AICapability.embeddings)
    except ProviderUnavailableError:
        return None
    if not hasattr(provider, "embed"):
        return None
    return provider


def _single_valid_vector(response: EmbeddingProviderResponse) -> list[float]:
    if not isinstance(response, EmbeddingProviderResponse) or len(response.vectors) != 1:
        raise ProviderCallError("provider_invalid_embedding_response")
    try:
        vector = [float(component) for component in response.vectors[0]]
    except (TypeError, ValueError, OverflowError) as exc:
        raise ProviderCallError("provider_invalid_embedding_response") from exc
    if cosine_similarity(vector, vector) is None:
        raise ProviderCallError("provider_invalid_embedding_response")
    return vector
