"""Local credentials, request authentication, and boundary middleware."""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import ipaddress
import json
import logging
import os
import secrets
import sys
import time
from collections import OrderedDict, defaultdict, deque
from pathlib import Path
from typing import Any

from starlette.datastructures import Headers
from starlette.responses import JSONResponse, Response
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import Settings

LOGGER = logging.getLogger(__name__)
SERVICE_NAME = "sylora-companion"


class SecretStore:
    """Use the OS keyring, falling back to a user-only state file."""

    def __init__(self, state_dir: Path) -> None:
        self._state_dir = state_dir
        self._warned_fallback = False

    def get(self, name: str) -> str | None:
        if self._keyring_available():
            try:
                import keyring

                value = keyring.get_password(SERVICE_NAME, name)
                if isinstance(value, str) and value:
                    return value
            except Exception:
                self._require_linux_fallback()
        else:
            self._require_linux_fallback()
        path = self._path(name)
        if not path.exists():
            return None
        mode = path.stat().st_mode & 0o777
        if mode != 0o600:
            raise PermissionError(f"credential file has unsafe mode {mode:o}")
        return path.read_text(encoding="utf-8").strip()

    def set(self, name: str, value: str) -> None:
        if self._keyring_available():
            try:
                import keyring

                keyring.set_password(SERVICE_NAME, name, value)
                return
            except Exception:
                self._require_linux_fallback()
        else:
            self._require_linux_fallback()
        self._state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self._state_dir, 0o700)
        path = self._path(name)
        temporary = path.with_suffix(".tmp")
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                handle.write(value)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, path)
            os.chmod(path, 0o600)
        finally:
            if temporary.exists():
                temporary.unlink()

    def _path(self, name: str) -> Path:
        safe_name = "".join(
            character
            for character in name
            if character.isalnum() or character in "-_"
        )
        if not safe_name or safe_name != name:
            raise ValueError("invalid secret name")
        return self._state_dir / f"{safe_name}.secret"

    @staticmethod
    def _keyring_available() -> bool:
        """Avoid blocking desktop keyring calls when no user session bus exists."""
        if os.getenv("SYLORA_COMPANION_DISABLE_KEYRING") == "1":
            return False
        if sys.platform.startswith("linux"):
            return bool(os.getenv("DBUS_SESSION_BUS_ADDRESS"))
        return True

    def _require_linux_fallback(self) -> None:
        if not sys.platform.startswith("linux"):
            raise RuntimeError("a working OS keyring is required on this platform")
        if not self._warned_fallback:
            LOGGER.warning("OS keyring unavailable; using Linux permission-0600 credential files")
            self._warned_fallback = True


class LocalTokenManager:
    """Own a 256-bit local API bearer token."""

    def __init__(self, store: SecretStore) -> None:
        self._store = store
        self._token: str | None = None

    def load_or_create(self) -> str:
        if self._token is not None:
            return self._token
        existing = self._store.get("local-api-token")
        if existing:
            self._token = existing
            return existing
        return self.rotate()

    def rotate(self) -> str:
        token = secrets.token_urlsafe(32)
        self._store.set("local-api-token", token)
        self._token = token
        return token

    def verify(self, candidate: str) -> bool:
        return hmac.compare_digest(self.load_or_create().encode(), candidate.encode())


def bearer_value(value: str | None) -> str | None:
    if not value:
        return None
    scheme, separator, credential = value.partition(" ")
    if not separator or scheme.lower() != "bearer" or not credential:
        return None
    return credential


class LocalAuthenticationMiddleware:
    """Require the local bearer token for every route except liveness/readiness."""

    _HEALTH_PATHS = frozenset({"/health/live", "/health/ready"})

    def __init__(self, app: ASGIApp, tokens: LocalTokenManager) -> None:
        self.app = app
        self._tokens = tokens

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return
        if scope.get("path") in self._HEALTH_PATHS:
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        candidate = bearer_value(headers.get("authorization"))
        if candidate is not None and self._tokens.verify(candidate):
            await self.app(scope, receive, send)
            return
        if scope["type"] == "websocket":
            await send(
                {
                    "type": "websocket.close",
                    "code": 4401,
                    "reason": "invalid bearer token",
                }
            )
            return
        await JSONResponse(
            {"detail": "invalid bearer token"},
            status_code=401,
            headers={"WWW-Authenticate": "Bearer"},
        )(scope, receive, send)


