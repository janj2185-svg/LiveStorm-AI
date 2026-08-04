from __future__ import annotations

import hashlib
import uuid
from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

import pytest
from sqlalchemy import func, select

from app.ai_models import (
    AICapability,
    AIConversation,
    AIJob,
    AIJobStatus,
    AIMemory,
    AIMessage,
    AIToolExecution,
    AIUsageRecord,
    PromptTemplate,
)
from app.ai_providers import (
    ChatProviderRequest,
    ChatProviderResponse,
    ChatStreamEvent,
    GeneratedAsset,
    GenerationProviderResponse,
    ModerationProviderResponse,
    ProviderCitation,
    ProviderRegistry,
    ProviderToolProposal,
    ProviderUsage,
    TranscriptionProviderRequest,
    TranscriptionProviderResponse,
    TranslationProviderResponse,
)
from app.ai_service import process_generation_job
from app.models import Profile, Role, User, UserRole
from app.social_models import Post, PostLifecycle
from app.storage import StoredObject
from tests.conftest import bearer, login, register_and_verify


class TestProvider:
    __test__ = False

    def __init__(
        self,
        *,
        capabilities: frozenset[AICapability] | None = None,
        tool_proposals: Sequence[ProviderToolProposal] = (),
        unknown_citation: bool = False,
        generation_failure: bool = False,
    ) -> None:
        self.name = "test-provider"
        self.capabilities = capabilities or frozenset(
            {
                AICapability.chat,
                AICapability.translation,
                AICapability.moderation,
                AICapability.image,
            }
        )
        self.tool_proposals = tool_proposals
        self.unknown_citation = unknown_citation
        self.generation_failure = generation_failure
        self.last_chat_request: ChatProviderRequest | None = None
        self.last_transcription_request: TranscriptionProviderRequest | None = None

    def model_for(self, capability: AICapability) -> str:
        if capability not in self.capabilities:
            raise ValueError("unsupported test capability")
        return f"test-{capability.value}-model"

    async def chat(self, request: ChatProviderRequest) -> ChatProviderResponse:
        self.last_chat_request = request
        citations = []
        if self.unknown_citation:
            citations = [ProviderCitation("private_admin_data", "unknown")]
        elif request.grounding_sources:
            source = request.grounding_sources[0]
            citations = [ProviderCitation(source.source_type, source.source_id)]
        return ChatProviderResponse(
            content="A grounded assistant response.",
            model=self.model_for(AICapability.chat),
            usage=ProviderUsage(prompt_units=12, completion_units=7, cost_micros=19),
            citations=citations,
            tool_proposals=self.tool_proposals,
        )

    async def stream_chat(self, request: ChatProviderRequest) -> AsyncIterator[ChatStreamEvent]:
        result = await self.chat(request)
        yield ChatStreamEvent(text_delta="A grounded ")
        yield ChatStreamEvent(text_delta="assistant response.")
        yield ChatStreamEvent(final=result)

    async def translate(
        self, text: str, source_language: str, target_language: str
    ) -> TranslationProviderResponse:
        return TranslationProviderResponse(
            text=f"[{target_language}] {text}",
            source_language=source_language,
            target_language=target_language,
            model=self.model_for(AICapability.translation),
            usage=ProviderUsage(prompt_units=4, completion_units=5, cost_micros=3),
        )

    async def moderate(self, text: str) -> ModerationProviderResponse:
        return ModerationProviderResponse(
            recommendation="review",
            confidence=0.81,
            categories={"harassment": 0.81},
            model=self.model_for(AICapability.moderation),
            usage=ProviderUsage(prompt_units=3, cost_micros=1),
        )

    async def transcribe(
        self, request: TranscriptionProviderRequest
    ) -> TranscriptionProviderResponse:
        self.last_transcription_request = request
        return TranscriptionProviderResponse(
            text="Captioned test audio.",
            language=request.language or "en",
            duration_seconds=1.25,
            model=self.model_for(AICapability.voice),
            usage=ProviderUsage(prompt_units=2, completion_units=4, cost_micros=5),
        )

    async def generate_image(self, request: Mapping[str, Any]) -> GenerationProviderResponse:
        if self.generation_failure:
            from app.ai_providers import ProviderCallError

            raise ProviderCallError("test_provider_failure")
        return GenerationProviderResponse(
            model=self.model_for(AICapability.image),
            usage=ProviderUsage(prompt_units=6, cost_micros=9),
            assets=[GeneratedAsset(content=b"real-test-bytes", content_type="image/png")],
        )


