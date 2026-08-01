"""Shared live-platform contracts — platform-agnostic names only."""

from __future__ import annotations

from app.live_platforms.common.events import (
    LivePlatformConnectionState,
    NormalizedLiveEvent,
    NormalizedLiveEventType,
)
from app.live_platforms.common.connection import LivePlatformConnectionManager
from app.live_platforms.common.interfaces import (
    LiveAuthMaterial,
    LiveConnectRequest,
    LiveConnectionManager,
    LiveEventNormalizer,
    LivePlatformAdapter,
    LivePlatformAuthProvider,
    LivePlatformTransport,
)
from app.live_platforms.common.status import (
    LivePlatformId,
    LivePlatformIntegrationStatus,
    LivePlatformStatus,
    LivePlatformStatusReport,
)

__all__ = [
    "LiveAuthMaterial",
    "LiveConnectRequest",
    "LiveConnectionManager",
    "LiveEventNormalizer",
    "LivePlatformAdapter",
    "LivePlatformAuthProvider",
    "LivePlatformConnectionManager",
    "LivePlatformConnectionState",
    "LivePlatformId",
    "LivePlatformIntegrationStatus",
    "LivePlatformStatus",
    "LivePlatformStatusReport",
    "LivePlatformTransport",
    "NormalizedLiveEvent",
    "NormalizedLiveEventType",
]