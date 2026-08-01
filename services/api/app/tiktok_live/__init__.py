"""SYLORA TikTok LIVE integration package.

Status: BLOCKED_BY_PROVIDER_ACCESS until an approved official or
contracted provider endpoint is configured. This package intentionally
ships no unofficial webcast scraping transport.
"""

from app.tiktok_live.status import TikTokIntegrationStatus, current_status

__all__ = [
    "TikTokIntegrationStatus",
    "current_status",
    "TikTokLiveAdapter",
]


def __getattr__(name: str):
    if name == "TikTokLiveAdapter":
        from app.tiktok_live.adapter import TikTokLiveAdapter

        return TikTokLiveAdapter
    raise AttributeError(name)