class TestObjectStorage:
    __test__ = False

    def __init__(self) -> None:
        self.keys: list[str] = []

    async def put_bytes(
        self, *, object_key: str, content_type: str, content: bytes
    ) -> StoredObject:
        self.keys.append(object_key)
        return StoredObject(
            object_key=object_key,
            content_type=content_type,
            byte_size=len(content),
            sha256=hashlib.sha256(content).hexdigest(),
        )

    async def presign_get(self, *, object_key: str) -> str:
        return f"https://storage.test/{object_key}?signed=1"


async def authenticated(api: Any) -> tuple[dict[str, str], uuid.UUID]:
    await register_and_verify(api)
    tokens = await login(api)
    user = await api.user("member@example.com")
    return bearer(tokens["access_token"]), user.id


async def grant_admin(api: Any, user_id: uuid.UUID) -> None:
    async with api.app.state.session_factory() as session:
        role = await session.scalar(select(Role).where(Role.name == "admin"))
        assert role is not None
        session.add(UserRole(user_id=user_id, role_id=role.id, granted_by=user_id))
        await session.commit()


async def enable_ai(
    api: Any,
    headers: dict[str, str],
    **extra: Any,
) -> None:
    response = await api.client.patch(
        "/v1/ai/settings",
        headers=headers,
        json={"consent_granted": True, **extra},
    )
    assert response.status_code == 200, response.text


async def conversation(api: Any, headers: dict[str, str], mode: str = "copilot") -> str:
    response = await api.client.post(
        "/v1/ai/conversations",
        headers=headers,
        json={"title": "Test conversation", "mode": mode},
    )
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


async def test_unconfigured_provider_is_503_without_message_success(api) -> None:
    headers, _ = await authenticated(api)
    await enable_ai(api, headers)
    conversation_id = await conversation(api, headers)
    response = await api.client.post(
        f"/v1/ai/conversations/{conversation_id}/messages",
        headers=headers,
        json={"content": "Help me with my account."},
    )
    assert response.status_code == 503
    assert response.json()["code"] == "ai_provider_unavailable"
    generation = await api.client.post(
        "/v1/ai/jobs",
        headers=headers,
        json={
            "capability": "video",
            "prompt": "A video that cannot run without a provider",
            "duration_seconds": 5,
            "aspect_ratio": "16:9",
        },
    )
    assert generation.status_code == 503
    transcription = await api.client.post(
        "/v1/ai/transcriptions",
        headers=headers,
        json={
            "audio_base64": "UklGRg==",
            "filename": "caption.wav",
            "content_type": "audio/wav",
        },
    )
    assert transcription.status_code == 503
    assert transcription.json()["code"] == "ai_provider_unavailable"
    async with api.app.state.session_factory() as session:
        count = await session.scalar(select(func.count()).select_from(AIMessage))
        assert count == 0
        job_count = await session.scalar(select(func.count()).select_from(AIJob))
        assert job_count == 0


async def test_transcription_accepts_multipart_and_base64_with_voice_provider(
    api_factory: Any,
) -> None:
    provider = TestProvider(capabilities=frozenset({AICapability.voice}))
    async with api_factory(ai_provider_registry=ProviderRegistry([provider])) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)

        multipart = await api.client.post(
            "/v1/ai/transcriptions",
            headers=headers,
            files={"audio": ("caption.webm", b"webm-audio-bytes", "audio/webm")},
            data={"language": "en"},
        )
        assert multipart.status_code == 200, multipart.text
        assert multipart.json() == {
            "text": "Captioned test audio.",
            "language": "en",
            "duration_seconds": 1.25,
            "provider": "test-provider",
            "model": "test-voice-model",
            "prompt_units": 2,
            "completion_units": 4,
            "cost_micros": 5,
        }
        assert provider.last_transcription_request is not None
        assert provider.last_transcription_request.audio == b"webm-audio-bytes"
        assert provider.last_transcription_request.filename == "caption.webm"

        encoded = await api.client.post(
            "/v1/ai/transcriptions",
            headers=headers,
            json={
                "audio_base64": "UklGRmJhc2U2NC1hdWRpbw==",
                "filename": "caption.wav",
                "content_type": "audio/wav",
                "language": "uk",
            },
        )
        assert encoded.status_code == 200, encoded.text
        assert encoded.json()["text"] == "Captioned test audio."
        assert encoded.json()["language"] == "uk"
        assert provider.last_transcription_request is not None
        assert provider.last_transcription_request.audio == b"RIFFbase64-audio"


