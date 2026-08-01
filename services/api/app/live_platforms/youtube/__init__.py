"""YouTube LIVE adapter package (stub — production adapter lives in live_adapters today)."""

from __future__ import annotations

from app.live_platforms.common.stub import stub_status_report
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


class YouTubeLivePlatformStub:
    """Independent package slot for YouTube. Does not alter LiveEventHub."""

    platform = LivePlatformId.YOUTUBE

    def status(self) -> LivePlatformStatusReport:
        return stub_status_report(
            LivePlatformId.YOUTUBE,
            reason="YouTube production path remains in live_adapters; this package is the extraction slot.",
        )


__all__ = ["YouTubeLivePlatformStub"]