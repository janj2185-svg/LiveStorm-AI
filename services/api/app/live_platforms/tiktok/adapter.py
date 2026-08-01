"""PlatformAdapter implementation for SYLORA AdapterRegistry."""

from __future__ import annotations

from collections.abc import AsyncIterator, Mapping, Sequence
from typing import Any

from app.config import Settings
from app.live_adapters import (
    AdapterConnectionContext,
    AdapterConnectionResult,
    AdapterError,
    AdapterHealth,
    AdapterInboundEvent,
    BasePlatformAdapter,
    PlatformDescriptor,
)
from app.live_models import IntegrationPlatform, LiveCapability
from app.live_platforms.common.connection import LivePlatformConnectionManager
from app.live_platforms.common.hub_bridge import to_adapter_inbound
from app.live_platforms.common.interfaces import LiveConnectRequest
from app.live_platforms.tiktok.auth import BlockedTikTokAuthProvider, ConfiguredApprovedAuthProvider
from app.live_platforms.tiktok.normalizer import DefaultTikTokEventNormalizer
from app.live_platforms.tiktok.status import ADAPTER_LIMITATION, ADAPTER_STATUS_CODE, current_status
from app.live_platforms.tiktok.transport import ApprovedProviderTransportStub, BlockedTikTokTransport


class TikTokLiveAdapter(BasePlatformAdapter):
    """Independent TikTok LIVE adapter under live_platforms/tiktok.

    Default state is BLOCKED_BY_PROVIDER_ACCESS. When an approved provider is
    configured in settings, connect still requires a wired transport client.
    """

    platform = IntegrationPlatform.tiktok
    potential_capabilities = frozenset(
        {
            LiveCapability.chat_read,
            LiveCapability.events,
            LiveCapability.analytics,
        }
    )

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._manager: LivePlatformConnectionManager | None = None
        approved = bool(getattr(settings, "tiktok_live_provider_approved", False))
        provider_name = getattr(settings, "tiktok_live_provider_name", None) or "unconfigured"
        api_key_secret = getattr(settings, "tiktok_live_provider_api_key", None)
        api_key = (
            api_key_secret.get_secret_value()
            if api_key_secret is not None and hasattr(api_key_secret, "get_secret_value")
            else None
        )
        endpoint = getattr(settings, "tiktok_live_provider_endpoint", None)
        self._auth = (
            ConfiguredApprovedAuthProvider(
                provider_name=provider_name,
                api_key=api_key,
                approved=approved,
            )
            if approved
            else BlockedTikTokAuthProvider()
        )
        self._transport = (
            ApprovedProviderTransportStub(endpoint=endpoint)
            if approved
            else BlockedTikTokTransport()
        )

    def descriptor(self) -> PlatformDescriptor:
        available = self._auth.is_approved() and bool(
            getattr(self._settings, "tiktok_live_provider_endpoint", None)
        )
        status = ADAPTER_STATUS_CODE if not available else "implemented_not_connected"
        return PlatformDescriptor(
            platform=self.platform,
            available=False if not available else True,
            status=status if not available else "implemented_not_connected",
            potential_capabilities=self.potential_capabilities if available else frozenset(),
            limitation=ADAPTER_LIMITATION,
        )

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        account = str(
            context.safe_configuration.get("account")
            or context.external_account_id
            or context.external_channel_id
            or ""
        ).strip()
        if not account:
            raise AdapterError("tiktok_account_required")
        if not self._auth.is_approved():
            raise AdapterError(ADAPTER_STATUS_CODE)
        manager = LivePlatformConnectionManager(
            auth_provider=self._auth,
            transport=self._transport,
            normalizer=DefaultTikTokEventNormalizer(),
            platform="tiktok",
        )
        try:
            await manager.start(
                LiveConnectRequest(
                    account=account,
                    room_id=_as_optional_str(context.safe_configuration.get("room_id")),
                    session_label=_as_optional_str(context.safe_configuration.get("session_label")),
                    platform="tiktok",
                )
            )
        except PermissionError as exc:
            raise AdapterError(str(exc) or ADAPTER_STATUS_CODE) from exc
        except NotImplementedError as exc:
            raise AdapterError("approved_provider_transport_not_wired") from exc
        self._manager = manager
        return AdapterConnectionResult(
            verified_capabilities=frozenset(),
            external_account_id=account,
            external_channel_id=account,
            provider_metadata={
                "status": current_status().value,
                "diagnostics": manager.diagnostics(),
            },
        )

    async def health(self, context: AdapterConnectionContext) -> AdapterHealth:
        if self._manager is None:
            return AdapterHealth(
                ok=False,
                status=ADAPTER_STATUS_CODE,
                verified_capabilities=frozenset(),
                provider_metadata={"integration_status": current_status().value},
            )
        diag = self._manager.diagnostics()
        return AdapterHealth(
            ok=bool(diag.get("connected")),
            status=str(diag.get("health") or ADAPTER_STATUS_CODE),
            verified_capabilities=frozenset(),
            provider_metadata=dict(diag),
        )

    async def disconnect(self, context: AdapterConnectionContext) -> None:
        if self._manager is not None:
            await self._manager.stop()
            self._manager = None

    def ingest_webhook(
        self,
        context: AdapterConnectionContext,
        headers: Mapping[str, str],
        body: bytes,
    ) -> Sequence[AdapterInboundEvent]:
        raise AdapterError("tiktok_webhook_ingest_unavailable")

    async def event_stream(
        self, context: AdapterConnectionContext
    ) -> AsyncIterator[AdapterInboundEvent]:
        if self._manager is None:
            raise AdapterError(ADAPTER_STATUS_CODE)
        async for event in self._manager.normalized_events():
            yield to_adapter_inbound(event)

    def control_panel_snapshot(self) -> dict[str, Any]:
        diag = self._manager.diagnostics() if self._manager else {}
        return {
            "integration_status": current_status().value,
            "adapter_status": self.descriptor().status,
            "limitation": ADAPTER_LIMITATION,
            "connection": diag,
            "controls": {
                "mute_ai": True,
                "interrupt_ai": True,
                "tts_volume": True,
                "personality_profile": True,
                "humor_level": True,
                "profanity_level": True,
                "respond_to_gifts": True,
                "respond_to_new_viewers": True,
                "host_mode": True,
                "reconnect": True,
                "health_diagnostics": True,
                "export_logs": True,
            },
        }


def _as_optional_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None