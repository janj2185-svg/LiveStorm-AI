from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.gift_models import GiftDefinition, GiftLifecycle
from app.gift_seed import READY_STARTER_SLUGS, seed_ready_starter_gifts
from tests.conftest import APIHarness, bearer
from tests.test_wallet_gifts import create_member


@pytest.mark.asyncio
async def test_ready_starter_seed_catalog_runtime_and_idempotency(api: APIHarness) -> None:
    viewer, tokens = await create_member(
        api,
        email="ready-starter-viewer@sylora.dev",
        display_name="Ready Starter Viewer",
    )
    assert viewer.id

    async with api.app.state.session_factory() as db:
        first = await seed_ready_starter_gifts(db)
        second = await seed_ready_starter_gifts(db)

    assert first["ready_count"] == 10
    assert first["created_versions"] == 10
    assert second["ready_count"] == 10
    assert second["created_versions"] == 0
    assert second["already_published"] == 10
    assert {item["slug"] for item in first["gifts"]} == set(READY_STARTER_SLUGS)
    assert all("all_assets_verified" in item["checks"] for item in first["gifts"])

    catalog = await api.client.get("/v1/gifts/catalog", headers=bearer(tokens["access_token"]))
    assert catalog.status_code == 200, catalog.text
    seeded = [item for item in catalog.json()["items"] if item["slug"] in READY_STARTER_SLUGS]
    assert len(seeded) == 10
    assert all(item["state"] == "published" for item in seeded)
    assert all("flutter" in item["renderer_targets"] for item in seeded)
    assert all(len(item["asset_ids"]) >= 3 for item in seeded)

    runtime = await api.client.get(
        "/v1/gifts/catalog/lumen-seed/runtime",
        headers=bearer(tokens["access_token"]),
    )
    assert runtime.status_code == 200, runtime.text
    body = runtime.json()
    assert body["manifest"]["schema_version"] == "1.0"
    assert body["manifest"]["animation_tier"] == "starter"
    assert body["manifest"]["particle_hints"]["quality_note"].startswith(
        "procedural starter-pack art"
    )
    assert body["manifest"]["particle_hints"]["max_particles"] > 0
    assert body["manifest"]["fallbacks"]["low_end_asset_id"]
    assert len(body["assets"]) == 3
    assert {asset["quality_tier"] for asset in body["assets"]} == {"low", "medium"}

    async with api.app.state.session_factory() as db:
        published_count = await db.scalar(
            select(func.count())
            .select_from(GiftDefinition)
            .where(
                GiftDefinition.slug.in_(tuple(READY_STARTER_SLUGS)),
                GiftDefinition.state == GiftLifecycle.published,
            )
        )
        assert published_count == 10
        first_gift = await db.scalar(
            select(GiftDefinition).where(GiftDefinition.slug == READY_STARTER_SLUGS[0])
        )
        assert first_gift is not None
        assert isinstance(first_gift.id, uuid.UUID)
