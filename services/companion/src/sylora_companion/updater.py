"""Signed, staged updater that never replaces the running process."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import platform
import re
import sys
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, Protocol, cast
from urllib.parse import urlparse

import httpx
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .models import UpdateManifest

COMPILED_UPDATE_PUBLIC_KEY: str | None = None
MAX_UPDATE_BYTES = 512 * 1024 * 1024


class UpdaterUnavailable(RuntimeError):
    """No trusted update source is configured."""


class UpdateRejected(RuntimeError):
    """Manifest or artifact failed a security check."""


class UpdateHTTPTransport(Protocol):
    async def get_json(self, url: str) -> dict[str, Any]: ...

    async def get_bytes(self, url: str, limit: int) -> bytes: ...


class HTTPXUpdateTransport:
    async def get_json(self, url: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            response = await client.get(url)
            response.raise_for_status()
        value = response.json()
        if not isinstance(value, dict):
            raise UpdateRejected("update manifest must be an object")
        return cast(dict[str, Any], value)

    async def get_bytes(self, url: str, limit: int) -> bytes:
        chunks: list[bytes] = []
        total = 0
        async with (
            httpx.AsyncClient(timeout=120, follow_redirects=False) as client,
            client.stream("GET", url) as response,
        ):
            response.raise_for_status()
            async for chunk in response.aiter_bytes():
                total += len(chunk)
                if total > limit:
                    raise UpdateRejected("update artifact exceeds size limit")
                chunks.append(chunk)
        return b"".join(chunks)


def current_platform() -> str:
    return f"{sys.platform}-{platform.machine().lower()}"


def canonical_manifest(manifest: UpdateManifest) -> bytes:
    payload = {
        "platform": manifest.platform,
        "sha256": manifest.sha256.lower(),
        "url": manifest.url,
        "version": manifest.version,
    }
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()


def _decode_key(value: str) -> bytes:
    try:
        decoded = bytes.fromhex(value)
    except ValueError:
        try:
            decoded = base64.b64decode(value, validate=True)
        except ValueError as exc:
            raise UpdateRejected("trusted update public key is malformed") from exc
    if len(decoded) != 32:
        raise UpdateRejected("trusted update public key must be 32 bytes")
    return decoded


def _decode_signature(value: str) -> bytes:
    try:
        decoded = base64.b64decode(value, validate=True)
    except ValueError as exc:
        raise UpdateRejected("manifest signature is malformed") from exc
    if len(decoded) != 64:
        raise UpdateRejected("manifest signature must be 64 bytes")
    return decoded


def verify_manifest(manifest: UpdateManifest, public_key: str) -> None:
    """Verify platform, HTTPS artifact URL, and Ed25519 manifest signature."""

    if manifest.platform != current_platform():
        raise UpdateRejected(
            f"manifest platform {manifest.platform!r} does not match {current_platform()!r}"
        )
    parsed = urlparse(manifest.url)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise UpdateRejected("update artifact URL must be credential-free HTTPS")
    key = Ed25519PublicKey.from_public_bytes(_decode_key(public_key))
    try:
        key.verify(_decode_signature(manifest.signature), canonical_manifest(manifest))
    except InvalidSignature as exc:
        raise UpdateRejected("manifest Ed25519 signature is invalid") from exc


class SignedUpdater:
    """Check, verify, and stage an update without executing it."""

    def __init__(
        self,
        manifest_url: str | None,
        configured_public_key: str | None,
        state_dir: Path,
        is_streaming: Callable[[], Awaitable[bool]],
        transport: UpdateHTTPTransport | None = None,
    ) -> None:
        self._manifest_url = manifest_url
        self._public_key = configured_public_key or COMPILED_UPDATE_PUBLIC_KEY
        self._state_dir = state_dir
        self._is_streaming = is_streaming
        self._transport = transport or HTTPXUpdateTransport()

    @property
    def available(self) -> bool:
        return bool(self._manifest_url and self._public_key)

    async def check(self) -> UpdateManifest:
        if not self._manifest_url or not self._public_key:
            raise UpdaterUnavailable("trusted key and HTTPS update URL are not configured")
        parsed = urlparse(self._manifest_url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise UpdaterUnavailable("update manifest URL is not HTTPS")
        raw = await self._transport.get_json(self._manifest_url)
        manifest = UpdateManifest.model_validate(raw)
        verify_manifest(manifest, self._public_key)
        return manifest

    async def check_and_stage(self) -> Path:
        manifest = await self.check()
        if await self._is_streaming():
            raise UpdateRejected("update staging refused while OBS is streaming")
        artifact = await self._transport.get_bytes(manifest.url, MAX_UPDATE_BYTES)
        digest = hashlib.sha256(artifact).hexdigest()
        if not secrets_compare(digest, manifest.sha256.lower()):
            raise UpdateRejected("update artifact SHA-256 mismatch")
        safe_version = re.sub(r"[^A-Za-z0-9._-]", "_", manifest.version)
        update_dir = self._state_dir / "updates"
        update_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(update_dir, 0o700)
        destination = update_dir / f"sylora-companion-{safe_version}-{manifest.platform}.bin"
        temporary = destination.with_suffix(".tmp")
        descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o700)
        try:
            with os.fdopen(descriptor, "wb") as handle:
                handle.write(artifact)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, destination)
            os.chmod(destination, 0o700)
        finally:
            if temporary.exists():
                temporary.unlink()
        return destination


def secrets_compare(left: str, right: str) -> bool:
    """Constant-time digest comparison kept separate for focused testing."""

    import hmac

    return hmac.compare_digest(left.encode(), right.encode())
