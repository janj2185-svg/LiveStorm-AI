from __future__ import annotations

import asyncio
import base64
import binascii
import json
import random
import time
from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_models import AICapability, AIProviderConfiguration
from app.config import Settings
from app.security import decrypt_secret

MAX_PROVIDER_RESPONSE_BYTES = 16 * 1024 * 1024
MAX_GENERATED_ASSET_BYTES = 64 * 1024 * 1024
OPENAI_COMPATIBLE_CAPABILITIES = frozenset(
    {
        AICapability.chat,
        AICapability.embeddings,
        AICapability.image,
        AICapability.voice,
        AICapability.moderation,
    }
)


class ProviderUnavailableError(Exception):
    def __init__(self, capability: AICapability) -> None:
        super().__init__(str(capability))
        self.capability = capability


class ProviderCallError(Exception):
    def __init__(self, code: str, *, retryable: bool = False) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable


class ProviderResponseError(ProviderCallError):
    pass


@dataclass(frozen=True)
class ProviderUsage:
    prompt_units: int = 0
    completion_units: int = 0
    cost_micros: int = 0


@dataclass(frozen=True)
class GroundingSource:
    source_type: str
    source_id: str
    safe_excerpt: str
    source_hash: str
    context: str


@dataclass(frozen=True)
class ProviderCitation:
    source_type: str
    source_id: str


@dataclass(frozen=True)
class ProviderToolProposal:
    tool_name: str
    typed_input: Mapping[str, Any]


@dataclass(frozen=True)
class ChatProviderRequest:
    messages: Sequence[Mapping[str, str]]
    locale: str
    grounding_sources: Sequence[GroundingSource] = ()
    tools: Sequence[Mapping[str, Any]] = ()
    max_completion_units: int = 2048


@dataclass(frozen=True)
class ChatProviderResponse:
    content: str
    model: str
    usage: ProviderUsage
    citations: Sequence[ProviderCitation] = ()
    tool_proposals: Sequence[ProviderToolProposal] = ()


@dataclass(frozen=True)
class ChatStreamEvent:
    text_delta: str = ""
    final: ChatProviderResponse | None = None


@dataclass(frozen=True)
class TranslationProviderResponse:
    text: str
    source_language: str
    target_language: str
    model: str
    usage: ProviderUsage


@dataclass(frozen=True)
class ModerationProviderResponse:
    recommendation: str
    confidence: float
    categories: Mapping[str, float]
    model: str
    usage: ProviderUsage = field(default_factory=ProviderUsage)


@dataclass(frozen=True)
class TranscriptionProviderRequest:
    audio: bytes
    filename: str
    content_type: str
    language: str | None = None
    prompt: str | None = None


@dataclass(frozen=True)
class TranscriptionProviderResponse:
    text: str
    model: str
    usage: ProviderUsage = field(default_factory=ProviderUsage)
    language: str | None = None
    duration_seconds: float | None = None


@dataclass(frozen=True)
class GeneratedAsset:
    content: bytes
    content_type: str
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class GenerationProviderResponse:
    model: str
    usage: ProviderUsage
    assets: Sequence[GeneratedAsset] = ()
    provider_operation_id: str | None = None
    pending: bool = False
    requires_input: bool = False
    progress: int = 100


@dataclass(frozen=True)
class EmbeddingProviderResponse:
    vectors: Sequence[Sequence[float]]
    model: str
    usage: ProviderUsage


@runtime_checkable
class AIProvider(Protocol):
    name: str
    capabilities: frozenset[AICapability]

    def model_for(self, capability: AICapability) -> str: ...


@runtime_checkable
class ChatProvider(AIProvider, Protocol):
    async def chat(self, request: ChatProviderRequest) -> ChatProviderResponse: ...

    def stream_chat(self, request: ChatProviderRequest) -> AsyncIterator[ChatStreamEvent]: ...


