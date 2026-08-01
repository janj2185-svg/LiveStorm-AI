"""Twitch LIVE adapter package (stub — production adapter lives in live_adapters today)."""

from __future__ import annotations

from app.live_platforms.common.stub import stub_status_report
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


class TwitchLivePlatformStub:
    platform = LivePlatformId.TWITCH

    def status(self) -> LivePlatformStatusReport:
        return stub_status_report(
            LivePlatformId.TWITCH,
            reason="Twitch production path remains in live_adapters; this package is the extraction slot.",
        )


__all__ = ["TwitchLivePlatformStub"]