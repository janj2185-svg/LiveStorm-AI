"""Import, contract, and event-routing tests for live_platforms layout."""

from __future__ import annotations

import importlib

import pytest

from app.live_models import LiveNormalizedEventType
from app.live_platforms.common.events import NormalizedLiveEvent, NormalizedLiveEventType
from app.live_platforms.common.hub_bridge import to_adapter_inbound
from app.live_platforms.common.status import LivePlatformId, LivePlatformIntegrationStatus
from app.live_platforms.discord import DiscordLivePlatformStub
from app.live_platforms.facebook import FacebookLivePlatformStub
from app.live_platforms.instagram import InstagramLivePlatformStub
from app.live_platforms.obs import ObsLivePlatformStub
from app.live_platforms.twitch import TwitchLivePlatformStub
from app.live_platforms.youtube import YouTubeLivePlatformStub


PLATFORM_MODULES = [
    "app.live_platforms",
    "app.live_platforms.common",
    "app.live_platforms.common.events",
    "app.live_platforms.common.interfaces",
    "app.live_platforms.common.status",
    "app.live_platforms.common.credentials",
    "app.live_platforms.common.errors",
    "app.live_platforms.common.metrics",
    "app.live_platforms.common.reliability",
    "app.live_platforms.common.connection",
    "app.live_platforms.common.hub_bridge",
    "app.live_platforms.common.cohost",
    "app.live_platforms.common.memory",
    "app.live_platforms.common.output",
    "app.live_platforms.tiktok",
    "app.live_platforms.tiktok.adapter",
    "app.live_platforms.tiktok.auth",
    "app.live_platforms.tiktok.transport",
    "app.live_platforms.tiktok.normalizer",
    "app.live_platforms.youtube",
    "app.live_platforms.twitch",
    "app.live_platforms.facebook",
    "app.live_platforms.instagram",
    "app.live_platforms.discord",
    "app.live_platforms.obs",
]


@pytest.mark.parametrize("module_name", PLATFORM_MODULES)
def test_live_platform_modules_import(module_name: str) -> None:
    mod = importlib.import_module(module_name)
    assert mod is not None


def test_common_contracts_are_not_tiktok_named() -> None:
    common = importlib.import_module("app.live_platforms.common")
    for forbidden in (
        "TikTokIntegrationStatus",
        "TikTokNormalizedEvent",
        "TikTokLiveConnectionManager",
        "TikTokEventType",
    ):
        assert not hasattr(common, forbidden)
    assert hasattr(common, "LivePlatformIntegrationStatus")
    assert hasattr(common, "NormalizedLiveEvent")
    assert hasattr(common, "LivePlatformConnectionManager")
    assert hasattr(common, "NormalizedLiveEventType")


def test_all_platform_stubs_report_independently() -> None:
    stubs = [
        YouTubeLivePlatformStub(),
        TwitchLivePlatformStub(),
        FacebookLivePlatformStub(),
        InstagramLivePlatformStub(),
        DiscordLivePlatformStub(),
        ObsLivePlatformStub(),
    ]
    platforms = {s.platform for s in stubs}
    assert platforms == {
        LivePlatformId.YOUTUBE,
        LivePlatformId.TWITCH,
        LivePlatformId.FACEBOOK,
        LivePlatformId.INSTAGRAM,
        LivePlatformId.DISCORD,
        LivePlatformId.OBS,
    }
    for stub in stubs:
        report = stub.status()
        assert report.integration_status is LivePlatformIntegrationStatus.SPEC_ONLY
        assert report.details.get("hub_ready") is True


def test_normalized_event_routes_to_live_event_hub_contract() -> None:
    """Any platform emitting NormalizedLiveEvent must map into AdapterInboundEvent."""
    event = NormalizedLiveEvent(
        event_id="e1",
        source="youtube",
        type=NormalizedLiveEventType.chat_message,
        timestamp=NormalizedLiveEvent.now(),
        room_id="room-1",
        user_id="u1",
        username="viewer",
        display_name="Viewer",
        payload={"comment": "hello hub"},
        raw_provider_event={"type": "chat", "comment": "hello hub"},
        deduplication_key="youtube:chat_message:room-1:e1",
        sequence_number=1,
        confidence=1.0,
    )
    inbound = to_adapter_inbound(event)
    assert inbound.event_type is LiveNormalizedEventType.chat
    assert inbound.text == "hello hub"
    assert inbound.safe_metadata["source"] == "youtube"


def test_tiktok_adapter_lazy_import_from_registry_path() -> None:
    from app.live_platforms.tiktok.adapter import TikTokLiveAdapter

    assert TikTokLiveAdapter is not None


def test_old_tiktok_live_package_removed() -> None:
    with pytest.raises(ModuleNotFoundError):
        importlib.import_module("app.tiktok_live")