@runtime_checkable
class TranslationProvider(AIProvider, Protocol):
    async def translate(
        self, text: str, source_language: str, target_language: str
    ) -> TranslationProviderResponse: ...


@runtime_checkable
class ModerationProvider(AIProvider, Protocol):
    async def moderate(self, text: str) -> ModerationProviderResponse: ...


@runtime_checkable
class ImageProvider(AIProvider, Protocol):
    async def generate_image(self, request: Mapping[str, Any]) -> GenerationProviderResponse: ...


@runtime_checkable
class VideoProvider(AIProvider, Protocol):
    async def generate_video(self, request: Mapping[str, Any]) -> GenerationProviderResponse: ...


@runtime_checkable
class MusicProvider(AIProvider, Protocol):
    async def generate_music(self, request: Mapping[str, Any]) -> GenerationProviderResponse: ...


@runtime_checkable
class SpeechProvider(AIProvider, Protocol):
    async def generate_speech(self, request: Mapping[str, Any]) -> GenerationProviderResponse: ...


@runtime_checkable
class TranscriptionProvider(AIProvider, Protocol):
    async def transcribe(
        self, request: TranscriptionProviderRequest
    ) -> TranscriptionProviderResponse: ...


@runtime_checkable
class AvatarProvider(AIProvider, Protocol):
    async def generate_avatar(self, request: Mapping[str, Any]) -> GenerationProviderResponse: ...


@runtime_checkable
class EmbeddingsProvider(AIProvider, Protocol):
    async def embed(self, texts: Sequence[str]) -> EmbeddingProviderResponse: ...


@runtime_checkable
class AsyncGenerationProvider(AIProvider, Protocol):
    """Contract for real video, music, or avatar asynchronous provider adapters."""

    async def start_generation(
        self, capability: AICapability, request: Mapping[str, Any]
    ) -> GenerationProviderResponse: ...

    async def poll_generation(
        self, capability: AICapability, provider_operation_id: str
    ) -> GenerationProviderResponse: ...

    async def cancel_generation(
        self, capability: AICapability, provider_operation_id: str
    ) -> bool: ...


class ProviderRegistry:
    """Capability registry. Runtime DB refresh never replaces explicitly injected adapters."""

    def __init__(self, providers: Sequence[AIProvider] = ()) -> None:
        self._providers: dict[str, AIProvider] = {}
        self._injected_names: set[str] = set()
        self._database_names: set[str] = set()
        for provider in providers:
            self.register(provider, injected=True)

    def register(self, provider: AIProvider, *, injected: bool = False) -> None:
        if not provider.name or not provider.capabilities:
            raise ValueError("providers require a name and explicit capabilities")
        self._providers[provider.name] = provider
        if injected:
            self._injected_names.add(provider.name)

    async def refresh_from_database(self, db: AsyncSession, settings: Settings) -> None:
        for name in self._database_names - self._injected_names:
            self._providers.pop(name, None)
        self._database_names.clear()
        configurations = (
            await db.scalars(
                select(AIProviderConfiguration)
                .where(AIProviderConfiguration.enabled.is_(True))
                .order_by(AIProviderConfiguration.name)
            )
        ).all()
        for configuration in configurations:
            if configuration.name in self._injected_names:
                continue
            configured_capabilities: set[AICapability] = set()
            for value in configuration.capabilities:
                try:
                    capability = AICapability(value)
                except ValueError:
                    continue
                if capability in OPENAI_COMPATIBLE_CAPABILITIES:
                    configured_capabilities.add(capability)
            if not configured_capabilities:
                continue
            provider = OpenAICompatibleProvider(
                name=configuration.name,
                base_url=configuration.base_url,
                api_key=decrypt_secret(configuration.encrypted_api_credential, settings),
                capabilities=frozenset(configured_capabilities),
                model_mapping={
                    AICapability(key): value
                    for key, value in configuration.model_mapping.items()
                    if key in AICapability._value2member_map_
                },
                pricing_config=configuration.pricing_config,
                production=settings.environment == "production",
            )
            self.register(provider)
            self._database_names.add(configuration.name)

    def resolve(self, capability: AICapability) -> AIProvider:
        for provider in self._providers.values():
            if capability in provider.capabilities:
                return provider
        raise ProviderUnavailableError(capability)

    def providers(self) -> tuple[AIProvider, ...]:
        return tuple(sorted(self._providers.values(), key=lambda item: item.name))

    def capability_status(self) -> dict[AICapability, bool]:
        return {
            capability: any(
                capability in provider.capabilities for provider in self._providers.values()
            )
            for capability in AICapability
        }


