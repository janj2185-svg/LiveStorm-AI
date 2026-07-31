from __future__ import annotations

import base64
import hashlib
from pathlib import Path
from typing import Any

import pytest
from conftest import TestUpdateTransport, mode
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from sylora_companion.models import UpdateManifest
from sylora_companion.updater import (
    SignedUpdater,
    UpdateRejected,
    UpdaterUnavailable,
    canonical_manifest,
    current_platform,
)


def signed_manifest(
    private_key: Ed25519PrivateKey,
    artifact: bytes,
    **overrides: Any,
) -> dict[str, Any]:
    raw: dict[str, Any] = {
        "version": "1.2.3",
        "platform": current_platform(),
        "url": "https://updates.sylora.example/companion.bin",
        "sha256": hashlib.sha256(artifact).hexdigest(),
        "signature": "x" * 40,
    }
    raw.update(overrides)
    unsigned = UpdateManifest.model_validate(raw)
    raw["signature"] = base64.b64encode(
        private_key.sign(canonical_manifest(unsigned))
    ).decode()
    return raw


def public_key(private_key: Ed25519PrivateKey) -> str:
    return base64.b64encode(private_key.public_key().public_bytes_raw()).decode()


@pytest.mark.asyncio
async def test_valid_signature_hash_and_staging_permissions(tmp_path: Path) -> None:
    private = Ed25519PrivateKey.generate()
    artifact = b"signed companion artifact"
    manifest = signed_manifest(private, artifact)

    async def not_streaming() -> bool:
        return False

    updater = SignedUpdater(
        "https://updates.sylora.example/manifest.json",
        public_key(private),
        tmp_path,
        not_streaming,
        TestUpdateTransport(manifest, artifact),
    )
    staged = await updater.check_and_stage()
    assert staged.read_bytes() == artifact
    assert mode(staged) == 0o700


@pytest.mark.asyncio
async def test_invalid_signature_is_rejected(tmp_path: Path) -> None:
    private = Ed25519PrivateKey.generate()
    artifact = b"artifact"
    manifest = signed_manifest(private, artifact)
    manifest["version"] = "tampered"

    async def not_streaming() -> bool:
        return False

    updater = SignedUpdater(
        "https://updates.sylora.example/manifest.json",
        public_key(private),
        tmp_path,
        not_streaming,
        TestUpdateTransport(manifest, artifact),
    )
    with pytest.raises(UpdateRejected, match="signature"):
        await updater.check()


@pytest.mark.asyncio
async def test_artifact_hash_mismatch_is_rejected(tmp_path: Path) -> None:
    private = Ed25519PrivateKey.generate()
    expected = b"expected artifact"
    manifest = signed_manifest(private, expected)

    async def not_streaming() -> bool:
        return False

    updater = SignedUpdater(
        "https://updates.sylora.example/manifest.json",
        public_key(private),
        tmp_path,
        not_streaming,
        TestUpdateTransport(manifest, b"tampered artifact"),
    )
    with pytest.raises(UpdateRejected, match="SHA-256"):
        await updater.check_and_stage()


@pytest.mark.asyncio
async def test_streaming_and_missing_trust_configuration_are_safe(tmp_path: Path) -> None:
    private = Ed25519PrivateKey.generate()
    artifact = b"artifact"
    manifest = signed_manifest(private, artifact)

    async def streaming() -> bool:
        return True

    updater = SignedUpdater(
        "https://updates.sylora.example/manifest.json",
        public_key(private),
        tmp_path,
        streaming,
        TestUpdateTransport(manifest, artifact),
    )
    with pytest.raises(UpdateRejected, match="while OBS is streaming"):
        await updater.check_and_stage()

    unavailable = SignedUpdater(None, None, tmp_path, streaming)
    assert unavailable.available is False
    with pytest.raises(UpdaterUnavailable):
        await unavailable.check()
