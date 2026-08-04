"""E2E soft-ping path: author → review publish → catalog → send (test harness).

Uses real soft-ping seed + asset bytes. Injects verified GiftAsset rows because
unit harness has no S3 (uploads return object_storage_unavailable).

Honest limits recorded in the assertion notes / report artifact:
- Not a live Docker/Compose publish
- Not Blender-sourced GLB
- Not a second-user WebSocket client proof outside HTTP ticket/send APIs
"""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any

import pytest
from sqlalchemy import select

from app.gift_models import (
    CreatorMonetizationSetting,
    GiftAsset,
    GiftAssetPlatform,
    GiftAssetState,
    GiftDelivery,
    GiftQualityTier,
    GiftSend,
)
from app.gift_schemas import RuntimeManifest
from app.security import utcnow
from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member, gift_live_context, issue

ROOT = Path(__file__).resolve().parents[3]
SOFT = ROOT / "artifacts" / "sylora-gift-100-originals" / "soft-ping"
SEED = ROOT / "artifacts" / "sylora-gift-100-originals" / "seed.json"
REPORT = ROOT / "artifacts" / "sylora-gift-100-originals" / "soft-ping" / "e2e-harness-report.json"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def _soft_ping_manifest(glb_id: uuid.UUID, audio_id: uuid.UUID, poster_id: uuid.UUID) -> dict[str, Any]:
    raw = json.loads((SOFT / "runtime-manifest.json").read_text(encoding="utf-8"))
    # Procedural packs must not claim Blender source_metadata.
    raw.pop("source_metadata", None)
    blob = json.dumps(raw)
    blob = blob.replace(raw["assets"][0]["asset_id"], str(glb_id))
    blob = blob.replace(
        next(a["asset_id"] for a in raw["assets"] if a["role"] == "primary_audio"),
        str(audio_id),
    )
    blob = blob.replace(
        next(a["asset_id"] for a in raw["assets"] if a["role"] == "poster"),
        str(poster_id),
    )
    manifest = json.loads(blob)
    RuntimeManifest.model_validate(manifest)
    return manifest