class OpenAICompatibleProvider:
    """Real bounded OpenAI-compatible HTTP adapter for explicitly enabled capabilities."""

    def __init__(
        self,
        *,
        name: str,
        base_url: str,
        api_key: str,
        capabilities: frozenset[AICapability],
        model_mapping: Mapping[AICapability, str],
        pricing_config: Mapping[str, Any],
        production: bool,
        timeout_seconds: float = 45,
        max_retries: int = 3,
    ) -> None:
        if production and not base_url.startswith("https://"):
            raise ValueError("AI provider base_url must use HTTPS in production")
        if not api_key:
            raise ValueError("AI provider credential is required")
        unsupported = capabilities - OPENAI_COMPATIBLE_CAPABILITIES
        if unsupported:
            raise ValueError(f"unsupported OpenAI-compatible capabilities: {sorted(unsupported)}")
        if any(capability not in model_mapping for capability in capabilities):
            raise ValueError("every provider capability requires an explicit model mapping")
        self.name = name
        self.base_url = base_url.rstrip("/")
        self._api_key = api_key
        self.capabilities = capabilities
        self._model_mapping = dict(model_mapping)
        self._pricing_config = dict(pricing_config)
        self._timeout = httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 10))
        self._max_retries = max_retries

    def model_for(self, capability: AICapability) -> str:
        if capability not in self.capabilities:
            raise ProviderUnavailableError(capability)
        return self._model_mapping[capability]

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        payload: Mapping[str, Any],
        expect_json: bool = True,
        max_bytes: int = MAX_PROVIDER_RESPONSE_BYTES,
    ) -> tuple[Any, int]:
        started = time.monotonic()
        for attempt in range(self._max_retries + 1):
            try:
                async with (
                    httpx.AsyncClient(
                        timeout=self._timeout,
                        follow_redirects=False,
                    ) as client,
                    client.stream(
                        method,
                        f"{self.base_url}{path}",
                        headers=self._headers(),
                        json=dict(payload),
                    ) as response,
                ):
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > max_bytes:
                            raise ProviderResponseError("provider_response_too_large")
                    if response.status_code == 429 or response.status_code >= 500:
                        if attempt < self._max_retries:
                            await asyncio.sleep(min(2**attempt, 8) + random.uniform(0, 0.25))
                            continue
                        raise ProviderCallError("provider_temporarily_unavailable", retryable=True)
                    if response.status_code < 200 or response.status_code >= 300:
                        raise ProviderCallError("provider_request_rejected")
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt < self._max_retries:
                    await asyncio.sleep(min(2**attempt, 8) + random.uniform(0, 0.25))
                    continue
                raise ProviderCallError("provider_network_error", retryable=True) from exc
            if not expect_json:
                return bytes(body), int((time.monotonic() - started) * 1000)
            try:
                return json.loads(body), int((time.monotonic() - started) * 1000)
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ProviderResponseError("provider_invalid_json") from exc
        raise ProviderCallError("provider_temporarily_unavailable", retryable=True)

    async def _multipart_request(
        self,
        path: str,
        *,
        fields: Mapping[str, str],
        filename: str,
        content_type: str,
        content: bytes,
    ) -> tuple[Any, int]:
        started = time.monotonic()
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
        }
        for attempt in range(self._max_retries + 1):
            try:
                async with (
                    httpx.AsyncClient(
                        timeout=self._timeout,
                        follow_redirects=False,
                    ) as client,
                    client.stream(
                        "POST",
                        f"{self.base_url}{path}",
                        headers=headers,
                        data=dict(fields),
                        files={"file": (filename, content, content_type)},
                    ) as response,
                ):
                    body = bytearray()
                    async for chunk in response.aiter_bytes():
                        body.extend(chunk)
                        if len(body) > MAX_PROVIDER_RESPONSE_BYTES:
                            raise ProviderResponseError("provider_response_too_large")
                    if response.status_code == 429 or response.status_code >= 500:
                        if attempt < self._max_retries:
                            await asyncio.sleep(min(2**attempt, 8) + random.uniform(0, 0.25))
                            continue
                        raise ProviderCallError("provider_temporarily_unavailable", retryable=True)
                    if response.status_code < 200 or response.status_code >= 300:
                        raise ProviderCallError("provider_request_rejected")
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt < self._max_retries:
                    await asyncio.sleep(min(2**attempt, 8) + random.uniform(0, 0.25))
                    continue
                raise ProviderCallError("provider_network_error", retryable=True) from exc
            try:
                return json.loads(body), int((time.monotonic() - started) * 1000)
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ProviderResponseError("provider_invalid_json") from exc
        raise ProviderCallError("provider_temporarily_unavailable", retryable=True)

    def _usage(
        self,
        capability: AICapability,
        model: str,
        raw_usage: Mapping[str, Any] | None,
        *,
        units: int = 0,
    ) -> ProviderUsage:
        raw = raw_usage or {}
        prompt = max(0, int(raw.get("prompt_tokens", raw.get("input_tokens", 0)) or 0))
        completion = max(0, int(raw.get("completion_tokens", raw.get("output_tokens", 0)) or 0))
        price = self._pricing_config.get(model) or self._pricing_config.get(capability.value) or {}
        if not isinstance(price, Mapping):
            price = {}
        prompt_rate = max(0, int(price.get("prompt_micros_per_million", 0) or 0))
        completion_rate = max(0, int(price.get("completion_micros_per_million", 0) or 0))
        unit_rate = max(0, int(price.get("unit_micros", 0) or 0))
        cost = (
            (prompt * prompt_rate + 999_999) // 1_000_000
            + (completion * completion_rate + 999_999) // 1_000_000
            + units * unit_rate
        )
        return ProviderUsage(prompt_units=prompt, completion_units=completion, cost_micros=cost)

    async def chat(self, request: ChatProviderRequest) -> ChatProviderResponse:
        model = self.model_for(AICapability.chat)
        messages = [dict(message) for message in request.messages]
        if request.grounding_sources:
            grounding = "\n".join(
                f"[{source.source_type}:{source.source_id}] {source.context}"
                for source in request.grounding_sources
            )
            messages.insert(
                0,
                {
                    "role": "system",
                    "content": (
                        "Use only these authorized sources when grounding factual account claims. "
                        f"Cite source identifiers exactly.\n{grounding}"
                    ),
                },
            )
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": request.max_completion_units,
        }
        if request.tools:
            payload["tools"] = [
                {"type": "function", "function": dict(tool)} for tool in request.tools
            ]
            payload["tool_choice"] = "auto"
        data, _ = await self._request("POST", "/chat/completions", payload=payload)
        try:
            choice = data["choices"][0]["message"]
            content = choice.get("content") or ""
            if not isinstance(content, str):
                raise TypeError
            proposals: list[ProviderToolProposal] = []
            for item in choice.get("tool_calls", []):
                function = item["function"]
                arguments = json.loads(function["arguments"])
                if not isinstance(arguments, dict):
                    raise TypeError
                proposals.append(
                    ProviderToolProposal(
                        tool_name=str(function["name"]),
                        typed_input=arguments,
                    )
                )
            usage = self._usage(AICapability.chat, model, data.get("usage"))
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ProviderResponseError("provider_invalid_chat_response") from exc
        return ChatProviderResponse(
            content=content,
            model=model,
            usage=usage,
            tool_proposals=proposals,
        )

    async def stream_chat(self, request: ChatProviderRequest) -> AsyncIterator[ChatStreamEvent]:
        model = self.model_for(AICapability.chat)
        messages = [dict(message) for message in request.messages]
        if request.grounding_sources:
            grounding = "\n".join(
                f"[{source.source_type}:{source.source_id}] {source.context}"
                for source in request.grounding_sources
            )
            messages.insert(0, {"role": "system", "content": grounding})
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": request.max_completion_units,
            "stream": True,
            "stream_options": {"include_usage": True},
        }
        if request.tools:
            payload["tools"] = [
                {"type": "function", "function": dict(tool)} for tool in request.tools
            ]
        collected: list[str] = []
        raw_usage: Mapping[str, Any] = {}
        tool_parts: dict[int, dict[str, str]] = {}
        total_bytes = 0
        try:
            async with (
                httpx.AsyncClient(timeout=self._timeout, follow_redirects=False) as client,
                client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers={**self._headers(), "Accept": "text/event-stream"},
                    json=payload,
                ) as response,
            ):
                if response.status_code == 429 or response.status_code >= 500:
                    raise ProviderCallError("provider_temporarily_unavailable", retryable=True)
                if response.status_code < 200 or response.status_code >= 300:
                    raise ProviderCallError("provider_request_rejected")
                async for line in response.aiter_lines():
                    total_bytes += len(line.encode("utf-8"))
                    if total_bytes > MAX_PROVIDER_RESPONSE_BYTES:
                        raise ProviderResponseError("provider_response_too_large")
                    if not line.startswith("data:"):
                        continue
                    encoded = line[5:].strip()
                    if encoded == "[DONE]":
                        break
                    data = json.loads(encoded)
                    if isinstance(data.get("usage"), dict):
                        raw_usage = data["usage"]
                    # OpenAI often sends a final usage-only chunk with choices: [].
                    # data.get("choices", [{}]) still returns [] when the key exists.
                    choices = data.get("choices")
                    if not isinstance(choices, list) or not choices:
                        continue
                    first = choices[0] if isinstance(choices[0], dict) else {}
                    delta = first.get("delta") or {}
                    if not isinstance(delta, dict):
                        delta = {}
                    text_delta = delta.get("content") or ""
                    if text_delta:
                        if not isinstance(text_delta, str):
                            raise TypeError
                        collected.append(text_delta)
                        yield ChatStreamEvent(text_delta=text_delta)
                    for tool_call in delta.get("tool_calls", []) or []:
                        if not isinstance(tool_call, dict):
                            continue
                        index = int(tool_call.get("index", 0))
                        current = tool_parts.setdefault(index, {"name": "", "arguments": ""})
                        function = tool_call.get("function", {})
                        if not isinstance(function, dict):
                            function = {}
                        current["name"] += str(function.get("name", ""))
                        current["arguments"] += str(function.get("arguments", ""))
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderCallError("provider_network_error", retryable=True) from exc
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ProviderResponseError("provider_invalid_chat_stream") from exc
        proposals: list[ProviderToolProposal] = []
        for item in tool_parts.values():
            try:
                arguments = json.loads(item["arguments"])
            except json.JSONDecodeError as exc:
                raise ProviderResponseError("provider_invalid_tool_arguments") from exc
            if not item["name"] or not isinstance(arguments, dict):
                raise ProviderResponseError("provider_invalid_tool_arguments")
            proposals.append(ProviderToolProposal(item["name"], arguments))
        yield ChatStreamEvent(
            final=ChatProviderResponse(
                content="".join(collected),
                model=model,
                usage=self._usage(AICapability.chat, model, raw_usage),
                tool_proposals=proposals,
            )
        )

    async def moderate(self, text: str) -> ModerationProviderResponse:
        model = self.model_for(AICapability.moderation)
        data, _ = await self._request(
            "POST",
            "/moderations",
            payload={"model": model, "input": text},
        )
        try:
            result = data["results"][0]
            scores = {
                str(key): min(1.0, max(0.0, float(value)))
                for key, value in result.get("category_scores", {}).items()
            }
            confidence = max(scores.values(), default=float(bool(result.get("flagged"))))
            recommendation = "review" if result.get("flagged") else "allow"
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise ProviderResponseError("provider_invalid_moderation_response") from exc
        return ModerationProviderResponse(
            recommendation=recommendation,
            confidence=confidence,
            categories=scores,
            model=model,
            usage=self._usage(AICapability.moderation, model, data.get("usage")),
        )

    async def generate_image(self, request: Mapping[str, Any]) -> GenerationProviderResponse:
        model = self.model_for(AICapability.image)
        count = int(request.get("count", 1))
        data, _ = await self._request(
            "POST",
            "/images/generations",
            payload={
                "model": model,
                "prompt": request["prompt"],
                "size": request.get("size", "1024x1024"),
                "n": count,
                "response_format": "b64_json",
            },
            max_bytes=MAX_GENERATED_ASSET_BYTES,
        )
        assets: list[GeneratedAsset] = []
        try:
            for item in data["data"]:
                content = base64.b64decode(item["b64_json"], validate=True)
                if not content or len(content) > MAX_GENERATED_ASSET_BYTES:
                    raise ValueError
                assets.append(GeneratedAsset(content=content, content_type="image/png"))
        except (KeyError, TypeError, ValueError, binascii.Error) as exc:
            raise ProviderResponseError("provider_invalid_image_response") from exc
        return GenerationProviderResponse(
            model=model,
            usage=self._usage(AICapability.image, model, data.get("usage"), units=len(assets)),
            assets=assets,
        )

    async def generate_speech(self, request: Mapping[str, Any]) -> GenerationProviderResponse:
        model = self.model_for(AICapability.voice)
        output_format = str(request.get("output_format", "mp3"))
        data, _ = await self._request(
            "POST",
            "/audio/speech",
            payload={
                "model": model,
                "input": request["text"],
                "voice": request["voice"],
                "response_format": output_format,
            },
            expect_json=False,
            max_bytes=MAX_GENERATED_ASSET_BYTES,
        )
        content_type = "audio/mpeg" if output_format == "mp3" else "audio/wav"
        return GenerationProviderResponse(
            model=model,
            usage=self._usage(AICapability.voice, model, None, units=1),
            assets=[GeneratedAsset(content=data, content_type=content_type)],
        )

    async def transcribe(
        self, request: TranscriptionProviderRequest
    ) -> TranscriptionProviderResponse:
        model = self.model_for(AICapability.voice)
        fields = {"model": model, "response_format": "json"}
        if request.language:
            fields["language"] = request.language
        if request.prompt:
            fields["prompt"] = request.prompt
        data, _ = await self._multipart_request(
            "/audio/transcriptions",
            fields=fields,
            filename=request.filename,
            content_type=request.content_type,
            content=request.audio,
        )
        try:
            text = data["text"]
            if not isinstance(text, str):
                raise TypeError
            language = data.get("language")
            if language is not None and not isinstance(language, str):
                raise TypeError
            raw_duration = data.get("duration")
            duration = float(raw_duration) if raw_duration is not None else None
            usage = self._usage(AICapability.voice, model, data.get("usage"), units=1)
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderResponseError("provider_invalid_transcription_response") from exc
        return TranscriptionProviderResponse(
            text=text,
            model=model,
            usage=usage,
            language=language,
            duration_seconds=duration,
        )

    async def embed(self, texts: Sequence[str]) -> EmbeddingProviderResponse:
        model = self.model_for(AICapability.embeddings)
        data, _ = await self._request(
            "POST",
            "/embeddings",
            payload={"model": model, "input": list(texts)},
        )
        try:
            ordered = sorted(data["data"], key=lambda item: int(item["index"]))
            vectors = [[float(component) for component in item["embedding"]] for item in ordered]
            if len(vectors) != len(texts):
                raise ValueError
        except (KeyError, TypeError, ValueError) as exc:
            raise ProviderResponseError("provider_invalid_embedding_response") from exc
        return EmbeddingProviderResponse(
            vectors=vectors,
            model=model,
            usage=self._usage(AICapability.embeddings, model, data.get("usage")),
        )


