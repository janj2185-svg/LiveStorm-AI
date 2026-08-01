"""Credential interfaces for live platforms."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class LivePlatformCredentials:
    """Opaque credentials bag — platform adapters interpret fields they need."""

    platform: str
    access_token: str = ""
    refresh_token: str = ""
    api_key: str = ""
    api_secret: str = ""
    client_id: str = ""
    client_secret: str = ""
    room_id: str = ""
    channel_id: str = ""
    username: str = ""
    expires_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_expired(self, *, now: datetime | None = None) -> bool:
        if self.expires_at is None:
            return False
        from datetime import timezone

        current = now or datetime.now(timezone.utc)
        if self.expires_at.tzinfo is None:
            return current.replace(tzinfo=None) >= self.expires_at
        return current >= self.expires_at

    def to_public_dict(self) -> dict[str, Any]:
        """Safe summary — never includes secrets."""
        return {
            "platform": self.platform,
            "room_id": self.room_id,
            "channel_id": self.channel_id,
            "username": self.username,
            "has_access_token": bool(self.access_token),
            "has_api_key": bool(self.api_key),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }