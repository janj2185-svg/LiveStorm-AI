"""Honest lifecycle statuses for TikTok LIVE integration."""

from __future__ import annotations

from enum import StrEnum


class TikTokIntegrationStatus(StrEnum):
    SPEC_ONLY = "SPEC_ONLY"
    IMPLEMENTED_NOT_CONNECTED = "IMPLEMENTED_NOT_CONNECTED"
    BLOCKED_BY_PROVIDER_ACCESS = "BLOCKED_BY_PROVIDER_ACCESS"
    CONNECTED_NOT_VALIDATED = "CONNECTED_NOT_VALIDATED"
    PARTIAL_PRODUCTION_CANDIDATE = "PARTIAL_PRODUCTION_CANDIDATE"
    READY = "READY"


# Module-level status until an approved provider transport is injected and
# a real LIVE validation run completes. Do not promote to READY here.
CURRENT_STATUS = TikTokIntegrationStatus.BLOCKED_BY_PROVIDER_ACCESS


def current_status() -> TikTokIntegrationStatus:
    return CURRENT_STATUS


ADAPTER_STATUS_CODE = "blocked_by_provider_access"

ADAPTER_LIMITATION = (
    "Official TikTok Developer APIs reviewed on 2026-08-01 document Login Kit, "
    "Share Kit, Display API, Content Posting API, and Research API — not a "
    "third-party LIVE chat/gift event feed. Unofficial webcast scraping, stolen "
    "cookies, CAPTCHA bypass, and reverse-engineered private endpoints are not "
    "used. Configure an approved provider transport (TikTokAuthProvider + "
    "TikTokTransport) with explicit capability grant before connection."
)