class DeepgramTranscriptionProvider:
    """Dedicated STT adapter sourced from the existing encrypted owner configuration."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str = "https://api.deepgram.com/v1",
        timeout_seconds: float = 45,
    ) -> None:
        self.name = "owner-stt-deepgram"
        self.capabilities = frozenset({AICapability.voice})
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")
        self._timeout = httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 10))

    def model_for(self, capability: AICapability) -> str:
        if capability != AICapability.voice:
            raise ProviderUnavailableError(capability)
        return self._model

    async def transcribe(
        self, request: TranscriptionProviderRequest
    ) -> TranscriptionProviderResponse:
        params: dict[str, str] = {"model": self._model, "smart_format": "true"}
        if request.language:
            params["language"] = request.language
        try:
            async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=False) as client:
                response = await client.post(
                    f"{self._base_url}/listen",
                    params=params,
                    headers={
                        "Authorization": f"Token {self._api_key}",
                        "Content-Type": request.content_type,
                        "Accept": "application/json",
                    },
                    content=request.audio,
                )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise ProviderCallError("provider_network_error", retryable=True) from exc
        if response.status_code == 429 or response.status_code >= 500:
            raise ProviderCallError("provider_temporarily_unavailable", retryable=True)
        if response.status_code < 200 or response.status_code >= 300:
            raise ProviderCallError("provider_request_rejected")
        if len(response.content) > MAX_PROVIDER_RESPONSE_BYTES:
            raise ProviderResponseError("provider_response_too_large")
        try:
            data = response.json()
            alternative = data["results"]["channels"][0]["alternatives"][0]
            text = alternative["transcript"]
            if not isinstance(text, str):
                raise TypeError
            metadata = data.get("metadata") or {}
            language = alternative.get("languages", [None])[0]
            duration = metadata.get("duration")
        except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ProviderResponseError("provider_invalid_transcription_response") from exc
        return TranscriptionProviderResponse(
            text=text,
            model=self._model,
            language=str(language) if language else request.language,
            duration_seconds=float(duration) if duration is not None else None,
        )


def owner_configured_transcription_provider() -> TranscriptionProvider | None:
    """Resolve the already-existing owner STT config without mutating its catalog or schema."""
    from app.owner_config_store import owner_config_store

    if not owner_config_store.is_enabled("speech_to_text"):
        return None
    api_key = owner_config_store.get("STT_API_KEY")
    if not api_key:
        return None
    provider = (owner_config_store.get("STT_PROVIDER") or "openai").strip().lower()
    model = owner_config_store.get("STT_MODEL") or "whisper-1"
    base_url = owner_config_store.get("STT_BASE_URL")
    if provider == "deepgram":
        if not base_url or "api.openai.com" in base_url:
            base_url = "https://api.deepgram.com/v1"
        if model == "whisper-1":
            model = "nova-3"
        return DeepgramTranscriptionProvider(
            api_key=api_key,
            model=model,
            base_url=base_url,
        )
    if provider not in {"openai", "openai-compatible"}:
        return None
    return OpenAICompatibleProvider(
        name="owner-stt-openai",
        base_url=base_url or "https://api.openai.com/v1",
        api_key=api_key,
        capabilities=frozenset({AICapability.voice}),
        model_mapping={AICapability.voice: model},
        pricing_config={},
        production=False,
    )
