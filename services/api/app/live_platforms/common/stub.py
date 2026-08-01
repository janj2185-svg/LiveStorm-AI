"""Shared stub base for platforms not yet extracted into full adapters."""

from __future__ import annotations

from app.live_platforms.common.status import (
    LivePlatformId,
    LivePlatformIntegrationStatus,
    LivePlatformStatus,
    LivePlatformStatusReport,
)


def stub_status_report(
    platform: LivePlatformId,
    *,
    reason: str,
    next_actions: list[str] | None = None,
) -> LivePlatformStatusReport:
    return LivePlatformStatusReport(
        platform=platform,
        integration_status=LivePlatformIntegrationStatus.SPEC_ONLY,
        connection_status=LivePlatformStatus.IDLE,
        reason=reason,
        details={"adapter": "stub", "hub_ready": True},
        next_actions=next_actions
        or [
            "Implement LivePlatformAuthProvider + LivePlatformTransport for this platform",
            "Emit NormalizedLiveEvent via LivePlatformConnectionManager → LiveEventHub",
        ],
    )