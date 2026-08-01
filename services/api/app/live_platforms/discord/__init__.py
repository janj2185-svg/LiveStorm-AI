"""Discord live adapter package (stub — production adapter lives in live_adapters today)."""

from __future__ import annotations

from app.live_platforms.common.stub import stub_status_report
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


class DiscordLivePlatformStub:
    platform = LivePlatformId.DISCORD

    def status(self) -> LivePlatformStatusReport:
        return stub_status_report(
            LivePlatformId.DISCORD,
            reason="Discord production path remains in live_adapters; this package is the extraction slot.",
        )


__all__ = ["DiscordLivePlatformStub"]