"""Auth providers — only approved providers can unlock LIVE event transport."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.live_platforms.common.interfaces import LiveAuthMaterial, LiveConnectRequest


class BlockedTikTokAuthProvider:
    """Default provider when no approved TikTok LIVE access exists."""

    name = "blocked"

    def __init__(self, *, reason: str = "blocked_by_provider_access") -> None:
        self.reason = reason

    def is_approved(self) -> bool:
        return False

    async def resolve(self, request: LiveConnectRequest) -> LiveAuthMaterial:
        raise PermissionError(self.reason)

    async def refresh(self, material: LiveAuthMaterial) -> LiveAuthMaterial:
        raise PermissionError(self.reason)


class ConfiguredApprovedAuthProvider:
    """Placeholder for an owner-approved contracted provider.

    Does not implement unofficial TikTok webcast signing. Requires explicit
    `approved=True` plus non-empty credential material supplied by operators.
    """

    name = "approved_provider"

    def __init__(
        self,
        *,
        provider_name: str,
        api_key: str | None = None,
        access_token: str | None = None,
        refresh_token: str | None = None,
        scopes: frozenset[str] | None = None,
        approved: bool = False,
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        self._provider_name = provider_name
        self._api_key = api_key
        self._access_token = access_token
        self._refresh_token = refresh_token
        self._scopes = scopes or frozenset()
        self._approved = approved
        self._metadata = dict(metadata or {})

    def is_approved(self) -> bool:
        return self._approved and bool(self._api_key or self._access_token)

    async def resolve(self, request: LiveConnectRequest) -> LiveAuthMaterial:
        if not self.is_approved():
            raise PermissionError("blocked_by_provider_access")
        return LiveAuthMaterial(
            provider=self._provider_name,
            access_token=self._access_token,
            refresh_token=self._refresh_token,
            api_key=self._api_key,
            scopes=self._scopes,
            metadata={
                **self._metadata,
                "account": request.account,
                "room_id": request.room_id,
            },
        )

    async def refresh(self, material: LiveAuthMaterial) -> LiveAuthMaterial:
        # Approved provider refresh is provider-specific; until a concrete
        # contracted SDK is wired, refresh re-resolves static material.
        return material