async def test_conversation_purpose_scopes_the_existing_chat_stack(
    api_factory: Any,
) -> None:
    provider = TestProvider()
    async with api_factory(ai_provider_registry=ProviderRegistry([provider])) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        created = await api.client.post(
            "/v1/ai/conversations",
            headers=headers,
            json={
                "title": "Business Copilot",
                "mode": "copilot",
                "purpose": "business_copilot",
            },
        )
        assert created.status_code == 201, created.text
        assert created.json()["purpose"] == "business_copilot"

        sent = await api.client.post(
            f"/v1/ai/conversations/{created.json()['id']}/send",
            headers=headers,
            json={"content": "Help me assess an operating plan."},
        )
        assert sent.status_code == 201, sent.text
        assert provider.last_chat_request is not None
        system_messages = [
            item["content"]
            for item in provider.last_chat_request.messages
            if item["role"] == "system"
        ]
        assert any("Business Copilot mode" in content for content in system_messages)

        learning = await api.client.post(
            "/v1/ai/conversations",
            headers=headers,
            json={
                "title": "Learning Tutor",
                "purpose": "learning_tutor",
            },
        )
        assert learning.status_code == 201, learning.text
        sent = await api.client.post(
            f"/v1/ai/conversations/{learning.json()['id']}/send",
            headers=headers,
            json={"content": "Explain this concept with an example."},
        )
        assert sent.status_code == 201, sent.text
        assert provider.last_chat_request is not None
        system_messages = [
            item["content"]
            for item in provider.last_chat_request.messages
            if item["role"] == "system"
        ]
        assert any("Learning Tutor mode" in content for content in system_messages)

        invalid = await api.client.post(
            "/v1/ai/conversations",
            headers=headers,
            json={"purpose": "imaginary_expert"},
        )
        assert invalid.status_code == 422


async def test_injected_chat_citations_usage_stream_quota_and_event_replay(
    api_factory: Any,
) -> None:
    registry = ProviderRegistry([TestProvider()])
    async with api_factory(ai_provider_registry=registry) as api:
        headers, user_id = await authenticated(api)
        await enable_ai(
            api,
            headers,
            analytics_context_enabled=True,
            monthly_token_limit=100,
            monthly_spend_limit_micros=1000,
        )
        conversation_id = await conversation(api, headers)
        response = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/stream",
            headers=headers,
            json={"content": "Summarize my creator analytics."},
        )
        assert response.status_code == 200, response.text
        assert "event: delta" in response.text
        assert "event: completed" in response.text
        history = await api.client.get(
            f"/v1/ai/conversations/{conversation_id}/messages",
            headers=headers,
        )
        assert history.status_code == 200
        assistant = history.json()["items"][0]
        assert assistant["content"] == "A grounded assistant response."
        assert assistant["citations"][0]["source_type"] == "creator_analytics"
        usage = await api.client.get("/v1/ai/usage/summary", headers=headers)
        assert usage.json()["total_units"] == 19
        events = await api.client.get("/v1/ai/events", headers=headers)
        assert events.status_code == 200
        assert "message.completed" in events.text
        cursor = next(
            line.removeprefix("id: ")
            for line in events.text.splitlines()
            if line.startswith("id: ")
        )
        replayed = await api.client.get("/v1/ai/events", headers=headers, params={"since": cursor})
        assert replayed.status_code == 200
        assert replayed.text == ""

        quota = await api.client.patch(
            "/v1/ai/settings",
            headers=headers,
            json={"monthly_token_limit": 19},
        )
        assert quota.status_code == 200
        denied = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/messages",
            headers=headers,
            json={"content": "One more request."},
        )
        assert denied.status_code == 402
        assert denied.json()["code"] == "ai_token_quota_exceeded"
        spend_limit = await api.client.patch(
            "/v1/ai/settings",
            headers=headers,
            json={
                "monthly_token_limit": None,
                "monthly_spend_limit_micros": 19,
            },
        )
        assert spend_limit.status_code == 200
        spend_denied = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/messages",
            headers=headers,
            json={"content": "This request exceeds my spend limit."},
        )
        assert spend_denied.status_code == 402
        assert spend_denied.json()["code"] == "ai_spend_quota_exceeded"
        assert str(user_id) in assistant["citations"][0]["source_id"]


