"""Local capability and confirmation enforcement for cloud commands."""

from __future__ import annotations

import asyncio
import secrets
from dataclasses import dataclass
from typing import Any

from .events import EventBus


class CapabilityDenied(PermissionError):
    """The local user did not grant a cloud capability."""


class ConfirmationDenied(PermissionError):
    """A sensitive cloud action was denied or timed out."""


@dataclass(frozen=True, slots=True)
class PendingConfirmation:
    confirmation_id: str
    action: str
    arguments: dict[str, Any]


class ConfirmationManager:
    """Bridge a cloud command to an explicit local API decision."""

    def __init__(self, events: EventBus) -> None:
        self._events = events
        self._pending: dict[str, tuple[PendingConfirmation, asyncio.Future[bool]]] = {}
        self._lock = asyncio.Lock()

    async def request(
        self, action: str, arguments: dict[str, Any], wait_seconds: float
    ) -> bool:
        confirmation = PendingConfirmation(
            confirmation_id=secrets.token_urlsafe(18),
            action=action,
            arguments=arguments,
        )
        future: asyncio.Future[bool] = asyncio.get_running_loop().create_future()
        async with self._lock:
            self._pending[confirmation.confirmation_id] = (confirmation, future)
        await self._events.publish(
            "companion.confirmation.requested",
            {
                "confirmationId": confirmation.confirmation_id,
                "action": action,
                "arguments": arguments,
            },
        )
        try:
            async with asyncio.timeout(wait_seconds):
                return await future
        except TimeoutError:
            return False
        finally:
            async with self._lock:
                self._pending.pop(confirmation.confirmation_id, None)

    async def resolve(self, confirmation_id: str, approved: bool) -> bool:
        async with self._lock:
            entry = self._pending.get(confirmation_id)
        if entry is None:
            return False
        future = entry[1]
        if not future.done():
            future.set_result(approved)
        return True

    async def pending(self) -> list[PendingConfirmation]:
        async with self._lock:
            return [entry[0] for entry in self._pending.values()]


class CommandPolicy:
    """Enforce a local allowlist before any cloud command reaches OBS."""

    def __init__(
        self,
        allowed_capabilities: frozenset[str],
        confirmation_actions: frozenset[str],
        confirmations: ConfirmationManager,
        confirmation_timeout: float,
    ) -> None:
        self._allowed = allowed_capabilities
        self._confirmation_actions = confirmation_actions
        self._confirmations = confirmations
        self._timeout = confirmation_timeout

    async def authorize(self, action: str, arguments: dict[str, Any]) -> None:
        if action not in self._allowed:
            raise CapabilityDenied(f"cloud capability not approved: {action}")
        if action in self._confirmation_actions:
            approved = await self._confirmations.request(action, arguments, self._timeout)
            if not approved:
                raise ConfirmationDenied(f"local confirmation denied: {action}")