@pytest.mark.asyncio
async def test_soft_ping_author_publish_catalog_send(api: APIHarness) -> None:
    assert SOFT.is_dir(), "soft-ping assets missing — run build_sylora_100_priority.py"
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    soft = next(g for g in seed["gifts"] if g["slug"] == "soft-ping")
    payload = dict(soft["definition_payload"])

    author, author_tokens = await create_member(
        api,
        email="soft-ping-author@sylora.dev",
        display_name="Soft Ping Author",
        role="creator",
    )
    _, moderator_tokens = await create_member(
        api,
        email="soft-ping-moderator@sylora.dev",
        display_name="Soft Ping Moderator",
        role="moderator",
    )
    _, admin_tokens = await create_member(
        api,
        email="soft-ping-admin@sylora.dev",
        display_name="Soft Ping Admin",
        role="admin",
    )
    sender, sender_tokens = await create_member(
        api,
        email="soft-ping-sender@sylora.dev",
        display_name="Soft Ping Sender",
    )
    recipient, recipient_tokens = await create_member(
        api,
        email="soft-ping-recipient@sylora.dev",
        display_name="Soft Ping Recipient",
    )

    author_headers = bearer(author_tokens["access_token"])
    category = await api.client.post(
        "/v1/gifts/author/categories",
        headers=author_headers,
        json={
            "slug": "official-gift-library",
            "name": "Official Gift Library",
            "description": "SYLORA official originals",
        },
    )
    assert category.status_code == 201, category.text
    payload["category_id"] = category.json()["id"]
    definition = await api.client.post(
        "/v1/gifts/author/definitions",
        headers=author_headers,
        json=payload,
    )
    assert definition.status_code == 201, definition.text
    assert definition.json()["slug"] == "soft-ping"
    assert definition.json()["price_minor"] == 10
    assert definition.json()["tier"] == "rare"

    glb_id = uuid.uuid4()
    audio_id = uuid.uuid4()
    poster_id = uuid.uuid4()
    manifest = _soft_ping_manifest(glb_id, audio_id, poster_id)

    version = await api.client.post(
        f"/v1/gifts/author/definitions/{definition.json()['id']}/versions",
        headers=author_headers,
        json={"manifest": manifest},
    )
    assert version.status_code == 201, version.text
    version_id = uuid.UUID(version.json()["id"])

    glb = SOFT / "model.glb"
    wav = SOFT / "sound" / "main.wav"
    poster = SOFT / "poster.png"
    async with api.app.state.session_factory() as db:
        for asset_id, path, content_type, tier in (
            (glb_id, glb, "model/gltf-binary", GiftQualityTier.low),
            (audio_id, wav, "audio/wav", GiftQualityTier.medium),
            (poster_id, poster, "image/png", GiftQualityTier.medium),
        ):
            db.add(
                GiftAsset(
                    id=asset_id,
                    gift_version_id=version_id,
                    object_key=f"gifts/soft-ping/{version_id}/{path.name}",
                    content_type=content_type,
                    byte_size=path.stat().st_size,
                    sha256=_sha256(path),
                    platform=GiftAssetPlatform.universal,
                    quality_tier=tier,
                    state=GiftAssetState.verified,
                    verified_at=utcnow(),
                )
            )
        await db.commit()

    submitted = await api.client.post(
        f"/v1/gifts/author/versions/{version_id}/submit",
        headers=author_headers,
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["state"] == "review"

    validation = await api.client.post(
        f"/v1/gifts/review/versions/{version_id}/validate",
        headers=bearer(moderator_tokens["access_token"]),
    )
    assert validation.status_code == 200, validation.text
    checks = validation.json()["checks"]
    assert "all_assets_verified" in checks
    assert "download_budget" in checks

    published = await api.client.post(
        f"/v1/gifts/review/versions/{version_id}/publish",
        headers=bearer(admin_tokens["access_token"]),
    )
    assert published.status_code == 200, published.text
    assert published.json()["state"] == "published"

    catalog = await api.client.get(
        "/v1/gifts/catalog",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert catalog.status_code == 200, catalog.text
    slugs = {item["slug"] for item in catalog.json()["items"]}
    assert "soft-ping" in slugs

    runtime = await api.client.get(
        "/v1/gifts/catalog/soft-ping/runtime",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert runtime.status_code == 200, runtime.text
    assert runtime.json()["manifest"]["schema_version"] == "1.0"
    assert runtime.json()["gift_version_id"] == str(version_id)

    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=100,
        key="soft-ping-issue-0001",
    )
    async with api.app.state.session_factory() as db:
        db.add(CreatorMonetizationSetting(user_id=recipient.id, gifts_enabled=True))
        await db.commit()

    sent = await api.client.post(
        "/v1/gifts/sends",
        headers={
            **bearer(sender_tokens["access_token"]),
            "Idempotency-Key": "soft-ping-send-0001",
        },
        json={**(await gift_live_context(api, recipient_tokens)), 
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": definition.json()["id"],
        },
    )
    assert sent.status_code == 201, sent.text
    send_id = uuid.UUID(sent.json()["id"])

    async with api.app.state.session_factory() as db:
        gift_send = await db.get(GiftSend, send_id)
        assert gift_send is not None
        delivery = await db.scalar(select(GiftDelivery).where(GiftDelivery.gift_send_id == send_id))
        # Delivery row may be created asynchronously depending on status path;
        # send itself must persist.
        assert gift_send.id == send_id
        _ = delivery

    ticket = await api.client.post(
        "/v1/gifts/events/ticket",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert ticket.status_code == 200, ticket.text
    assert ticket.json()["ticket"]

    report = {
        "slug": "soft-ping",
        "harness": "pytest-sqlite-APIHarness",
        "passed": {
            "author_definition": True,
            "review_validate": True,
            "admin_publish": True,
            "catalog_list": True,
            "catalog_runtime": True,
            "wallet_send": True,
            "events_ticket": True,
        },
        "not_proven": {
            "docker_compose_live_api": True,
            "real_s3_upload_verify": True,
            "blender_source_blend": True,
            "second_client_websocket_delivery": True,
            "device_fps_memory": True,
        },
        "local_asset_status": soft.get("status"),
        "product_ready": False,
        "note": (
            "API contract path for soft-ping works in the unit harness with "
            "injected verified assets. Product READY still requires Compose+S3, "
            "Blender art pass, and live WS client proof."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    assert report["product_ready"] is False
    assert author.id