def _request_host(raw_host: str) -> str:
    value = raw_host.strip().lower()
    if value.startswith("["):
        end = value.find("]")
        return value[: end + 1] if end >= 0 else value
    if value.count(":") == 1:
        return value.rsplit(":", 1)[0]
    return value


class BoundaryMiddleware:
    """Reject DNS rebinding, oversized requests, and unapproved LAN clients."""

    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app = app
        self._allowed_hosts = {host.lower() for host in settings.allowed_hosts}
        self._allowed_hosts.add(settings.bind_host.lower())
        self._body_limit = settings.body_limit_bytes
        self._allow_lan = settings.allow_lan
        self._networks = tuple(
            ipaddress.ip_network(cidr, strict=False) for cidr in settings.lan_cidrs
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in {"http", "websocket"}:
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        if _request_host(headers.get("host", "")) not in self._allowed_hosts:
            await self._reject(scope, receive, send, 400, "unapproved Host header")
            return
        client = scope.get("client")
        if client and not self._client_allowed(client[0]):
            await self._reject(scope, receive, send, 403, "client address is not allowlisted")
            return
        content_length = headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self._body_limit:
                    await self._reject(scope, receive, send, 413, "request body too large")
                    return
            except ValueError:
                await self._reject(scope, receive, send, 400, "invalid Content-Length")
                return
        consumed = 0

        async def limited_receive() -> Message:
            nonlocal consumed
            message = await receive()
            if message["type"] == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > self._body_limit:
                    raise BodyTooLargeError
            return message

        try:
            await self.app(scope, limited_receive, send)
        except BodyTooLargeError:
            await JSONResponse({"detail": "request body too large"}, status_code=413)(
                scope, receive, send
            )

    def _client_allowed(self, host: str) -> bool:
        try:
            address = ipaddress.ip_address(host)
        except ValueError:
            return False
        if address.is_loopback:
            return True
        return self._allow_lan and any(address in network for network in self._networks)

    @staticmethod
    async def _reject(
        scope: Scope, receive: Receive, send: Send, code: int, detail: str
    ) -> None:
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008, "reason": detail})
            return
        await JSONResponse({"detail": detail}, status_code=code)(scope, receive, send)


class BodyTooLargeError(Exception):
    """Internal signal from the receive wrapper."""


class RateLimitMiddleware:
    """Small in-memory fixed-window limiter suitable for a local service."""

    def __init__(self, app: ASGIApp, requests_per_minute: int) -> None:
        self.app = app
        self._limit = requests_per_minute
        self._requests: defaultdict[str, deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        client = scope.get("client")
        identity = client[0] if client else "unknown"
        now = time.monotonic()
        async with self._lock:
            window = self._requests[identity]
            while window and now - window[0] >= 60:
                window.popleft()
            if len(window) >= self._limit:
                response: Response = JSONResponse(
                    {"detail": "rate limit exceeded"},
                    status_code=429,
                    headers={"Retry-After": "60"},
                )
                await response(scope, receive, send)
                return
            window.append(now)
        await self.app(scope, receive, send)


class SignedMessageVerifier:
    """Verify timestamped HMAC messages and reject nonce replay."""

    def __init__(
        self, credential: str, *, max_clock_skew: int = 60, nonce_limit: int = 2048
    ) -> None:
        self._credential = credential.encode()
        self._max_clock_skew = max_clock_skew
        self._nonce_limit = nonce_limit
        self._nonces: OrderedDict[str, None] = OrderedDict()

    @staticmethod
    def canonical(message: dict[str, Any]) -> bytes:
        unsigned = {key: value for key, value in message.items() if key != "signature"}
        return json.dumps(unsigned, sort_keys=True, separators=(",", ":")).encode()

    def sign(self, message: dict[str, Any]) -> str:
        return hmac.new(self._credential, self.canonical(message), hashlib.sha256).hexdigest()

    def verify(self, message: dict[str, Any], now: int | None = None) -> bool:
        signature = message.get("signature")
        timestamp = message.get("timestamp")
        nonce = message.get("nonce")
        if (
            not isinstance(signature, str)
            or not isinstance(timestamp, int)
            or not isinstance(nonce, str)
        ):
            return False
        current = int(time.time()) if now is None else now
        if abs(current - timestamp) > self._max_clock_skew or nonce in self._nonces:
            return False
        expected = self.sign(message)
        if not hmac.compare_digest(signature, expected):
            return False
        self._nonces[nonce] = None
        while len(self._nonces) > self._nonce_limit:
            self._nonces.popitem(last=False)
        return True
