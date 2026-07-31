from __future__ import annotations

import asyncio
import base64
import binascii
import hashlib
import hmac
import ipaddress
import json
import random
import uuid
import xml.etree.ElementTree as ET
from collections.abc import AsyncIterator, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol, runtime_checkable
from urllib.parse import quote, urlencode, urlparse

import httpx
import websockets
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from app.config import Settings
from app.live_models import (
    IntegrationPlatform,
    LiveCapability,
    LiveNormalizedEventType,
)

MAX_ADAPTER_RESPONSE_BYTES = 4 * 1024 * 1024
YOUTUBE_API = "https://www.googleapis.com/youtube/v3"
YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token"
YOUTUBE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TWITCH_HELIX = "https://api.twitch.tv/helix"
TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/authorize"
DISCORD_API = "https://discord.com/api/v10"
DISCORD_GATEWAY = "wss://gateway.discord.gg/?v=10&encoding=json"


class AdapterError(Exception):
    def __init__(
        self,
        code: str,
        *,
        retryable: bool = False,
        revoked: bool = False,
        status_code: int | None = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.revoked = revoked
        self.status_code = status_code


@dataclass(frozen=True)
class AdapterConnectionContext:
    connection_id: uuid.UUID
    platform: IntegrationPlatform
    access_credential: str | None
    refresh_credential: str | None
    connection_secret: str | None
    scopes: frozenset[str]
    external_account_id: str | None
    external_channel_id: str | None
    safe_configuration: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AdapterConnectionResult:
    verified_capabilities: frozenset[LiveCapability]
    external_account_id: str | None = None
    external_channel_id: str | None = None
    provider_metadata: Mapping[str, Any] = field(default_factory=dict)
    refreshed_access_credential: str | None = None
    refreshed_refresh_credential: str | None = None
    token_expires_at: datetime | None = None


@dataclass(frozen=True)
class AdapterHealth:
    ok: bool
    status: str
    verified_capabilities: frozenset[LiveCapability] = frozenset()
    provider_metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AdapterActionResult:
    provider_reference: str
    external_broadcast_id: str | None = None


@dataclass(frozen=True)
class AdapterInboundEvent:
    platform_event_id: str
    event_type: LiveNormalizedEventType
    occurred_at: datetime
    actor_platform_id: str | None = None
    actor_display_name: str | None = None
    text: str | None = None
    monetary_minor: int | None = None
    currency: str | None = None
    safe_metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class PlatformDescriptor:
    platform: IntegrationPlatform
    available: bool
    status: str
    potential_capabilities: frozenset[LiveCapability]
    limitation: str | None = None


@runtime_checkable
class PlatformAdapter(Protocol):
    platform: IntegrationPlatform
    potential_capabilities: frozenset[LiveCapability]

    def descriptor(self) -> PlatformDescriptor: ...

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult: ...

    async def refresh(self, context: AdapterConnectionContext) -> AdapterConnectionResult: ...

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth: ...

    async def disconnect(self, context: AdapterConnectionContext) -> None: ...

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str: ...

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]: ...

    def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]: ...

    async def send_chat(
        self, context: AdapterConnectionContext, text: str
    ) -> AdapterActionResult: ...

    async def moderate(
        self, context: AdapterConnectionContext, action: Mapping[str, Any]
    ) -> AdapterActionResult: ...

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult: ...

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult: ...

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult: ...


