"""TikTok LIVE adapter — platform-specific layer under live_platforms.

Status: BLOCKED_BY_PROVIDER_ACCESS until an approved official or
contracted provider endpoint is configured. No unofficial webcast scraping.
"""

from __future__ import annotations

from app.live_platforms.tiktok.status import (
    CURRENT_STATUS,
    LivePlatformIntegrationStatus,
    current_status,
)

__all__ = [
    "CURRENT_STATUS",
    "LivePlatformIntegrationStatus",
    "current_status",
    "TikTokLiveAdapter",
]


def __getattr__(name: str):
    if name == "TikTokLiveAdapter":
        from app.live_platforms.tiktok.adapter import TikTokLiveAdapter

        return TikTokLiveAdapter
    raise AttributeError(name)