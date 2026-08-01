"""Shared live-platform status vocabulary."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum, StrEnum
from typing import Any


class LivePlatformId(str, Enum):
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    TWITCH = "twitch"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    DISCORD = "discord"
    OBS = "obs"


class LivePlatformIntegrationStatus(StrEnum):
    """Honest lifecycle of any live-platform adapter."""

    SPEC_ONLY = "SPEC_ONLY"
    IMPLEMENTED_NOT_CONNECTED = "IMPLEMENTED_NOT_CONNECTED"
    BLOCKED_BY_PROVIDER_ACCESS = "BLOCKED_BY_PROVIDER_ACCESS"
    CONNECTED_NOT_VALIDATED = "CONNECTED_NOT_VALIDATED"
    PARTIAL_PRODUCTION_CANDIDATE = "PARTIAL_PRODUCTION_CANDIDATE"
    NOT_CONFIGURED = "not_configured"
    CONFIGURED = "configured"
    AUTHENTICATED = "authenticated"
    CONNECTED = "connected"
    LIVE = "live"
    DEGRADED = "degraded"
    DISCONNECTED = "disconnected"
    FAILED = "failed"
    READY = "READY"


class LivePlatformStatus(str, Enum):
    """Operational connection status for a platform session."""

    IDLE = "idle"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    LIVE = "live"
    RECONNECTING = "reconnecting"
    DEGRADED = "degraded"
    DISCONNECTED = "disconnected"
    FAILED = "failed"
    BLOCKED = "blocked"


@dataclass(slots=True)
class LivePlatformStatusReport:
    platform: LivePlatformId | str
    integration_status: LivePlatformIntegrationStatus
    connection_status: LivePlatformStatus = LivePlatformStatus.IDLE
    reason: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    next_actions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "platform": self.platform.value if isinstance(self.platform, Enum) else str(self.platform),
            "integration_status": self.integration_status.value,
            "connection_status": self.connection_status.value,
            "reason": self.reason,
            "details": dict(self.details),
            "next_actions": list(self.next_actions),
        }