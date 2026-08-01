"""Facebook LIVE adapter package (stub)."""

from __future__ import annotations

from app.live_platforms.common.stub import stub_status_report
from app.live_platforms.common.status import LivePlatformId, LivePlatformStatusReport


class FacebookLivePlatformStub:
    platform = LivePlatformId.FACEBOOK

    def status(self) -> LivePlatformStatusReport:
        return stub_status_report(
            LivePlatformId.FACEBOOK,
            reason="Facebook LIVE adapter not implemented; package reserved for independent adapter.",
        )


__all__ = ["FacebookLivePlatformStub"]