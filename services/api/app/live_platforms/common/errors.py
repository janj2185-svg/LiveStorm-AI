"""Structured errors for live-platform adapters."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class LivePlatformErrorCode(str, Enum):
    NOT_CONFIGURED = "not_configured"
    AUTH_FAILED = "auth_failed"
    AUTH_EXPIRED = "auth_expired"
    PROVIDER_BLOCKED = "provider_blocked"
    TRANSPORT_FAILED = "transport_failed"
    RATE_LIMITED = "rate_limited"
    CIRCUIT_OPEN = "circuit_open"
    NORMALIZE_FAILED = "normalize_failed"
    DUPLICATE_EVENT = "duplicate_event"
    CONNECTION_LOST = "connection_lost"
    INVALID_ROOM = "invalid_room"
    UNSUPPORTED = "unsupported"
    INTERNAL = "internal"


@dataclass
class LivePlatformError(Exception):
    code: LivePlatformErrorCode
    message: str
    platform: str = ""
    retryable: bool = False
    details: dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:
        return f"[{self.code.value}] {self.message}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code.value,
            "message": self.message,
            "platform": self.platform,
            "retryable": self.retryable,
            "details": dict(self.details),
        }


class LivePlatformAuthError(LivePlatformError):
    def __init__(self, message: str, *, platform: str = "", details: dict[str, Any] | None = None):
        super().__init__(
            code=LivePlatformErrorCode.AUTH_FAILED,
            message=message,
            platform=platform,
            retryable=False,
            details=details or {},
        )


class LivePlatformProviderBlockedError(LivePlatformError):
    def __init__(self, message: str, *, platform: str = "", details: dict[str, Any] | None = None):
        super().__init__(
            code=LivePlatformErrorCode.PROVIDER_BLOCKED,
            message=message,
            platform=platform,
            retryable=False,
            details=details or {},
        )


class LivePlatformTransportError(LivePlatformError):
    def __init__(
        self,
        message: str,
        *,
        platform: str = "",
        retryable: bool = True,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(
            code=LivePlatformErrorCode.TRANSPORT_FAILED,
            message=message,
            platform=platform,
            retryable=retryable,
            details=details or {},
        )


class LivePlatformRateLimitError(LivePlatformError):
    def __init__(self, message: str, *, platform: str = "", details: dict[str, Any] | None = None):
        super().__init__(
            code=LivePlatformErrorCode.RATE_LIMITED,
            message=message,
            platform=platform,
            retryable=True,
            details=details or {},
        )