async def test_tool_schema_risk_modes_and_transactional_effects(api_factory: Any) -> None:
    medium_provider = TestProvider(
        tool_proposals=[
            ProviderToolProposal(
                "update_own_profile",
                {"display_name": "AI Approved Name"},
            )
        ]
    )
    async with api_factory(ai_provider_registry=ProviderRegistry([medium_provider])) as api:
        headers, user_id = await authenticated(api)
        await enable_ai(api, headers)
        conversation_id = await conversation(api, headers)
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Propose a profile update."},
        )
        assert sent.status_code == 201, sent.text
        proposal = sent.json()["proposals"][0]
        assert proposal["risk"] == "medium"
        execute = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/proposals/{proposal['id']}/execute",
            headers=headers,
        )
        assert execute.status_code == 409
        approved = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/proposals/{proposal['id']}/approve",
            headers=headers,
        )
        assert approved.status_code == 200
        executed = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/proposals/{proposal['id']}/execute",
            headers=headers,
        )
        assert executed.status_code == 200, executed.text
        async with api.app.state.session_factory() as session:
            profile = await session.get(Profile, user_id)
            execution = await session.get(
                AIToolExecution, uuid.UUID(executed.json()["execution_id"])
            )
            assert profile is not None and profile.display_name == "AI Approved Name"
            assert execution is not None and execution.state.value == "succeeded"
            execution.failure_code = "tampered"
            with pytest.raises(ValueError, match="append-only"):
                await session.commit()

    manual_provider = TestProvider(
        tool_proposals=[ProviderToolProposal("draft_post", {"body": "Never execute"})]
    )
    async with api_factory(ai_provider_registry=ProviderRegistry([manual_provider])) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        conversation_id = await conversation(api, headers, mode="manual")
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Draft this."},
        )
        proposal_id = sent.json()["proposals"][0]["id"]
        denied = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/proposals/{proposal_id}/approve",
            headers=headers,
        )
        assert denied.status_code == 409


async def test_autopilot_low_risk_allowlist_and_unknown_tool_rejection(
    api_factory: Any,
) -> None:
    provider = TestProvider(
        tool_proposals=[ProviderToolProposal("draft_post", {"body": "A safe draft"})]
    )
    async with api_factory(ai_provider_registry=ProviderRegistry([provider])) as api:
        headers, user_id = await authenticated(api)
        await enable_ai(
            api,
            headers,
            autopilot_low_risk_tools=["draft_post"],
        )
        conversation_id = await conversation(api, headers, mode="autopilot")
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Draft a post."},
        )
        assert sent.status_code == 201, sent.text
        assert sent.json()["proposals"][0]["state"] == "succeeded"
        async with api.app.state.session_factory() as session:
            post = await session.scalar(select(Post).where(Post.author_id == user_id))
            assert post is not None
            assert post.lifecycle == PostLifecycle.draft

    unknown = TestProvider(
        tool_proposals=[ProviderToolProposal("publish_post", {"body": "unsafe"})]
    )
    async with api_factory(ai_provider_registry=ProviderRegistry([unknown])) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        conversation_id = await conversation(api, headers)
        rejected = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Run an unknown tool."},
        )
        assert rejected.status_code == 502
        assert rejected.json()["code"] == "provider_unknown_tool"
        async with api.app.state.session_factory() as session:
            assert await session.scalar(select(func.count()).select_from(AIMessage)) == 0

    invalid_schema = TestProvider(
        tool_proposals=[
            ProviderToolProposal(
                "draft_post",
                {"body": "A draft", "publish_immediately": True},
            )
        ]
    )
    async with api_factory(ai_provider_registry=ProviderRegistry([invalid_schema])) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        conversation_id = await conversation(api, headers)
        rejected = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Reject unknown schema fields."},
        )
        assert rejected.status_code == 502
        assert rejected.json()["code"] == "provider_invalid_tool_schema"


