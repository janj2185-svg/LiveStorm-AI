"""Honest lifecycle statuses for the TikTok LIVE adapter."""

from __future__ import annotations

from app.live_platforms.common.status import LivePlatformIntegrationStatus

# Module-level status until an approved provider transport is injected and
# a real LIVE validation run completes. Do not promote to READY here.
CURRENT_STATUS = LivePlatformIntegrationStatus.BLOCKED_BY_PROVIDER_ACCESS


def current_status() -> LivePlatformIntegrationStatus:
    return CURRENT_STATUS


ADAPTER_STATUS_CODE = "blocked_by_provider_access"

ADAPTER_LIMITATION = (
    "Official TikTok Developer APIs reviewed on 2026-08-01 document Login Kit, "
    "Share Kit, Display API, Content Posting API, and Research API — not a "
    "third-party LIVE chat/gift event feed. Unofficial webcast scraping, stolen "
    "cookies, CAPTCHA bypass, and reverse-engineered private endpoints are not "
    "used. Configure an approved provider transport (LivePlatformAuthProvider + "
    "LivePlatformTransport) with explicit capability grant before connection."
)