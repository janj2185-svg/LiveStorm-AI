from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import Collection, Mapping
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Protocol

import httpx
import jwt
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit import add_system_audit_event
from app.config import Settings
from app.observability import increment_counter
from app.push_models import DevicePushToken

logger = logging.getLogger("sylora.push")

FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


@dataclass(frozen=True)
class PushMessage:
    title: str
    body: str
    data: Mapping[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class PushDispatchSummary:
    attempted: int = 0
    sent: int = 0
    skipped: int = 0
    failed: int = 0


class PushDispatcher(Protocol):
    configured: bool

    async def dispatch(
        self,
        db: AsyncSession,
        *,
        user_ids: Collection[uuid.UUID],
        message: PushMessage,
    ) -> PushDispatchSummary:
        """Dispatch one notification to active devices for the target users."""
        ...


class UnconfiguredPushProvider:
    configured = False

    async def dispatch(
        self,
        db: AsyncSession,
        *,
        user_ids: Collection[uuid.UUID],
        message: PushMessage,
    ) -> PushDispatchSummary:
        del db, message
        unique_user_ids = set(user_ids)
        logger.info(
            "push_skipped",
            extra={
                "reason": "unconfigured",
                "user_count": len(unique_user_ids),
            },
        )
        return PushDispatchSummary(skipped=len(unique_user_ids))


class FcmHttpV1Provider:
    configured = True

    def __init__(
        self,
        *,
        project_id: str,
        service_account: Mapping[str, Any],
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.project_id = project_id
        self.service_account = dict(service_account)
        self._client = client
        self._access_token: str | None = None
        self._access_token_expires_at = 0.0

    async def dispatch(
        self,
        db: AsyncSession,
        *,
        user_ids: Collection[uuid.UUID],
        message: PushMessage,
    ) -> PushDispatchSummary:
        unique_user_ids = set(user_ids)
        if not unique_user_ids:
            return PushDispatchSummary()
        tokens = list(
            (
                await db.scalars(
                    select(DevicePushToken).where(
                        DevicePushToken.user_id.in_(unique_user_ids),
                        DevicePushToken.revoked_at.is_(None),
                    )
                )
            ).all()
        )
        if not tokens:
            logger.info(
                "push_skipped",
                extra={"reason": "no_active_devices", "user_count": len(unique_user_ids)},
            )
            return PushDispatchSummary(skipped=len(unique_user_ids))

        access_token = await self._bearer_token()
        attempted = sent = failed = 0
        for token in tokens:
            attempted += 1
            try:
                await self._send_to_token(access_token, token.token, message)
                sent += 1
            except Exception as exc:  # noqa: BLE001 - best-effort notification boundary
                failed += 1
                logger.warning(
                    "push_delivery_failed",
                    extra={
                        "provider": "fcm_http_v1",
                        "device_id": str(token.id),
                        "platform": token.platform.value,
                        "error": str(exc),
                    },
                )
        return PushDispatchSummary(attempted=attempted, sent=sent, failed=failed)

    async def _bearer_token(self) -> str:
        now = time.time()
        if self._access_token and now < self._access_token_expires_at - 60:
            return self._access_token
        client_email = str(self.service_account["client_email"])
        private_key = str(self.service_account["private_key"])
        issued_at = int(now)
        assertion = jwt.encode(
            {
                "iss": client_email,
                "scope": FCM_SCOPE,
                "aud": GOOGLE_TOKEN_URL,
                "iat": issued_at,
                "exp": issued_at + 3600,
            },
            private_key,
            algorithm="RS256",
        )
        response = await self._post(
            GOOGLE_TOKEN_URL,
            data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                "assertion": assertion,
            },
        )
        response.raise_for_status()
        payload = response.json()
        self._access_token = str(payload["access_token"])
        self._access_token_expires_at = now + int(payload.get("expires_in", 3600))
        return self._access_token

    async def _send_to_token(self, access_token: str, token: str, message: PushMessage) -> None:
        response = await self._post(
            f"https://fcm.googleapis.com/v1/projects/{self.project_id}/messages:send",
            headers={"Authorization": f"Bearer {access_token}"},
            json={
                "message": {
                    "token": token,
                    "notification": {"title": message.title, "body": message.body},
                    "data": dict(message.data),
                },
            },
        )
        response.raise_for_status()

    async def _post(self, url: str, **kwargs: Any) -> httpx.Response:
        if self._client is not None:
            return await self._client.post(url, **kwargs)
        async with httpx.AsyncClient(timeout=10) as client:
            return await client.post(url, **kwargs)


def configured_push_dispatcher(settings: Settings) -> PushDispatcher:
    service_account_ref = settings.fcm_service_account_json
    if (
        not settings.push_enabled
        or not settings.fcm_project_id
        or service_account_ref is None
        or not service_account_ref.get_secret_value().strip()
    ):
        return UnconfiguredPushProvider()
    service_account = _load_service_account(service_account_ref)
    if service_account is None:
        logger.info("push_skipped", extra={"reason": "invalid_fcm_service_account"})
        return UnconfiguredPushProvider()
    return FcmHttpV1Provider(project_id=settings.fcm_project_id, service_account=service_account)


def push_dispatcher_is_configured(dispatcher: PushDispatcher) -> bool:
    """Return whether the runtime dispatcher can accept device registrations."""
    return bool(getattr(dispatcher, "configured", False))


def _load_service_account(value: SecretStr) -> Mapping[str, Any] | None:
    raw = value.get_secret_value().strip()
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        path = Path(raw)
        if not path.is_file():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
    required = {"client_email", "private_key"}
    if not isinstance(payload, dict) or not required.issubset(payload):
        return None
    return payload


async def dispatch_push_best_effort(
    db: AsyncSession,
    dispatcher: PushDispatcher,
    *,
    user_ids: Collection[uuid.UUID],
    message: PushMessage,
    action: str,
    actor_user_id: uuid.UUID | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> PushDispatchSummary | None:
    try:
        summary = await dispatcher.dispatch(db, user_ids=user_ids, message=message)
        if summary.skipped:
            increment_counter("push_skipped", summary.skipped)
        return summary
    except Exception as exc:  # noqa: BLE001 - notifications must not break primary flow
        logger.exception("push_dispatch_failed", extra={"action": action, "error": str(exc)})
        add_system_audit_event(
            db,
            action,
            actor_user_id=actor_user_id,
            metadata={str(key): str(value) for key, value in dict(metadata or {}).items()},
        )
        await db.commit()
        return None