async def test_memory_consent_edit_export_delete_and_disable(api) -> None:
    headers, _ = await authenticated(api)
    denied = await api.client.post(
        "/v1/ai/memory",
        headers=headers,
        json={"kind": "preference", "content": "I prefer concise replies."},
    )
    assert denied.status_code == 403
    await enable_ai(api, headers, memory_enabled=True)
    created = await api.client.post(
        "/v1/ai/memory",
        headers=headers,
        json={"kind": "preference", "content": "I prefer concise replies."},
    )
    assert created.status_code == 201, created.text
    memory_id = created.json()["id"]
    edited = await api.client.patch(
        f"/v1/ai/memory/{memory_id}",
        headers=headers,
        json={"content": "I prefer concise technical replies."},
    )
    assert edited.json()["content"] == "I prefer concise technical replies."
    exported = await api.client.get("/v1/ai/memory/export", headers=headers)
    assert exported.status_code == 200
    assert exported.json()["items"][0]["content"].startswith("I prefer")
    disabled = await api.client.patch(
        "/v1/ai/settings",
        headers=headers,
        json={"memory_enabled": False},
    )
    assert disabled.status_code == 200
    listed = await api.client.get("/v1/ai/memory", headers=headers)
    assert listed.json() == []


async def test_translation_moderation_and_generation_dispatch(api_factory: Any) -> None:
    provider = TestProvider()
    registry = ProviderRegistry([provider])
    dispatched: list[uuid.UUID] = []

    async def dispatch(job_id: uuid.UUID) -> None:
        dispatched.append(job_id)

    storage = TestObjectStorage()
    async with api_factory(
        ai_provider_registry=registry,
        ai_job_dispatcher=dispatch,
        object_storage=storage,
    ) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        translated = await api.client.post(
            "/v1/ai/translate",
            headers=headers,
            json={
                "text": "Hello",
                "source_language": "en",
                "target_language": "es",
            },
        )
        assert translated.status_code == 200
        assert translated.json()["text"] == "[es] Hello"
        moderated = await api.client.post(
            "/v1/ai/moderate",
            headers=headers,
            json={"text": "Review this content."},
        )
        assert moderated.status_code == 200
        assert moderated.json()["non_binding"] is True
        job_response = await api.client.post(
            "/v1/ai/jobs",
            headers=headers,
            json={
                "capability": "image",
                "prompt": "A secure abstract image",
                "size": "512x512",
                "count": 1,
            },
        )
        assert job_response.status_code == 202, job_response.text
        job_id = uuid.UUID(job_response.json()["id"])
        assert dispatched == [job_id]
        pending_output = await api.client.get(
            f"/v1/ai/jobs/{job_id}/outputs/0",
            headers=headers,
        )
        assert pending_output.status_code == 409
        assert pending_output.json()["code"] == "ai_job_output_not_ready"
        async with api.app.state.session_factory() as session:
            job = await process_generation_job(session, registry, storage, job_id)
            assert job.status == AIJobStatus.succeeded
            assert job.output_refs[0]["object_key"].startswith("ai/")
            assert "http" not in str(job.output_refs)
        output = await api.client.get(
            f"/v1/ai/jobs/{job_id}/outputs/0",
            headers=headers,
        )
        assert output.status_code == 200, output.text
        assert output.json()["playback_url"].startswith("https://storage.test/ai/")
        assert output.json()["content_type"] == "image/png"
        assert output.json()["expires_in_seconds"] == 900
        assert storage.keys

    failing_provider = TestProvider(generation_failure=True)
    failing_registry = ProviderRegistry([failing_provider])
    async with api_factory(
        ai_provider_registry=failing_registry,
        ai_job_dispatcher=dispatch,
        object_storage=TestObjectStorage(),
    ) as api:
        headers, _ = await authenticated(api)
        await enable_ai(api, headers)
        created = await api.client.post(
            "/v1/ai/jobs",
            headers=headers,
            json={
                "capability": "image",
                "prompt": "This provider will fail",
                "size": "512x512",
                "count": 1,
            },
        )
        assert created.status_code == 202
        async with api.app.state.session_factory() as session:
            failed = await process_generation_job(
                session,
                failing_registry,
                TestObjectStorage(),
                uuid.UUID(created.json()["id"]),
            )
            assert failed.status == AIJobStatus.failed
            assert failed.failure_code == "test_provider_failure"
            assert failed.output_refs == []
        retried = await api.client.post(
            f"/v1/ai/jobs/{created.json()['id']}/retry",
            headers=headers,
        )
        assert retried.status_code == 200
        assert retried.json()["status"] == "queued"