class BasePlatformAdapter:
    platform: IntegrationPlatform
    potential_capabilities: frozenset[LiveCapability] = frozenset()
    status = "requires_connection_credential"
    limitation: str | None = None

    def descriptor(self) -> PlatformDescriptor:
        return PlatformDescriptor(
            platform=self.platform,
            available=True,
            status=self.status,
            potential_capabilities=self.potential_capabilities,
            limitation=self.limitation,
        )

    async def refresh(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        raise AdapterError("token_refresh_unavailable")

    async def disconnect(self, context: AdapterConnectionContext) -> None:
        return None

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        raise AdapterError("webhook_transport_unavailable")

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        raise AdapterError("webhook_transport_unavailable")

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        if False:
            yield AdapterInboundEvent(
                platform_event_id="",
                event_type=LiveNormalizedEventType.custom,
                occurred_at=datetime.now(UTC),
            )
        raise AdapterError("event_stream_unavailable")

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        raise AdapterError("chat_send_unavailable")

    async def moderate(
        self, context: AdapterConnectionContext, action: Mapping[str, Any]
    ) -> AdapterActionResult:
        raise AdapterError("moderation_unavailable")

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult:
        raise AdapterError("broadcast_create_unavailable")

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        raise AdapterError("broadcast_update_unavailable")

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult:
        raise AdapterError("broadcast_end_unavailable")


class UnavailablePlatformAdapter(BasePlatformAdapter):
    def __init__(self, platform: IntegrationPlatform, reason: str) -> None:
        self.platform = platform
        self.reason = reason

    def descriptor(self) -> PlatformDescriptor:
        return PlatformDescriptor(
            platform=self.platform,
            available=False,
            status=self.reason,
            potential_capabilities=frozenset(),
            limitation=(
                "An approved official provider endpoint, credentials, scopes, and explicit "
                "capability grant are required. Scraping and unofficial transports are not used."
            ),
        )

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        raise AdapterError(self.reason)

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        return AdapterHealth(ok=False, status=self.reason)


def _bounded_json(response: httpx.Response) -> Any:
    if len(response.content) > MAX_ADAPTER_RESPONSE_BYTES:
        raise AdapterError("provider_response_too_large")
    try:
        return response.json()
    except ValueError as exc:
        raise AdapterError("provider_invalid_json") from exc


def _parse_provider_time(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return datetime.now(UTC)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


class YouTubeAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.youtube
    potential_capabilities = frozenset(
        {
            LiveCapability.chat_read,
            LiveCapability.chat_send,
            LiveCapability.events,
            LiveCapability.analytics,
            LiveCapability.broadcast_create,
            LiveCapability.broadcast_update,
            LiveCapability.broadcast_end,
        }
    )
    SCOPE_READ = "https://www.googleapis.com/auth/youtube.readonly"
    SCOPE_MANAGE = "https://www.googleapis.com/auth/youtube"
    SCOPE_FORCE_SSL = "https://www.googleapis.com/auth/youtube.force-ssl"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    def authorization_url(self, state: str, code_challenge: str, scopes: Sequence[str]) -> str:
        if not (
            self.settings.youtube_client_id
            and self.settings.youtube_client_secret
            and self.settings.youtube_redirect_uri
        ):
            raise AdapterError("youtube_oauth_unconfigured")
        query = urlencode(
            {
                "client_id": self.settings.youtube_client_id,
                "redirect_uri": self.settings.youtube_redirect_uri,
                "response_type": "code",
                "scope": " ".join(scopes),
                "access_type": "offline",
                "include_granted_scopes": "true",
                "prompt": "consent",
                "state": state,
                "code_challenge": code_challenge,
                "code_challenge_method": "S256",
            }
        )
        return f"{YOUTUBE_AUTH_URL}?{query}"

    async def exchange_code(self, code: str, verifier: str) -> Mapping[str, Any]:
        if not (
            self.settings.youtube_client_id
            and self.settings.youtube_client_secret
            and self.settings.youtube_redirect_uri
        ):
            raise AdapterError("youtube_oauth_unconfigured")
        data = {
            "client_id": self.settings.youtube_client_id,
            "client_secret": self.settings.youtube_client_secret.get_secret_value(),
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": self.settings.youtube_redirect_uri,
        }
        async with self._http() as client:
            response = await client.post(YOUTUBE_TOKEN_URL, data=data)
        if response.status_code >= 400:
            raise AdapterError(
                "youtube_oauth_exchange_failed",
                retryable=response.status_code >= 500,
                status_code=response.status_code,
            )
        result = _bounded_json(response)
        return result if isinstance(result, Mapping) else {}

    def _http(self) -> httpx.AsyncClient:
        return self._client or httpx.AsyncClient(timeout=httpx.Timeout(15, connect=5))

    async def _request(
        self,
        context: AdapterConnectionContext,
        method: str,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
    ) -> Any:
        if not context.access_credential:
            raise AdapterError("youtube_access_token_required")
        try:
            if self._client:
                response = await self._client.request(
                    method,
                    f"{YOUTUBE_API}/{path}",
                    params=params,
                    json=json_body,
                    headers={"Authorization": f"Bearer {context.access_credential}"},
                )
            else:
                async with self._http() as client:
                    response = await client.request(
                        method,
                        f"{YOUTUBE_API}/{path}",
                        params=params,
                        json=json_body,
                        headers={"Authorization": f"Bearer {context.access_credential}"},
                    )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("youtube_transport_error", retryable=True) from exc
        if response.status_code >= 400:
            payload = _bounded_json(response)
            reason = ""
            if isinstance(payload, Mapping):
                errors = payload.get("error", {})
                if isinstance(errors, Mapping):
                    entries = errors.get("errors", [])
                    if isinstance(entries, list) and entries and isinstance(entries[0], Mapping):
                        reason = str(entries[0].get("reason", ""))
            if reason in {"quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"}:
                raise AdapterError(
                    "youtube_quota_exceeded",
                    retryable=reason == "rateLimitExceeded",
                    status_code=response.status_code,
                )
            raise AdapterError(
                "youtube_permission_revoked"
                if response.status_code in {401, 403}
                else "youtube_api_error",
                retryable=response.status_code == 429 or response.status_code >= 500,
                revoked=response.status_code in {401, 403},
                status_code=response.status_code,
            )
        return _bounded_json(response)

    def _scoped_capabilities(
        self, scopes: frozenset[str], *, has_channel: bool
    ) -> frozenset[LiveCapability]:
        capabilities: set[LiveCapability] = set()
        if has_channel and scopes & {self.SCOPE_READ, self.SCOPE_MANAGE, self.SCOPE_FORCE_SSL}:
            capabilities.update(
                {LiveCapability.chat_read, LiveCapability.events, LiveCapability.analytics}
            )
        if has_channel and self.SCOPE_FORCE_SSL in scopes:
            capabilities.add(LiveCapability.chat_send)
        if has_channel and self.SCOPE_MANAGE in scopes:
            capabilities.update(
                {
                    LiveCapability.broadcast_create,
                    LiveCapability.broadcast_update,
                    LiveCapability.broadcast_end,
                }
            )
        return frozenset(capabilities)

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        payload = await self._request(
            context, "GET", "channels", params={"part": "id,snippet", "mine": "true"}
        )
        items = payload.get("items", []) if isinstance(payload, Mapping) else []
        if not items or not isinstance(items[0], Mapping):
            raise AdapterError("youtube_channel_unavailable")
        channel = items[0]
        channel_id = str(channel.get("id", ""))
        if not channel_id:
            raise AdapterError("youtube_channel_unavailable")
        capabilities = self._scoped_capabilities(context.scopes, has_channel=True)
        return AdapterConnectionResult(
            verified_capabilities=capabilities,
            external_account_id=channel_id,
            external_channel_id=context.external_channel_id or channel_id,
            provider_metadata={"channel_verified": True},
        )

    async def refresh(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        if not (
            context.refresh_credential
            and self.settings.youtube_client_id
            and self.settings.youtube_client_secret
        ):
            raise AdapterError("youtube_refresh_unavailable")
        data = {
            "client_id": self.settings.youtube_client_id,
            "client_secret": self.settings.youtube_client_secret.get_secret_value(),
            "refresh_token": context.refresh_credential,
            "grant_type": "refresh_token",
        }
        async with self._http() as client:
            response = await client.post(YOUTUBE_TOKEN_URL, data=data)
        if response.status_code >= 400:
            raise AdapterError(
                "youtube_refresh_revoked",
                revoked=response.status_code in {400, 401},
                retryable=response.status_code >= 500,
            )
        payload = _bounded_json(response)
        if not isinstance(payload, Mapping) or not payload.get("access_token"):
            raise AdapterError("youtube_refresh_invalid_response")
        expires = int(payload.get("expires_in", 3600))
        return AdapterConnectionResult(
            verified_capabilities=self._scoped_capabilities(context.scopes, has_channel=True),
            refreshed_access_credential=str(payload["access_token"]),
            token_expires_at=datetime.fromtimestamp(datetime.now(UTC).timestamp() + expires, UTC),
        )

    async def disconnect(self, context: AdapterConnectionContext) -> None:
        token = context.refresh_credential or context.access_credential
        if not token:
            return
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": token},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
        if response.status_code != 200:
            raise AdapterError(
                "youtube_token_revocation_failed",
                retryable=response.status_code >= 500,
            )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            result = await self.connect(context)
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=result.verified_capabilities,
                provider_metadata=result.provider_metadata,
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        if not context.connection_secret:
            raise AdapterError("youtube_webhook_secret_unconfigured")
        supplied = headers.get("x-hub-signature", "")
        algorithm, _, signature = supplied.partition("=")
        if algorithm.lower() != "sha1" or not signature:
            raise AdapterError("youtube_webhook_signature_missing")
        expected = hmac.new(context.connection_secret.encode(), body, hashlib.sha1).hexdigest()
        if not hmac.compare_digest(signature.lower(), expected):
            raise AdapterError("youtube_webhook_signature_invalid")
        return hashlib.sha256(body).hexdigest()

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        try:
            root = ET.fromstring(body)
        except ET.ParseError as exc:
            raise AdapterError("youtube_webhook_invalid_xml") from exc
        namespace = {
            "atom": "http://www.w3.org/2005/Atom",
            "yt": "http://www.youtube.com/xml/schemas/2015",
        }
        events: list[AdapterInboundEvent] = []
        for entry in root.findall("atom:entry", namespace):
            video_id = entry.findtext("yt:videoId", default="", namespaces=namespace)
            published = entry.findtext("atom:published", default="", namespaces=namespace)
            channel_id = entry.findtext("yt:channelId", default="", namespaces=namespace)
            event_id = video_id or hashlib.sha256(ET.tostring(entry)).hexdigest()
            events.append(
                AdapterInboundEvent(
                    platform_event_id=event_id,
                    event_type=LiveNormalizedEventType.stream_status,
                    occurred_at=_parse_provider_time(published),
                    actor_platform_id=channel_id or None,
                    safe_metadata={"video_id": video_id, "source": "youtube_pubsub"},
                )
            )
        return events

    async def list_live_chat(
        self, context: AdapterConnectionContext, live_chat_id: str, page_token: str | None = None
    ) -> Mapping[str, Any]:
        params = {
            "part": "id,snippet,authorDetails",
            "liveChatId": live_chat_id,
            "maxResults": 200,
        }
        if page_token:
            params["pageToken"] = page_token
        payload = await self._request(context, "GET", "liveChat/messages", params=params)
        return payload if isinstance(payload, Mapping) else {}

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        live_chat_id = str(context.safe_configuration.get("live_chat_id", ""))
        if not live_chat_id:
            raise AdapterError("youtube_live_chat_id_required")
        page_token: str | None = None
        while True:
            payload = await self.list_live_chat(context, live_chat_id, page_token)
            items = payload.get("items", [])
            for item in items if isinstance(items, list) else []:
                if not isinstance(item, Mapping):
                    continue
                snippet = item.get("snippet", {})
                author = item.get("authorDetails", {})
                if not isinstance(snippet, Mapping) or not isinstance(author, Mapping):
                    continue
                event_kind = str(snippet.get("type", ""))
                details = snippet.get("textMessageDetails", {})
                text = str(details.get("messageText", "")) if isinstance(details, Mapping) else None
                normalized_type = {
                    "textMessageEvent": LiveNormalizedEventType.chat,
                    "newSponsorEvent": LiveNormalizedEventType.subscription,
                    "memberMilestoneChatEvent": LiveNormalizedEventType.subscription,
                    "superChatEvent": LiveNormalizedEventType.donation,
                    "superStickerEvent": LiveNormalizedEventType.platform_gift,
                    "messageDeletedEvent": LiveNormalizedEventType.moderation,
                    "userBannedEvent": LiveNormalizedEventType.moderation,
                }.get(event_kind, LiveNormalizedEventType.custom)
                metadata: dict[str, Any] = {"youtube_event_type": event_kind}
                for details_key in ("superChatDetails", "superStickerDetails"):
                    monetary = snippet.get(details_key)
                    if isinstance(monetary, Mapping):
                        if isinstance(monetary.get("amountMicros"), int):
                            metadata["amount_micros"] = monetary["amountMicros"]
                        if monetary.get("currency"):
                            metadata["currency"] = str(monetary["currency"])
                yield AdapterInboundEvent(
                    platform_event_id=str(item.get("id", "")),
                    event_type=normalized_type,
                    occurred_at=_parse_provider_time(str(snippet.get("publishedAt", ""))),
                    actor_platform_id=str(author.get("channelId", "")) or None,
                    actor_display_name=str(author.get("displayName", "")) or None,
                    text=text,
                    safe_metadata=metadata,
                )
            page_token_value = payload.get("nextPageToken")
            page_token = str(page_token_value) if page_token_value is not None else page_token
            interval_ms = payload.get("pollingIntervalMillis", 5000)
            interval = (
                max(1, min(float(interval_ms) / 1000, 30))
                if isinstance(interval_ms, (int, float))
                else 5
            )
            await asyncio.sleep(interval)

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        live_chat_id = str(context.safe_configuration.get("live_chat_id", ""))
        if not live_chat_id:
            raise AdapterError("youtube_live_chat_id_required")
        payload = await self._request(
            context,
            "POST",
            "liveChat/messages",
            params={"part": "snippet"},
            json_body={
                "snippet": {
                    "liveChatId": live_chat_id,
                    "type": "textMessageEvent",
                    "textMessageDetails": {"messageText": text},
                }
            },
        )
        reference = str(payload.get("id", "")) if isinstance(payload, Mapping) else ""
        if not reference:
            raise AdapterError("youtube_chat_invalid_response")
        return AdapterActionResult(provider_reference=reference)

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult:
        payload = await self._request(
            context,
            "POST",
            "liveBroadcasts",
            params={"part": "snippet,status,contentDetails"},
            json_body={
                "snippet": {
                    "title": str(configuration["title"]),
                    "scheduledStartTime": str(configuration["scheduled_start_time"]),
                },
                "status": {"privacyStatus": str(configuration.get("privacy_status", "private"))},
                "contentDetails": {
                    "enableAutoStart": False,
                    "enableAutoStop": False,
                    "enableDvr": bool(configuration.get("enable_dvr", True)),
                    "recordFromStart": bool(configuration.get("record_from_start", False)),
                },
            },
        )
        broadcast_id = str(payload.get("id", "")) if isinstance(payload, Mapping) else ""
        if not broadcast_id:
            raise AdapterError("youtube_broadcast_invalid_response")
        return AdapterActionResult(
            provider_reference=broadcast_id, external_broadcast_id=broadcast_id
        )

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        status = str(configuration.get("broadcast_status", "live"))
        payload = await self._request(
            context,
            "POST",
            "liveBroadcasts/transition",
            params={"part": "status", "id": external_broadcast_id, "broadcastStatus": status},
        )
        reference = str(payload.get("id", external_broadcast_id))
        return AdapterActionResult(
            provider_reference=reference, external_broadcast_id=external_broadcast_id
        )

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult:
        return await self.update_broadcast(
            context, external_broadcast_id, {"broadcast_status": "complete"}
        )


class TwitchAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.twitch
    potential_capabilities = frozenset(
        {
            LiveCapability.chat_read,
            LiveCapability.chat_send,
            LiveCapability.events,
            LiveCapability.moderation_delete,
            LiveCapability.moderation_timeout,
            LiveCapability.analytics,
        }
    )

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    def authorization_url(self, state: str, code_challenge: str, scopes: Sequence[str]) -> str:
        if not (
            self.settings.twitch_client_id
            and self.settings.twitch_client_secret
            and self.settings.twitch_redirect_uri
        ):
            raise AdapterError("twitch_oauth_unconfigured")
        return f"{TWITCH_AUTH_URL}?{
            urlencode(
                {
                    'client_id': self.settings.twitch_client_id,
                    'redirect_uri': self.settings.twitch_redirect_uri,
                    'response_type': 'code',
                    'scope': ' '.join(scopes),
                    'state': state,
                    'code_challenge': code_challenge,
                    'code_challenge_method': 'S256',
                }
            )
        }"

    async def exchange_code(self, code: str, verifier: str) -> Mapping[str, Any]:
        if not (
            self.settings.twitch_client_id
            and self.settings.twitch_client_secret
            and self.settings.twitch_redirect_uri
        ):
            raise AdapterError("twitch_oauth_unconfigured")
        data = {
            "client_id": self.settings.twitch_client_id,
            "client_secret": self.settings.twitch_client_secret.get_secret_value(),
            "code": code,
            "code_verifier": verifier,
            "grant_type": "authorization_code",
            "redirect_uri": self.settings.twitch_redirect_uri,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(TWITCH_TOKEN_URL, data=data)
        if response.status_code >= 400:
            raise AdapterError(
                "twitch_oauth_exchange_failed",
                retryable=response.status_code >= 500,
                status_code=response.status_code,
            )
        payload = _bounded_json(response)
        return payload if isinstance(payload, Mapping) else {}

    async def _request(
        self,
        context: AdapterConnectionContext,
        method: str,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
        json_body: Mapping[str, Any] | None = None,
    ) -> Any:
        if not context.access_credential or not self.settings.twitch_client_id:
            raise AdapterError("twitch_credentials_required")
        headers = {
            "Authorization": f"Bearer {context.access_credential}",
            "Client-Id": self.settings.twitch_client_id,
        }
        try:
            if self._client:
                response = await self._client.request(
                    method,
                    f"{TWITCH_HELIX}/{path}",
                    params=params,
                    json=json_body,
                    headers=headers,
                )
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(15, connect=5)) as client:
                    response = await client.request(
                        method,
                        f"{TWITCH_HELIX}/{path}",
                        params=params,
                        json=json_body,
                        headers=headers,
                    )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("twitch_transport_error", retryable=True) from exc
        if response.status_code >= 400:
            raise AdapterError(
                "twitch_permission_revoked"
                if response.status_code in {401, 403}
                else "twitch_api_error",
                retryable=response.status_code == 429 or response.status_code >= 500,
                revoked=response.status_code in {401, 403},
                status_code=response.status_code,
            )
        if response.status_code == 204:
            return {}
        return _bounded_json(response)

    def _scoped_capabilities(self, scopes: frozenset[str]) -> frozenset[LiveCapability]:
        capabilities: set[LiveCapability] = {LiveCapability.events}
        if "user:read:chat" in scopes:
            capabilities.add(LiveCapability.chat_read)
        if "user:write:chat" in scopes:
            capabilities.add(LiveCapability.chat_send)
        if "moderator:manage:chat_messages" in scopes:
            capabilities.add(LiveCapability.moderation_delete)
        if "moderator:manage:banned_users" in scopes:
            capabilities.add(LiveCapability.moderation_timeout)
        if "analytics:read:games" in scopes:
            capabilities.add(LiveCapability.analytics)
        return frozenset(capabilities)

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        payload = await self._request(context, "GET", "users")
        data = payload.get("data", []) if isinstance(payload, Mapping) else []
        if not data or not isinstance(data[0], Mapping):
            raise AdapterError("twitch_account_unavailable")
        user_id = str(data[0].get("id", ""))
        if not user_id:
            raise AdapterError("twitch_account_unavailable")
        return AdapterConnectionResult(
            verified_capabilities=self._scoped_capabilities(context.scopes),
            external_account_id=user_id,
            external_channel_id=context.external_channel_id or user_id,
            provider_metadata={"account_verified": True},
        )

    async def refresh(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        if not (
            context.refresh_credential
            and self.settings.twitch_client_id
            and self.settings.twitch_client_secret
        ):
            raise AdapterError("twitch_refresh_unavailable")
        data = {
            "client_id": self.settings.twitch_client_id,
            "client_secret": self.settings.twitch_client_secret.get_secret_value(),
            "grant_type": "refresh_token",
            "refresh_token": context.refresh_credential,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(TWITCH_TOKEN_URL, data=data)
        if response.status_code >= 400:
            raise AdapterError(
                "twitch_refresh_revoked",
                revoked=response.status_code in {400, 401},
                retryable=response.status_code >= 500,
            )
        payload = _bounded_json(response)
        if not isinstance(payload, Mapping) or not payload.get("access_token"):
            raise AdapterError("twitch_refresh_invalid_response")
        expires = int(payload.get("expires_in", 3600))
        return AdapterConnectionResult(
            verified_capabilities=self._scoped_capabilities(context.scopes),
            refreshed_access_credential=str(payload["access_token"]),
            refreshed_refresh_credential=str(
                payload.get("refresh_token", context.refresh_credential)
            ),
            token_expires_at=datetime.fromtimestamp(datetime.now(UTC).timestamp() + expires, UTC),
        )

    async def disconnect(self, context: AdapterConnectionContext) -> None:
        if not context.access_credential or not self.settings.twitch_client_id:
            return
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                "https://id.twitch.tv/oauth2/revoke",
                data={
                    "client_id": self.settings.twitch_client_id,
                    "token": context.access_credential,
                },
            )
        if response.status_code != 200:
            raise AdapterError(
                "twitch_token_revocation_failed",
                retryable=response.status_code >= 500,
            )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            result = await self.connect(context)
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=result.verified_capabilities,
                provider_metadata=result.provider_metadata,
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        if not context.connection_secret:
            raise AdapterError("twitch_eventsub_secret_unconfigured")
        message_id = headers.get("twitch-eventsub-message-id", "")
        timestamp = headers.get("twitch-eventsub-message-timestamp", "")
        signature = headers.get("twitch-eventsub-message-signature", "")
        if not message_id or not timestamp or not signature.startswith("sha256="):
            raise AdapterError("twitch_webhook_signature_missing")
        try:
            sent_at = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            if sent_at.tzinfo is None or abs((datetime.now(UTC) - sent_at).total_seconds()) > 600:
                raise ValueError
        except ValueError as exc:
            raise AdapterError("twitch_webhook_timestamp_invalid") from exc
        expected = (
            "sha256="
            + hmac.new(
                context.connection_secret.encode(),
                message_id.encode() + timestamp.encode() + body,
                hashlib.sha256,
            ).hexdigest()
        )
        if not hmac.compare_digest(signature, expected):
            raise AdapterError("twitch_webhook_signature_invalid")
        return message_id

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as exc:
            raise AdapterError("twitch_webhook_invalid_json") from exc
        subscription = payload.get("subscription", {})
        event = payload.get("event", {})
        event_type = str(subscription.get("type", ""))
        normalized_type = {
            "channel.chat.message": LiveNormalizedEventType.chat,
            "channel.follow": LiveNormalizedEventType.follow,
            "channel.subscribe": LiveNormalizedEventType.subscription,
            "channel.subscription.gift": LiveNormalizedEventType.platform_gift,
            "channel.cheer": LiveNormalizedEventType.donation,
            "channel.moderate": LiveNormalizedEventType.moderation,
            "stream.online": LiveNormalizedEventType.stream_status,
            "stream.offline": LiveNormalizedEventType.stream_status,
        }.get(event_type, LiveNormalizedEventType.custom)
        message = event.get("message", {})
        text = message.get("text") if isinstance(message, Mapping) else None
        message_id = headers.get("twitch-eventsub-message-id") or str(event.get("id", ""))
        if not message_id:
            message_id = hashlib.sha256(body).hexdigest()
        occurred = (
            event.get("followed_at")
            or event.get("started_at")
            or headers.get("twitch-eventsub-message-timestamp")
        )
        metadata: dict[str, Any] = {"subscription_type": event_type}
        monetary_minor = None
        currency = None
        if event_type == "channel.cheer" and isinstance(event.get("bits"), int):
            metadata["bits"] = event["bits"]
        return [
            AdapterInboundEvent(
                platform_event_id=message_id,
                event_type=normalized_type,
                occurred_at=_parse_provider_time(str(occurred) if occurred else None),
                actor_platform_id=str(
                    event.get("chatter_user_id")
                    or event.get("user_id")
                    or event.get("moderator_user_id")
                    or ""
                )
                or None,
                actor_display_name=str(
                    event.get("chatter_user_name")
                    or event.get("user_name")
                    or event.get("moderator_user_name")
                    or ""
                )
                or None,
                text=str(text) if text is not None else None,
                monetary_minor=monetary_minor,
                currency=currency,
                safe_metadata=metadata,
            )
        ]

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        async with websockets.connect(
            "wss://eventsub.wss.twitch.tv/ws",
            open_timeout=10,
            close_timeout=5,
            max_size=MAX_ADAPTER_RESPONSE_BYTES,
        ) as socket:
            welcome_raw = await socket.recv()
            welcome = json.loads(welcome_raw)
            session_id = str(welcome.get("payload", {}).get("session", {}).get("id", ""))
            if (
                welcome.get("metadata", {}).get("message_type") != "session_welcome"
                or not session_id
            ):
                raise AdapterError("twitch_eventsub_welcome_invalid")
            broadcaster_id = context.external_channel_id
            user_id = context.external_account_id
            if not broadcaster_id or not user_id:
                raise AdapterError("twitch_channel_identity_required")
            subscriptions: list[tuple[str, str, dict[str, str]]] = [
                (
                    "stream.online",
                    "1",
                    {"broadcaster_user_id": broadcaster_id},
                ),
                (
                    "stream.offline",
                    "1",
                    {"broadcaster_user_id": broadcaster_id},
                ),
            ]
            if "user:read:chat" in context.scopes:
                subscriptions.append(
                    (
                        "channel.chat.message",
                        "1",
                        {
                            "broadcaster_user_id": broadcaster_id,
                            "user_id": user_id,
                        },
                    )
                )
            if (
                "moderator:read:followers" in context.scopes
                or "channel:read:subscriptions" in context.scopes
            ):
                subscriptions.append(
                    (
                        "channel.follow",
                        "2",
                        {
                            "broadcaster_user_id": broadcaster_id,
                            "moderator_user_id": user_id,
                        },
                    )
                )
            if "channel:read:subscriptions" in context.scopes:
                subscriptions.extend(
                    [
                        (
                            "channel.subscribe",
                            "1",
                            {"broadcaster_user_id": broadcaster_id},
                        ),
                        (
                            "channel.subscription.gift",
                            "1",
                            {"broadcaster_user_id": broadcaster_id},
                        ),
                    ]
                )
            if "bits:read" in context.scopes:
                subscriptions.append(
                    (
                        "channel.cheer",
                        "1",
                        {"broadcaster_user_id": broadcaster_id},
                    )
                )
            for subscription_type, version, condition in subscriptions:
                await self._request(
                    context,
                    "POST",
                    "eventsub/subscriptions",
                    json_body={
                        "type": subscription_type,
                        "version": version,
                        "condition": condition,
                        "transport": {
                            "method": "websocket",
                            "session_id": session_id,
                        },
                    },
                )
            async for raw in socket:
                body = raw.encode() if isinstance(raw, str) else raw
                try:
                    payload = json.loads(body)
                except json.JSONDecodeError:
                    continue
                metadata = payload.get("metadata", {})
                if metadata.get("message_type") in {
                    "session_reconnect",
                    "revocation",
                }:
                    raise AdapterError("twitch_eventsub_reconnect_required", retryable=True)
                if metadata.get("message_type") != "notification":
                    continue
                synthetic_headers = {
                    "twitch-eventsub-message-id": str(metadata.get("message_id", "")),
                    "twitch-eventsub-message-timestamp": str(metadata.get("message_timestamp", "")),
                }
                normalized_body = json.dumps(payload.get("payload", {})).encode()
                for event in self.ingest_webhook(context, synthetic_headers, normalized_body):
                    yield event

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        broadcaster_id = context.external_channel_id
        sender_id = context.external_account_id
        if not broadcaster_id or not sender_id:
            raise AdapterError("twitch_channel_identity_required")
        payload = await self._request(
            context,
            "POST",
            "chat/messages",
            json_body={
                "broadcaster_id": broadcaster_id,
                "sender_id": sender_id,
                "message": text,
            },
        )
        data = payload.get("data", []) if isinstance(payload, Mapping) else []
        message_id = str(data[0].get("message_id", "")) if data else ""
        if not message_id:
            raise AdapterError("twitch_chat_invalid_response")
        return AdapterActionResult(provider_reference=message_id)

    async def moderate(
        self, context: AdapterConnectionContext, action: Mapping[str, Any]
    ) -> AdapterActionResult:
        broadcaster_id = context.external_channel_id
        moderator_id = context.external_account_id
        user_id = str(action.get("platform_user_id", ""))
        kind = str(action.get("kind", ""))
        if not broadcaster_id or not moderator_id or not user_id:
            raise AdapterError("twitch_moderation_identity_required")
        if kind == "delete":
            message_id = str(action.get("message_id", ""))
            if not message_id:
                raise AdapterError("twitch_message_id_required")
            await self._request(
                context,
                "DELETE",
                "moderation/chat",
                params={
                    "broadcaster_id": broadcaster_id,
                    "moderator_id": moderator_id,
                    "message_id": message_id,
                },
            )
            return AdapterActionResult(provider_reference=message_id)
        if kind != "timeout":
            raise AdapterError("twitch_moderation_action_unavailable")
        duration = int(action.get("duration_seconds", 300))
        payload = await self._request(
            context,
            "POST",
            "moderation/bans",
            params={"broadcaster_id": broadcaster_id, "moderator_id": moderator_id},
            json_body={
                "data": {
                    "user_id": user_id,
                    "duration": max(1, min(duration, 1_209_600)),
                    "reason": str(action.get("reason", "SYLORA configured moderation policy"))[
                        :500
                    ],
                }
            },
        )
        return AdapterActionResult(
            provider_reference=hashlib.sha256(
                json.dumps(payload, sort_keys=True).encode()
            ).hexdigest()
        )


class DiscordAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.discord
    potential_capabilities = frozenset(
        {
            LiveCapability.chat_read,
            LiveCapability.chat_send,
            LiveCapability.events,
            LiveCapability.moderation_delete,
            LiveCapability.moderation_timeout,
        }
    )
    limitation = "Discord is a chat/event integration, not a video distribution destination."

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    @staticmethod
    def _effective_channel_permissions(
        bot_id: str,
        guild_id: str,
        channel: Mapping[str, Any],
        member: Mapping[str, Any],
        roles: Sequence[Mapping[str, Any]],
    ) -> int:
        role_permissions = {
            str(role.get("id", "")): int(role.get("permissions", "0")) for role in roles
        }
        permissions = role_permissions.get(guild_id, 0)
        member_roles = {str(item) for item in member.get("roles", [])}
        for role_id in member_roles:
            permissions |= role_permissions.get(role_id, 0)
        if permissions & (1 << 3):
            return (1 << 53) - 1

        overwrites = channel.get("permission_overwrites", [])

        def apply_overwrite(current: int, overwrite: Mapping[str, Any]) -> int:
            deny = int(overwrite.get("deny", "0"))
            allow = int(overwrite.get("allow", "0"))
            return (current & ~deny) | allow

        for overwrite in overwrites:
            if (
                isinstance(overwrite, Mapping)
                and int(overwrite.get("type", -1)) == 0
                and str(overwrite.get("id", "")) == guild_id
            ):
                permissions = apply_overwrite(permissions, overwrite)
        role_deny = 0
        role_allow = 0
        for overwrite in overwrites:
            if (
                isinstance(overwrite, Mapping)
                and int(overwrite.get("type", -1)) == 0
                and str(overwrite.get("id", "")) in member_roles
            ):
                role_deny |= int(overwrite.get("deny", "0"))
                role_allow |= int(overwrite.get("allow", "0"))
        permissions = (permissions & ~role_deny) | role_allow
        for overwrite in overwrites:
            if (
                isinstance(overwrite, Mapping)
                and int(overwrite.get("type", -1)) == 1
                and str(overwrite.get("id", "")) == bot_id
            ):
                permissions = apply_overwrite(permissions, overwrite)
        return permissions

    async def _request(
        self,
        context: AdapterConnectionContext,
        method: str,
        path: str,
        *,
        json_body: Mapping[str, Any] | None = None,
    ) -> Any:
        if not context.access_credential:
            raise AdapterError("discord_bot_token_required")
        headers = {"Authorization": f"Bot {context.access_credential}"}
        try:
            if self._client:
                response = await self._client.request(
                    method, f"{DISCORD_API}/{path}", headers=headers, json=json_body
                )
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(15, connect=5)) as client:
                    response = await client.request(
                        method, f"{DISCORD_API}/{path}", headers=headers, json=json_body
                    )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("discord_transport_error", retryable=True) from exc
        if response.status_code >= 400:
            raise AdapterError(
                "discord_permission_revoked"
                if response.status_code in {401, 403}
                else "discord_api_error",
                retryable=response.status_code == 429 or response.status_code >= 500,
                revoked=response.status_code in {401, 403},
                status_code=response.status_code,
            )
        return {} if response.status_code == 204 else _bounded_json(response)

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        bot = await self._request(context, "GET", "users/@me")
        bot_id = str(bot.get("id", "")) if isinstance(bot, Mapping) else ""
        channel_id = context.external_channel_id
        if not bot_id or not channel_id:
            raise AdapterError("discord_bot_and_channel_required")
        channel = await self._request(context, "GET", f"channels/{quote(channel_id, safe='')}")
        if not isinstance(channel, Mapping) or str(channel.get("id", "")) != channel_id:
            raise AdapterError("discord_channel_unavailable")
        guild_id = str(channel.get("guild_id", ""))
        if not guild_id:
            raise AdapterError("discord_guild_channel_required")
        member = await self._request(
            context,
            "GET",
            f"guilds/{quote(guild_id, safe='')}/members/{quote(bot_id, safe='')}",
        )
        roles_payload = await self._request(
            context, "GET", f"guilds/{quote(guild_id, safe='')}/roles"
        )
        if not isinstance(member, Mapping) or not isinstance(roles_payload, list):
            raise AdapterError("discord_permissions_unavailable")
        roles = [role for role in roles_payload if isinstance(role, Mapping)]
        permissions = self._effective_channel_permissions(bot_id, guild_id, channel, member, roles)
        requested = {
            LiveCapability(value)
            for value in context.safe_configuration.get("requested_capabilities", [])
            if value in LiveCapability._value2member_map_
        }
        verified: set[LiveCapability] = set()
        can_view = bool(permissions & (1 << 10))
        if can_view and LiveCapability.events in requested:
            verified.add(LiveCapability.events)
        if can_view and permissions & (1 << 16) and LiveCapability.chat_read in requested:
            verified.add(LiveCapability.chat_read)
        if can_view and permissions & (1 << 11) and LiveCapability.chat_send in requested:
            verified.add(LiveCapability.chat_send)
        if permissions & (1 << 13) and LiveCapability.moderation_delete in requested:
            verified.add(LiveCapability.moderation_delete)
        if permissions & (1 << 40) and LiveCapability.moderation_timeout in requested:
            verified.add(LiveCapability.moderation_timeout)
        return AdapterConnectionResult(
            verified_capabilities=frozenset(verified),
            external_account_id=bot_id,
            external_channel_id=channel_id,
            provider_metadata={
                "guild_id": guild_id,
                "video_distribution": False,
                "permissions_verified": True,
            },
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            result = await self.connect(context)
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=result.verified_capabilities,
                provider_metadata=result.provider_metadata,
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        timestamp = headers.get("x-signature-timestamp", "")
        signature = headers.get("x-signature-ed25519", "")
        public_key_hex = context.connection_secret
        if not timestamp or not signature or not public_key_hex:
            raise AdapterError("discord_interaction_signature_missing")
        try:
            if abs(datetime.now(UTC).timestamp() - int(timestamp)) > 300:
                raise ValueError
            key = Ed25519PublicKey.from_public_bytes(bytes.fromhex(public_key_hex))
            key.verify(bytes.fromhex(signature), timestamp.encode() + body)
        except (binascii.Error, ValueError, InvalidSignature) as exc:
            raise AdapterError("discord_interaction_signature_invalid") from exc
        try:
            payload = json.loads(body)
            event_id = str(payload["id"])
        except (json.JSONDecodeError, KeyError, TypeError) as exc:
            raise AdapterError("discord_interaction_invalid_json") from exc
        return event_id

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        try:
            payload = json.loads(body)
        except json.JSONDecodeError as exc:
            raise AdapterError("discord_interaction_invalid_json") from exc
        member = payload.get("member", {})
        user = member.get("user", payload.get("user", {})) if isinstance(member, Mapping) else {}
        data = payload.get("data", {})
        return [
            AdapterInboundEvent(
                platform_event_id=str(payload["id"]),
                event_type=LiveNormalizedEventType.custom,
                occurred_at=datetime.now(UTC),
                actor_platform_id=str(user.get("id", "")) or None,
                actor_display_name=str(
                    member.get("nick") or user.get("global_name") or user.get("username") or ""
                )
                or None,
                safe_metadata={
                    "interaction_type": int(payload.get("type", 0)),
                    "command_name": str(data.get("name", ""))[:100],
                },
            )
        ]

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        if not context.access_credential:
            raise AdapterError("discord_bot_token_required")
        async with websockets.connect(
            DISCORD_GATEWAY,
            open_timeout=10,
            close_timeout=5,
            max_size=MAX_ADAPTER_RESPONSE_BYTES,
        ) as socket:
            hello = json.loads(await socket.recv())
            heartbeat_interval = float(hello["d"]["heartbeat_interval"]) / 1000
            await socket.send(
                json.dumps(
                    {
                        "op": 2,
                        "d": {
                            "token": context.access_credential,
                            "intents": 1 | 512 | 32768,
                            "properties": {
                                "os": "linux",
                                "browser": "sylora",
                                "device": "sylora",
                            },
                        },
                    }
                )
            )

            async def heartbeat() -> None:
                while True:
                    await asyncio.sleep(heartbeat_interval)
                    await socket.send(json.dumps({"op": 1, "d": None}))

            heartbeat_task = asyncio.create_task(heartbeat())
            try:
                async for raw in socket:
                    payload = json.loads(raw)
                    if payload.get("t") != "MESSAGE_CREATE":
                        continue
                    event = payload.get("d", {})
                    if str(event.get("channel_id", "")) != context.external_channel_id:
                        continue
                    author = event.get("author", {})
                    if author.get("bot"):
                        continue
                    yield AdapterInboundEvent(
                        platform_event_id=str(event["id"]),
                        event_type=LiveNormalizedEventType.chat,
                        occurred_at=_parse_provider_time(event.get("timestamp")),
                        actor_platform_id=str(author.get("id", "")) or None,
                        actor_display_name=str(
                            author.get("global_name") or author.get("username") or ""
                        )
                        or None,
                        text=str(event.get("content", "")),
                        safe_metadata={"source": "discord_gateway"},
                    )
            finally:
                heartbeat_task.cancel()

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        if not context.external_channel_id:
            raise AdapterError("discord_channel_required")
        payload = await self._request(
            context,
            "POST",
            f"channels/{quote(context.external_channel_id, safe='')}/messages",
            json_body={"content": text, "allowed_mentions": {"parse": []}},
        )
        message_id = str(payload.get("id", "")) if isinstance(payload, Mapping) else ""
        if not message_id:
            raise AdapterError("discord_message_invalid_response")
        return AdapterActionResult(provider_reference=message_id)

    async def moderate(
        self, context: AdapterConnectionContext, action: Mapping[str, Any]
    ) -> AdapterActionResult:
        channel_id = context.external_channel_id
        kind = str(action.get("kind", ""))
        if kind == "delete":
            message_id = str(action.get("message_id", ""))
            if not channel_id or not message_id:
                raise AdapterError("discord_message_id_required")
            await self._request(
                context,
                "DELETE",
                f"channels/{quote(channel_id, safe='')}/messages/{quote(message_id, safe='')}",
            )
            return AdapterActionResult(provider_reference=message_id)
        if kind == "ban":
            raise AdapterError("live_auto_ban_forbidden")
        if kind != "timeout":
            raise AdapterError("discord_moderation_action_unavailable")
        guild_id = str(context.safe_configuration.get("guild_id", ""))
        user_id = str(action.get("platform_user_id", ""))
        until = str(action.get("communication_disabled_until", ""))
        if not guild_id or not user_id or not until:
            raise AdapterError("discord_timeout_configuration_required")
        payload = await self._request(
            context,
            "PATCH",
            f"guilds/{quote(guild_id, safe='')}/members/{quote(user_id, safe='')}",
            json_body={"communication_disabled_until": until},
        )
        return AdapterActionResult(
            provider_reference=hashlib.sha256(
                json.dumps(payload, sort_keys=True).encode()
            ).hexdigest()
        )


def obs_authentication_response(password: str, salt: str, challenge: str) -> str:
    secret = base64.b64encode(hashlib.sha256((password + salt).encode()).digest())
    return base64.b64encode(hashlib.sha256(secret + challenge.encode()).digest()).decode()


class OBSAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.obs
    potential_capabilities = frozenset(
        {
            LiveCapability.obs_scene,
            LiveCapability.obs_source,
            LiveCapability.stream_control,
            LiveCapability.record_control,
        }
    )
    status = "requires_user_approved_endpoint"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate_endpoint(self, endpoint: str) -> str:
        parsed = urlparse(endpoint)
        if parsed.scheme not in {"ws", "wss"} or not parsed.hostname:
            raise AdapterError("obs_websocket_endpoint_invalid")
        if parsed.username or parsed.password or parsed.fragment:
            raise AdapterError("obs_websocket_endpoint_invalid")
        if parsed.hostname not in self.settings.live_obs_allowed_hosts:
            raise AdapterError("obs_websocket_host_not_allowed")
        if parsed.scheme == "ws":
            try:
                address = ipaddress.ip_address(parsed.hostname)
                local = address.is_loopback or address.is_private
            except ValueError:
                local = parsed.hostname == "localhost"
            if not local:
                raise AdapterError("obs_plaintext_requires_local_companion")
        return endpoint

    async def _request(
        self,
        context: AdapterConnectionContext,
        request_type: str,
        request_data: Mapping[str, Any] | None = None,
    ) -> Mapping[str, Any]:
        endpoint = self.validate_endpoint(str(context.safe_configuration.get("endpoint_url", "")))
        async with websockets.connect(
            endpoint,
            open_timeout=10,
            close_timeout=5,
            max_size=MAX_ADAPTER_RESPONSE_BYTES,
        ) as socket:
            hello = json.loads(await socket.recv())
            if hello.get("op") != 0:
                raise AdapterError("obs_protocol_hello_invalid")
            identify: dict[str, Any] = {"rpcVersion": 1}
            authentication = hello.get("d", {}).get("authentication")
            if authentication:
                if not context.connection_secret:
                    raise AdapterError("obs_authentication_required")
                identify["authentication"] = obs_authentication_response(
                    context.connection_secret,
                    str(authentication["salt"]),
                    str(authentication["challenge"]),
                )
            await socket.send(json.dumps({"op": 1, "d": identify}))
            identified = json.loads(await socket.recv())
            if identified.get("op") != 2:
                raise AdapterError("obs_authentication_failed", revoked=True)
            request_id = str(uuid.uuid4())
            await socket.send(
                json.dumps(
                    {
                        "op": 6,
                        "d": {
                            "requestType": request_type,
                            "requestId": request_id,
                            "requestData": dict(request_data or {}),
                        },
                    }
                )
            )
            response = json.loads(await socket.recv())
            data = response.get("d", {})
            status = data.get("requestStatus", {})
            if (
                response.get("op") != 7
                or data.get("requestId") != request_id
                or not status.get("result")
            ):
                raise AdapterError(f"obs_request_failed_{status.get('code', 'unknown')}")
            response_data = data.get("responseData", {})
            return response_data if isinstance(response_data, Mapping) else {}

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        version = await self._request(context, "GetVersion")
        if not str(version.get("obsWebSocketVersion", "")).startswith("5."):
            raise AdapterError("obs_websocket_5_required")
        requested = {
            LiveCapability(value)
            for value in context.safe_configuration.get("requested_capabilities", [])
            if value in LiveCapability._value2member_map_
        }
        return AdapterConnectionResult(
            verified_capabilities=frozenset(requested & set(self.potential_capabilities)),
            provider_metadata={
                "obs_websocket_version": str(version.get("obsWebSocketVersion", "")),
                "rpc_version": version.get("rpcVersion"),
            },
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            result = await self.connect(context)
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=result.verified_capabilities,
                provider_metadata=result.provider_metadata,
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult:
        if bool(configuration.get("recording_enabled")):
            await self._request(context, "StartRecord")
        await self._request(context, "StartStream")
        return AdapterActionResult(provider_reference=str(uuid.uuid4()))

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        if {"scene_name", "source_name", "enabled"} <= set(configuration):
            item = await self._request(
                context,
                "GetSceneItemId",
                {
                    "sceneName": str(configuration["scene_name"]),
                    "sourceName": str(configuration["source_name"]),
                },
            )
            if not isinstance(item.get("sceneItemId"), int):
                raise AdapterError("obs_scene_item_unavailable")
            await self._request(
                context,
                "SetSceneItemEnabled",
                {
                    "sceneName": str(configuration["scene_name"]),
                    "sceneItemId": item["sceneItemId"],
                    "sceneItemEnabled": bool(configuration["enabled"]),
                },
            )
        elif "scene_name" in configuration:
            await self._request(
                context,
                "SetCurrentProgramScene",
                {"sceneName": str(configuration["scene_name"])},
            )
        else:
            raise AdapterError("obs_action_configuration_invalid")
        return AdapterActionResult(provider_reference=external_broadcast_id)

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult:
        status = await self._request(context, "GetStreamStatus")
        if status.get("outputActive"):
            await self._request(context, "StopStream")
        record_status = await self._request(context, "GetRecordStatus")
        if record_status.get("outputActive"):
            await self._request(context, "StopRecord")
        return AdapterActionResult(provider_reference=external_broadcast_id)


class MediaMTXAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.rtmp_webrtc
    potential_capabilities = frozenset(
        {
            LiveCapability.publish,
            LiveCapability.first_party_ingest,
        }
    )

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client

    def descriptor(self) -> PlatformDescriptor:
        configured = bool(self.settings.mediamtx_control_url)
        return PlatformDescriptor(
            platform=self.platform,
            available=configured,
            status="configured" if configured else "mediamtx_control_unconfigured",
            potential_capabilities=self.potential_capabilities if configured else frozenset(),
            limitation=None
            if configured
            else "A deployment-managed MediaMTX Control API URL is required.",
        )

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Mapping[str, Any] | None = None,
        allow_not_found: bool = False,
    ) -> Any:
        if not self.settings.mediamtx_control_url:
            raise AdapterError("mediamtx_control_unconfigured")
        url = self.settings.mediamtx_control_url.rstrip("/") + path
        auth = (
            (
                self.settings.mediamtx_control_username,
                self.settings.mediamtx_control_password.get_secret_value(),
            )
            if self.settings.mediamtx_control_username and self.settings.mediamtx_control_password
            else None
        )
        try:
            if self._client:
                response = await self._client.request(method, url, json=json_body, auth=auth)
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(10, connect=3)) as client:
                    response = await client.request(method, url, json=json_body, auth=auth)
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("mediamtx_transport_error", retryable=True) from exc
        if allow_not_found and response.status_code == 404:
            return {}
        if response.status_code >= 400:
            raise AdapterError(
                "mediamtx_permission_denied"
                if response.status_code in {401, 403}
                else "mediamtx_control_error",
                retryable=response.status_code >= 500,
                revoked=response.status_code in {401, 403},
            )
        return {} if response.status_code == 204 else _bounded_json(response)

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        await self._request("GET", "/v3/config/global/get")
        return AdapterConnectionResult(
            verified_capabilities=self.potential_capabilities,
            provider_metadata={"control_api_verified": True},
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            await self._request("GET", "/v3/config/global/get")
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=self.potential_capabilities,
                provider_metadata={"control_api_verified": True},
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    async def create_path(self, path_name: str, stream_key_hash: str) -> AdapterActionResult:
        await self._request(
            "POST",
            f"/v3/config/paths/add/{quote(path_name, safe='')}",
            json_body={
                "source": "publisher",
                "publishUser": "",
                "publishPass": stream_key_hash,
            },
        )
        return AdapterActionResult(provider_reference=path_name)

    async def rotate_path(self, path_name: str, stream_key_hash: str) -> AdapterActionResult:
        await self._request(
            "PATCH",
            f"/v3/config/paths/patch/{quote(path_name, safe='')}",
            json_body={"publishPass": stream_key_hash},
        )
        return AdapterActionResult(provider_reference=path_name)

    async def delete_path(self, path_name: str) -> AdapterActionResult:
        await self._request(
            "DELETE",
            f"/v3/config/paths/delete/{quote(path_name, safe='')}",
            allow_not_found=True,
        )
        return AdapterActionResult(provider_reference=path_name)

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult:
        return await self.create_path(
            str(configuration["ingest_path"]), str(configuration["ingest_key"])
        )

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        return await self.rotate_path(external_broadcast_id, str(configuration["ingest_key"]))

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult:
        return await self.delete_path(external_broadcast_id)


class PluginAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.plugin
    status = "requires_signed_manifest_and_allowlisted_host"

    def __init__(self, settings: Settings, client: httpx.AsyncClient | None = None) -> None:
        self.settings = settings
        self._client = client
        self.potential_capabilities = frozenset(LiveCapability)

    def _manifest(self, context: AdapterConnectionContext) -> Mapping[str, Any]:
        manifest = context.safe_configuration.get("plugin_manifest")
        if not isinstance(manifest, Mapping):
            raise AdapterError("plugin_manifest_required")
        return manifest

    def _verify_manifest(self, manifest: Mapping[str, Any]) -> frozenset[LiveCapability]:
        key_id = str(manifest.get("signing_key_id", ""))
        encoded_key = self.settings.live_plugin_signing_keys.get(key_id)
        signature = str(manifest.get("signature", ""))
        if not encoded_key or not signature:
            raise AdapterError("plugin_signing_key_not_allowed")
        canonical = {key: value for key, value in manifest.items() if key != "signature"}
        message = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
        try:
            key = Ed25519PublicKey.from_public_bytes(base64.b64decode(encoded_key))
            key.verify(base64.b64decode(signature), message)
        except (binascii.Error, ValueError, InvalidSignature) as exc:
            raise AdapterError("plugin_manifest_signature_invalid") from exc
        for field_name in ("callback_url", "webhook_url"):
            parsed = urlparse(str(manifest.get(field_name, "")))
            if (
                parsed.scheme != "https"
                or not parsed.hostname
                or parsed.hostname not in self.settings.live_plugin_allowed_hosts
            ):
                raise AdapterError("plugin_endpoint_host_not_allowed")
        capabilities = {
            LiveCapability(value)
            for value in manifest.get("declared_capabilities", [])
            if value in LiveCapability._value2member_map_
        }
        if len(capabilities) != len(manifest.get("declared_capabilities", [])):
            raise AdapterError("plugin_capability_invalid")
        return frozenset(capabilities)

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        manifest = self._manifest(context)
        capabilities = self._verify_manifest(manifest)
        callback_url = str(manifest["callback_url"]).rstrip("/")
        headers = (
            {"Authorization": f"Bearer {context.access_credential}"}
            if context.access_credential
            else {}
        )
        try:
            if self._client:
                response = await self._client.get(f"{callback_url}/health", headers=headers)
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(10, connect=3)) as client:
                    response = await client.get(f"{callback_url}/health", headers=headers)
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("plugin_health_unavailable", retryable=True) from exc
        if response.status_code >= 400:
            raise AdapterError("plugin_health_unavailable", retryable=response.status_code >= 500)
        return AdapterConnectionResult(
            verified_capabilities=capabilities,
            provider_metadata={
                "manifest_id": str(manifest.get("manifest_id")),
                "schema_version": str(manifest.get("schema_version")),
                "signature_verified": True,
            },
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        try:
            result = await self.connect(context)
            return AdapterHealth(
                ok=True,
                status="connected",
                verified_capabilities=result.verified_capabilities,
                provider_metadata=result.provider_metadata,
            )
        except AdapterError as exc:
            return AdapterHealth(ok=False, status=exc.code)

    def verify_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> str:
        if not context.connection_secret:
            raise AdapterError("plugin_webhook_secret_unconfigured")
        signature = headers.get("x-sylora-plugin-signature", "")
        event_id = headers.get("x-sylora-plugin-event-id", "")
        expected = hmac.new(context.connection_secret.encode(), body, hashlib.sha256).hexdigest()
        if not event_id or not hmac.compare_digest(signature, expected):
            raise AdapterError("plugin_webhook_signature_invalid")
        return event_id

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        try:
            payload = json.loads(body)
            event_type = LiveNormalizedEventType(str(payload["event_type"]))
            occurred_at = _parse_provider_time(str(payload["occurred_at"]))
        except (json.JSONDecodeError, KeyError, TypeError, ValueError) as exc:
            raise AdapterError("plugin_webhook_schema_invalid") from exc
        metadata = payload.get("metadata", {})
        if not isinstance(metadata, Mapping):
            raise AdapterError("plugin_webhook_schema_invalid")
        return [
            AdapterInboundEvent(
                platform_event_id=headers["x-sylora-plugin-event-id"],
                event_type=event_type,
                occurred_at=occurred_at,
                actor_platform_id=str(payload.get("actor_platform_id", "")) or None,
                actor_display_name=str(payload.get("actor_display_name", "")) or None,
                text=str(payload["text"]) if payload.get("text") is not None else None,
                monetary_minor=payload.get("monetary_minor"),
                currency=payload.get("currency"),
                safe_metadata=dict(metadata),
            )
        ]

    async def _action(
        self,
        context: AdapterConnectionContext,
        operation: str,
        payload: Mapping[str, Any],
    ) -> AdapterActionResult:
        manifest = self._manifest(context)
        self._verify_manifest(manifest)
        callback_url = str(manifest["callback_url"]).rstrip("/")
        headers = {
            "Idempotency-Key": str(payload.get("idempotency_key", uuid.uuid4())),
            "Content-Type": "application/json",
        }
        if context.access_credential:
            headers["Authorization"] = f"Bearer {context.access_credential}"
        try:
            if self._client:
                response = await self._client.post(
                    f"{callback_url}/v1/{operation}", headers=headers, json=dict(payload)
                )
            else:
                async with httpx.AsyncClient(timeout=httpx.Timeout(15, connect=3)) as client:
                    response = await client.post(
                        f"{callback_url}/v1/{operation}", headers=headers, json=dict(payload)
                    )
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            raise AdapterError("plugin_transport_error", retryable=True) from exc
        if response.status_code >= 400:
            raise AdapterError(
                "plugin_action_rejected",
                retryable=response.status_code == 429 or response.status_code >= 500,
            )
        data = _bounded_json(response)
        reference = str(data.get("reference", "")) if isinstance(data, Mapping) else ""
        if not reference:
            raise AdapterError("plugin_action_invalid_response")
        return AdapterActionResult(
            provider_reference=reference,
            external_broadcast_id=str(data.get("external_broadcast_id", "")) or None,
        )

    async def send_chat(self, context: AdapterConnectionContext, text: str) -> AdapterActionResult:
        return await self._action(context, "chat", {"text": text})

    async def moderate(
        self, context: AdapterConnectionContext, action: Mapping[str, Any]
    ) -> AdapterActionResult:
        if action.get("kind") == "ban":
            raise AdapterError("live_auto_ban_forbidden")
        return await self._action(context, "moderation", action)

    async def create_broadcast(
        self, context: AdapterConnectionContext, configuration: Mapping[str, Any]
    ) -> AdapterActionResult:
        return await self._action(context, "broadcasts", configuration)

    async def update_broadcast(
        self,
        context: AdapterConnectionContext,
        external_broadcast_id: str,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        return await self._action(
            context,
            f"broadcasts/{quote(external_broadcast_id, safe='')}",
            configuration,
        )

    async def end_broadcast(
        self, context: AdapterConnectionContext, external_broadcast_id: str
    ) -> AdapterActionResult:
        return await self._action(
            context,
            f"broadcasts/{quote(external_broadcast_id, safe='')}/end",
            {},
        )


class AdapterRegistry:
    """Runtime adapters are explicit; platform names never manufacture capabilities."""

    def __init__(
        self,
        settings: Settings,
        adapters: Sequence[PlatformAdapter] = (),
    ) -> None:
        defaults: list[PlatformAdapter] = [
            YouTubeAdapter(settings),
            TwitchAdapter(settings),
            DiscordAdapter(settings),
            OBSAdapter(settings),
            MediaMTXAdapter(settings),
            PluginAdapter(settings),
            UnavailablePlatformAdapter(IntegrationPlatform.tiktok, "requires_provider_review"),
            UnavailablePlatformAdapter(IntegrationPlatform.kick, "requires_provider_review"),
            UnavailablePlatformAdapter(IntegrationPlatform.facebook, "requires_provider_review"),
            UnavailablePlatformAdapter(IntegrationPlatform.instagram, "requires_provider_review"),
        ]
        self._adapters = {adapter.platform: adapter for adapter in defaults}
        for adapter in adapters:
            self._adapters[adapter.platform] = adapter

    def resolve(self, platform: IntegrationPlatform) -> PlatformAdapter:
        adapter = self._adapters.get(platform)
        if adapter is None:
            raise AdapterError("platform_adapter_unavailable")
        return adapter

    def descriptors(self) -> tuple[PlatformDescriptor, ...]:
        return tuple(
            self._adapters[platform].descriptor()
            for platform in sorted(self._adapters, key=lambda item: item.value)
        )


def retry_delay_seconds(attempt: int, *, base: float = 2, maximum: float = 300) -> float:
    bounded_attempt = max(0, min(attempt, 20))
    ceiling = min(maximum, base * (2**bounded_attempt))
    return random.uniform(ceiling / 2, ceiling)
