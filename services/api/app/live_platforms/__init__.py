"""Multi-platform live streaming adapters for SYLORA.

Structure:
  live_platforms/common/   — shared contracts (not platform-named)
  live_platforms/<name>/   — independent platform adapters

All platforms emit NormalizedLiveEvent into one LiveEventHub.
New platforms plug in without changing AI Co-Host, TTS, Avatar, OBS, or the hub.
"""

from __future__ import annotations

from app.live_platforms.common.events import NormalizedLiveEvent, NormalizedLiveEventType
from app.live_platforms.common.status import LivePlatformId, LivePlatformIntegrationStatus

__all__ = [
    "LivePlatformId",
    "LivePlatformIntegrationStatus",
    "NormalizedLiveEvent",
    "NormalizedLiveEventType",
]