async def test_provider_prompt_rbac_encryption_and_account_cleanup(api_factory: Any) -> None:
    registry = ProviderRegistry([TestProvider()])
    async with api_factory(ai_provider_registry=registry) as api:
        headers, user_id = await authenticated(api)
        denied = await api.client.get("/v1/admin/ai/providers", headers=headers)
        assert denied.status_code == 403
        await grant_admin(api, user_id)
        configured = await api.client.post(
            "/v1/admin/ai/providers",
            headers=headers,
            json={
                "name": "openai-compatible",
                "base_url": "http://provider.test/v1",
                "api_credential": "provider-secret-value",
                "enabled": False,
                "capabilities": ["chat"],
                "model_mapping": {"chat": "configured-model"},
                "pricing_config": {},
            },
        )
        assert configured.status_code == 201, configured.text
        assert "api_credential" not in configured.text
        assert "provider-secret-value" not in configured.text
        async with api.app.state.session_factory() as session:
            from app.ai_models import AIProviderConfiguration

            record = await session.scalar(select(AIProviderConfiguration))
            assert record is not None
            assert record.encrypted_api_credential != "provider-secret-value"

        prompt = await api.client.post(
            "/v1/admin/ai/prompts",
            headers=headers,
            json={
                "template_key": "assistant.system",
                "version": 1,
                "locale": "en",
                "capability": "chat",
                "content": "Follow the published account safety policy.",
                "policy_metadata": {"policy": "account-safe"},
            },
        )
        assert prompt.status_code == 201
        published = await api.client.post(
            f"/v1/admin/ai/prompts/{prompt.json()['id']}/publish",
            headers=headers,
        )
        assert published.json()["state"] == "published"
        async with api.app.state.session_factory() as session:
            template = await session.get(PromptTemplate, uuid.UUID(prompt.json()["id"]))
            assert template is not None
            template.content = "tampered"
            with pytest.raises(ValueError, match="immutable"):
                await session.commit()

        await enable_ai(api, headers, memory_enabled=True)
        await api.client.post(
            "/v1/ai/memory",
            headers=headers,
            json={"kind": "fact", "content": "Sensitive memory content."},
        )
        conversation_id = await conversation(api, headers)
        sent = await api.client.post(
            f"/v1/ai/conversations/{conversation_id}/send",
            headers=headers,
            json={"content": "Create usage before deletion."},
        )
        assert sent.status_code == 201
        deleted = await api.client.request(
            "DELETE",
            "/v1/users/me",
            headers=headers,
            json={"password": "CorrectHorse!2026"},
        )
        assert deleted.status_code == 200, deleted.text
        async with api.app.state.session_factory() as session:
            assert (
                await session.scalar(
                    select(func.count())
                    .select_from(AIConversation)
                    .where(AIConversation.user_id == user_id)
                )
                == 0
            )
            assert (
                await session.scalar(
                    select(func.count()).select_from(AIMemory).where(AIMemory.user_id == user_id)
                )
                == 0
            )
            usage = await session.scalar(
                select(AIUsageRecord).where(AIUsageRecord.user_id == user_id)
            )
            assert usage is not None
            assert usage.pseudonymous_subject_hash
            user = await session.get(User, user_id)
            assert user is not None and user.email.endswith("@deleted.invalid")
