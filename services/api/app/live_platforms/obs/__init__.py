"""OBS adapter package (stub — production OBS path lives in live_adapters / output today)."""

from __future__ import annotations

from app.live_platforms.common.stub import stub_status_report
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


class ObsLivePlatformStub:
    platform = LivePlatformId.OBS

    def status(self) -> LivePlatformStatusReport:
        return stub_status_report(
            LivePlatformId.OBS,
            reason="OBS production path remains in live_adapters/output; this package is the extraction slot.",
        )


__all__ = ["ObsLivePlatformStub"]