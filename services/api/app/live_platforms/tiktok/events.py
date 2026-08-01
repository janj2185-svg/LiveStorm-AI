"""TikTok-specific raw event aliases (maps into shared NormalizedLiveEventType)."""

from __future__ import annotations

from app.live_platforms.common.events import NormalizedLiveEventType

# Keep TikTokEventType as a TikTok-local alias for readability in TikTok code/tests.
TikTokEventType = NormalizedLiveEventType

__all__ = ["TikTokEventType", "NormalizedLiveEventType"]