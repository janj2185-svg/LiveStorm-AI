from __future__ import annotations

import asyncio
import uuid
from datetime import timedelta
from types import SimpleNamespace
from typing import Any

import pytest
from sqlalchemy import func, select

from app.errors import APIError
from app.gift_models import (
    CreatorMonetizationSetting,
    GiftAsset,
    GiftAssetPlatform,
    GiftAssetState,
    GiftCategory,
    GiftCombination,
    GiftDefinition,
    GiftDelivery,
    GiftEvent,
    GiftLifecycle,
    GiftQualityTier,
    GiftRefund,
    GiftSend,
    GiftSendStatus,
    GiftTier,
    GiftUserEligibility,
    GiftVersion,
    InventoryItem,
    UserGiftPreference,
)
from app.gift_schemas import RuntimeManifest
from app.ledger_models import (
    LedgerAccountType,
    LedgerEntry,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionType,
    PaymentOperation,
)
from app.ledger_schemas import LedgerPosting
from app.ledger_service import (
    account_balance,
    post_transaction,
    reverse_transaction,
    system_account,
    user_account,
)
from app.live_models import LiveSession, LiveSessionState
from app.models import Role, UserRole
from app.routers.gifts import websocket_ticket_user
from app.security import utcnow
from app.social_models import Block
from tests.conftest import APIHarness, bearer, login, register_and_verify


async def create_member(
    api: APIHarness,
    *,
    email: str,
    display_name: str,
    role: str | None = None,
) -> tuple[Any, dict[str, Any]]:
    await register_and_verify(api, email=email, display_name=display_name)
    user = await api.user(email)
    if role is not None:
        async with api.app.state.session_factory() as db:
            selected_role = await db.scalar(select(Role).where(Role.name == role))
            assert selected_role is not None
            db.add(UserRole(user_id=user.id, role_id=selected_role.id))
            await db.commit()
    return user, await login(api, email=email)


def manifest_payload(
    asset_id: uuid.UUID,
    *,
    combination_id: str | None = None,
    compatible_id: str | None = None,
    max_download_bytes: int = 10_000,
) -> dict[str, Any]:
    combinations: list[dict[str, Any]] = []
    if combination_id and compatible_id:
        combinations = [
            {
                "combination_id": combination_id,
                "compatible_combination_ids": [compatible_id],
                "window_seconds": 120,
            }
        ]
    return RuntimeManifest(
        schema_version="1.0",
        renderer_targets=["threejs", "flutter"],
        duration_ms=2_000,
        assets=[{"asset_id": asset_id, "role": "low_end_fallback"}],
        layers=[
            {
                "kind": "model",
                "name": "gift",
                "asset_id": asset_id,
                "transform": {
                    "position": {"x": 0, "y": 0, "z": 0},
                    "rotation_degrees": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                },
            }
        ],
        timelines=[],
        particle_systems=[],
        shaders=[],
        lighting=[],
        audio=[],
        interaction_hooks=[],
        combinations=combinations,
        procedural_parameters=[
            {
                "name": "seed",
                "source": "deterministic",
                "value_type": "seed",
            }
        ],
        effects=[],
        fallbacks={
            "low_end_asset_id": asset_id,
            "reduced_motion_asset_id": asset_id,
            "no_audio_asset_id": asset_id,
        },
        quality_budgets={
            "max_download_bytes": max_download_bytes,
            "max_duration_ms": 3_000,
            "max_particles": 0,
            "max_shader_instructions": 0,
            "max_audio_peak_dbfs": -1,
        },
    ).model_dump(mode="json")


async def create_gift(
    api: APIHarness,
    *,
    author_id: uuid.UUID,
    slug: str,
    price_minor: int = 300,
    share_bps: int = 7000,
    state: GiftLifecycle = GiftLifecycle.published,
    tier: GiftTier = GiftTier.epic,
    supply_cap: int | None = None,
    per_user_limit: int | None = None,
    minimum_level: int | None = None,
    available_from: Any | None = None,
    combination_id: str | None = None,
    compatible_id: str | None = None,
) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID]:
    category_id = uuid.uuid4()
    gift_id = uuid.uuid4()
    version_id = uuid.uuid4()
    asset_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        db.add(
            GiftCategory(
                id=category_id,
                slug=f"category-{slug}",
                name=f"Category {slug}",
                created_by_id=author_id,
            )
        )
        await db.flush()
        db.add(
            GiftDefinition(
                id=gift_id,
                author_user_id=author_id,
                category_id=category_id,
                slug=slug,
                name=f"Gift {slug}",
                description="A production test gift definition.",
                price_minor=price_minor,
                creator_revenue_share_bps=share_bps,
                tier=tier,
                state=state,
                available_from=available_from,
                supply_cap=supply_cap,
                per_user_limit=per_user_limit,
                minimum_level=minimum_level,
                search_tags=["test"],
                locale_metadata={"en": f"Gift {slug}"},
            )
        )
        await db.flush()
        db.add(
            GiftVersion(
                id=version_id,
                gift_definition_id=gift_id,
                version_number=1,
                state=state,
                runtime_manifest=manifest_payload(
                    asset_id,
                    combination_id=combination_id,
                    compatible_id=compatible_id,
                ),
                created_by_id=author_id,
                submitted_by_id=author_id,
                reviewed_by_id=author_id if state == GiftLifecycle.published else None,
                submitted_at=utcnow(),
                published_at=utcnow() if state == GiftLifecycle.published else None,
            )
        )
        await db.flush()
        db.add(
            GiftAsset(
                id=asset_id,
                gift_version_id=version_id,
                object_key=f"gifts/{gift_id}/versions/{version_id}/asset.glb",
                content_type="model/gltf-binary",
                byte_size=1000,
                sha256="a" * 64,
                platform=GiftAssetPlatform.universal,
                quality_tier=GiftQualityTier.low,
                state=GiftAssetState.verified,
                verified_at=utcnow(),
            )
        )
        await db.commit()
    return gift_id, version_id, asset_id


async def issue(
    api: APIHarness,
    *,
    admin_token: str,
    user_id: uuid.UUID,
    amount_minor: int,
    key: str,
) -> dict[str, Any]:
    response = await api.client.post(
        "/v1/admin/ledger/issuance",
        headers={**bearer(admin_token), "Idempotency-Key": key},
        json={
            "user_id": str(user_id),
            "amount_minor": amount_minor,
            "reason": "Automated financial behavior test",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.asyncio
async def test_ledger_balancing_insufficient_funds_immutability_and_reversal(
    api: APIHarness,
) -> None:
    member, _ = await create_member(api, email="ledger@example.com", display_name="Ledger")
    async with api.app.state.session_factory() as db:
        wallet = await user_account(db, member.id, LedgerAccountType.user_wallet)
        issuance = await system_account(db, "system:platform_issuance")
        with pytest.raises(APIError, match="unbalanced_ledger_transaction"):
            await post_transaction(
                db,
                transaction_type=LedgerTransactionType.issuance,
                actor_user_id=member.id,
                idempotency_scope="test-unbalanced",
                idempotency_key="unbalanced-0001",
                postings=[
                    LedgerPosting(
                        account_id=issuance.id,
                        side=LedgerSide.debit,
                        amount_minor=100,
                    ),
                    LedgerPosting(
                        account_id=wallet.id,
                        side=LedgerSide.credit,
                        amount_minor=99,
                    ),
                ],
            )
        with pytest.raises(APIError, match="insufficient_funds"):
            await post_transaction(
                db,
                transaction_type=LedgerTransactionType.gift_purchase,
                actor_user_id=member.id,
                idempotency_scope="test-spend",
                idempotency_key="insufficient-0001",
                postings=[
                    LedgerPosting(
                        account_id=wallet.id,
                        side=LedgerSide.debit,
                        amount_minor=1,
                    ),
                    LedgerPosting(
                        account_id=issuance.id,
                        side=LedgerSide.credit,
                        amount_minor=1,
                    ),
                ],
            )
        transaction, _ = await post_transaction(
            db,
            transaction_type=LedgerTransactionType.issuance,
            actor_user_id=member.id,
            idempotency_scope="test-issue",
            idempotency_key="balanced-0001",
            postings=[
                LedgerPosting(
                    account_id=issuance.id,
                    side=LedgerSide.debit,
                    amount_minor=250,
                ),
                LedgerPosting(
                    account_id=wallet.id,
                    side=LedgerSide.credit,
                    amount_minor=250,
                ),
            ],
        )
        transaction_id = transaction.id
        await db.commit()
        totals = (
            await db.execute(
                select(
                    func.sum(LedgerEntry.debit_minor),
                    func.sum(LedgerEntry.credit_minor),
                ).where(LedgerEntry.transaction_id == transaction.id)
            )
        ).one()
        assert totals == (250, 250)
        entry = await db.scalar(
            select(LedgerEntry).where(LedgerEntry.transaction_id == transaction.id)
        )
        assert entry is not None
        entry.credit_minor = 1 if entry.credit_minor else None
        with pytest.raises(ValueError, match="immutable"):
            await db.flush()
        await db.rollback()

    async with api.app.state.session_factory() as db:
        reversal, created = await reverse_transaction(
            db,
            transaction_id=transaction_id,
            actor_user_id=member.id,
            idempotency_key="reverse-0001",
            reason="Test reversal",
        )
        assert created is True
        await db.commit()
        same_reversal, created_again = await reverse_transaction(
            db,
            transaction_id=transaction_id,
            actor_user_id=member.id,
            idempotency_key="reverse-0001",
            reason="Test reversal",
        )
        assert created_again is False
        assert same_reversal.id == reversal.id
        wallet = await user_account(db, member.id, LedgerAccountType.user_wallet)
        assert await account_balance(db, wallet) == 0


@pytest.mark.asyncio
async def test_admin_issuance_wallet_history_and_idempotency(api: APIHarness) -> None:
    admin, admin_tokens = await create_member(
        api,
        email="ledger-admin@example.com",
        display_name="Admin",
        role="admin",
    )
    member, member_tokens = await create_member(
        api,
        email="wallet-member@example.com",
        display_name="Wallet",
    )
    first = await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=member.id,
        amount_minor=1_000,
        key="issuance-history-0001",
    )
    duplicate = await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=member.id,
        amount_minor=1_000,
        key="issuance-history-0001",
    )
    assert duplicate["id"] == first["id"]
    balance = await api.client.get(
        "/v1/wallet/balance", headers=bearer(member_tokens["access_token"])
    )
    assert balance.status_code == 200
    assert balance.json()["spendable_minor"] == 1_000
    history = await api.client.get(
        "/v1/wallet/transactions?limit=1",
        headers=bearer(member_tokens["access_token"]),
    )
    assert history.status_code == 200
    assert history.json()["items"][0]["metadata"]["reason"]
    assert "_request_hash" not in history.text
    assert admin.id != member.id


@pytest.mark.asyncio
async def test_unconfigured_payment_and_s3_fail_without_persisted_success(
    api: APIHarness,
) -> None:
    creator, tokens = await create_member(
        api,
        email="provider-boundary@example.com",
        display_name="Provider",
        role="creator",
    )
    topup = await api.client.post(
        "/v1/wallet/topups",
        headers={
            **bearer(tokens["access_token"]),
            "Idempotency-Key": "topup-unavailable-0001",
        },
        json={
            "amount_minor": 500,
            "settlement_currency": "USD",
            "return_url": "https://web.test.sylora.local/wallet",
        },
    )
    assert topup.status_code == 503
    assert topup.json()["code"] == "payment_provider_unavailable"
    webhook = await api.client.post(
        "/v1/payments/webhooks/unconfigured",
        headers={"X-Payment-Signature": "not-a-real-signature"},
        content=b"{}",
    )
    assert webhook.status_code == 503
    assert webhook.json()["code"] == "payment_provider_unavailable"
    async with api.app.state.session_factory() as db:
        earnings = await user_account(db, creator.id, LedgerAccountType.creator_earnings)
        issuance = await system_account(db, "system:platform_issuance")
        await post_transaction(
            db,
            transaction_type=LedgerTransactionType.issuance,
            actor_user_id=creator.id,
            idempotency_scope="test-creator-earnings",
            idempotency_key="creator-earnings-0001",
            postings=[
                LedgerPosting(
                    account_id=issuance.id,
                    side=LedgerSide.debit,
                    amount_minor=200,
                ),
                LedgerPosting(
                    account_id=earnings.id,
                    side=LedgerSide.credit,
                    amount_minor=200,
                ),
            ],
        )
        await db.commit()
    payout = await api.client.post(
        "/v1/wallet/payouts",
        headers={
            **bearer(tokens["access_token"]),
            "Idempotency-Key": "payout-unavailable-0001",
        },
        json={
            "amount_minor": 100,
            "settlement_currency": "USD",
            "destination_reference": "configured-provider-destination",
        },
    )
    assert payout.status_code == 503
    assert payout.json()["code"] == "payment_provider_unavailable"

    asset_id = uuid.uuid4()
    gift_id, version_id, _ = await create_gift(
        api,
        author_id=creator.id,
        slug="storage-boundary",
        state=GiftLifecycle.draft,
    )
    assert gift_id
    upload = await api.client.post(
        f"/v1/gifts/author/versions/{version_id}/assets/upload",
        headers=bearer(tokens["access_token"]),
        json={
            "content_type": "model/gltf-binary",
            "byte_size": 1000,
            "sha256": "b" * 64,
            "platform": "universal",
            "quality_tier": "low",
            "filename_extension": "glb",
        },
    )
    assert upload.status_code == 503
    assert upload.json()["code"] == "object_storage_unavailable"
    async with api.app.state.session_factory() as db:
        assert await db.scalar(select(func.count()).select_from(PaymentOperation)) == 0
        pending = await db.scalar(
            select(func.count())
            .select_from(GiftAsset)
            .where(GiftAsset.gift_version_id == version_id, GiftAsset.id != asset_id)
        )
        assert pending == 1  # Only the verified test fixture asset exists.


@pytest.mark.asyncio
async def test_author_review_publish_separation_budgets_and_immutability(
    api: APIHarness,
) -> None:
    author, author_tokens = await create_member(
        api,
        email="gift-author@example.com",
        display_name="Author",
        role="creator",
    )
    _, moderator_tokens = await create_member(
        api,
        email="gift-reviewer@example.com",
        display_name="Reviewer",
        role="moderator",
    )
    publisher, admin_tokens = await create_member(
        api,
        email="gift-publisher@example.com",
        display_name="Publisher",
        role="admin",
    )
    category = await api.client.post(
        "/v1/gifts/author/categories",
        headers=bearer(author_tokens["access_token"]),
        json={
            "slug": "celebrations",
            "name": "Celebrations",
            "description": "Reviewed celebration gifts",
        },
    )
    assert category.status_code == 201, category.text
    definition = await api.client.post(
        "/v1/gifts/author/definitions",
        headers=bearer(author_tokens["access_token"]),
        json={
            "category_id": category.json()["id"],
            "slug": "reviewed-gift",
            "name": "Reviewed Gift",
            "description": "Strictly validated runtime gift.",
            "price_minor": 400,
            "creator_revenue_share_bps": 7500,
            "tier": "legendary",
        },
    )
    assert definition.status_code == 201, definition.text
    asset_id = uuid.uuid4()
    version = await api.client.post(
        f"/v1/gifts/author/definitions/{definition.json()['id']}/versions",
        headers=bearer(author_tokens["access_token"]),
        json={"manifest": manifest_payload(asset_id)},
    )
    assert version.status_code == 201, version.text
    version_id = uuid.UUID(version.json()["id"])
    async with api.app.state.session_factory() as db:
        db.add(
            GiftAsset(
                id=asset_id,
                gift_version_id=version_id,
                object_key=f"gifts/review/{version_id}/fallback.glb",
                content_type="model/gltf-binary",
                byte_size=1000,
                sha256="c" * 64,
                platform=GiftAssetPlatform.universal,
                quality_tier=GiftQualityTier.low,
                state=GiftAssetState.verified,
                verified_at=utcnow(),
            )
        )
        await db.commit()
    submitted = await api.client.post(
        f"/v1/gifts/author/versions/{version_id}/submit",
        headers=bearer(author_tokens["access_token"]),
    )
    assert submitted.status_code == 200
    validation = await api.client.post(
        f"/v1/gifts/review/versions/{version_id}/validate",
        headers=bearer(moderator_tokens["access_token"]),
    )
    assert validation.status_code == 200, validation.text
    assert "audio_loudness_budget" in validation.json()["checks"]
    moderator_publish = await api.client.post(
        f"/v1/gifts/review/versions/{version_id}/publish",
        headers=bearer(moderator_tokens["access_token"]),
    )
    assert moderator_publish.status_code == 403
    published = await api.client.post(
        f"/v1/gifts/review/versions/{version_id}/publish",
        headers=bearer(admin_tokens["access_token"]),
    )
    assert published.status_code == 200, published.text
    assert published.json()["state"] == "published"
    async with api.app.state.session_factory() as db:
        persisted = await db.get(GiftVersion, version_id)
        assert persisted is not None
        persisted.runtime_manifest = {**persisted.runtime_manifest, "duration_ms": 1_000}
        with pytest.raises(ValueError, match="immutable"):
            await db.flush()
        await db.rollback()

    bad_version_id = uuid.uuid4()
    bad_asset_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        db.add(
            GiftVersion(
                id=bad_version_id,
                gift_definition_id=uuid.UUID(definition.json()["id"]),
                version_number=2,
                state=GiftLifecycle.review,
                runtime_manifest=manifest_payload(
                    bad_asset_id,
                    max_download_bytes=500,
                ),
                created_by_id=author.id,
                submitted_by_id=author.id,
                submitted_at=utcnow(),
            )
        )
        await db.flush()
        db.add(
            GiftAsset(
                id=bad_asset_id,
                gift_version_id=bad_version_id,
                object_key=f"gifts/review/{bad_version_id}/oversized.glb",
                content_type="model/gltf-binary",
                byte_size=1000,
                sha256="d" * 64,
                platform=GiftAssetPlatform.universal,
                quality_tier=GiftQualityTier.low,
                state=GiftAssetState.verified,
                verified_at=utcnow(),
            )
        )
        await db.commit()
    over_budget = await api.client.post(
        f"/v1/gifts/review/versions/{bad_version_id}/validate",
        headers=bearer(moderator_tokens["access_token"]),
    )
    assert over_budget.status_code == 422
    assert over_budget.json()["code"] == "gift_quality_budget_exceeded"

    ultra_id, ultra_version_id, _ = await create_gift(
        api,
        author_id=publisher.id,
        slug="self-reviewed-ultra",
        state=GiftLifecycle.review,
        tier=GiftTier.ultra_premium,
    )
    assert ultra_id
    own_ultra_publish = await api.client.post(
        f"/v1/gifts/review/versions/{ultra_version_id}/publish",
        headers=bearer(admin_tokens["access_token"]),
    )
    assert own_ultra_publish.status_code == 403
    assert own_ultra_publish.json()["code"] == "ultra_premium_separation_required"


@pytest.mark.asyncio
async def test_catalog_availability_and_eligibility(api: APIHarness) -> None:
    author, _ = await create_member(
        api, email="catalog-author@example.com", display_name="Catalog Author"
    )
    viewer, viewer_tokens = await create_member(
        api, email="catalog-viewer@example.com", display_name="Catalog Viewer"
    )
    visible_id, _, _ = await create_gift(api, author_id=author.id, slug="visible-gift")
    await create_gift(
        api,
        author_id=author.id,
        slug="future-gift",
        available_from=utcnow() + timedelta(days=1),
    )
    level_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="level-gift",
        minimum_level=10,
    )
    catalog = await api.client.get(
        "/v1/gifts/catalog", headers=bearer(viewer_tokens["access_token"])
    )
    assert catalog.status_code == 200
    ids = {item["id"] for item in catalog.json()["items"]}
    assert str(visible_id) in ids
    assert str(level_id) not in ids
    assert all(item["slug"] != "future-gift" for item in catalog.json()["items"])
    async with api.app.state.session_factory() as db:
        db.add(GiftUserEligibility(user_id=viewer.id, level=10))
        await db.commit()
    eligible_catalog = await api.client.get(
        "/v1/gifts/catalog", headers=bearer(viewer_tokens["access_token"])
    )
    assert str(level_id) in {item["id"] for item in eligible_catalog.json()["items"]}


@pytest.mark.asyncio
async def test_atomic_purchase_send_split_idempotency_and_event_replay(
    api: APIHarness,
) -> None:
    _, admin_tokens = await create_member(
        api,
        email="commerce-admin@example.com",
        display_name="Commerce Admin",
        role="admin",
    )
    author, _ = await create_member(
        api, email="commerce-author@example.com", display_name="Commerce Author"
    )
    sender, sender_tokens = await create_member(
        api, email="commerce-sender@example.com", display_name="Sender"
    )
    recipient, _ = await create_member(
        api,
        email="commerce-recipient@example.com",
        display_name="Recipient",
    )
    gift_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="commerce-gift",
        price_minor=300,
        share_bps=7000,
    )
    async with api.app.state.session_factory() as db:
        db.add(
            CreatorMonetizationSetting(
                user_id=recipient.id,
                gifts_enabled=True,
            )
        )
        await db.commit()
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=1_000,
        key="commerce-issuance-0001",
    )
    purchase_headers = {
        **bearer(sender_tokens["access_token"]),
        "Idempotency-Key": "purchase-commerce-0001",
    }
    purchase = await api.client.post(
        "/v1/gifts/purchases",
        headers=purchase_headers,
        json={"gift_definition_id": str(gift_id), "quantity": 1},
    )
    assert purchase.status_code == 201, purchase.text
    duplicate_purchase = await api.client.post(
        "/v1/gifts/purchases",
        headers=purchase_headers,
        json={"gift_definition_id": str(gift_id), "quantity": 1},
    )
    assert duplicate_purchase.json()["id"] == purchase.json()["id"]
    send_headers = {
        **bearer(sender_tokens["access_token"]),
        "Idempotency-Key": "send-commerce-0001",
    }
    sent = await api.client.post(
        "/v1/gifts/sends",
        headers=send_headers,
        json={
            "recipient_user_id": str(recipient.id),
            "inventory_item_id": purchase.json()["id"],
            "message": "Congratulations!",
        },
    )
    assert sent.status_code == 201, sent.text
    assert sent.json()["status"] == "delivered"
    duplicate_send = await api.client.post(
        "/v1/gifts/sends",
        headers=send_headers,
        json={
            "recipient_user_id": str(recipient.id),
            "inventory_item_id": purchase.json()["id"],
            "message": "Congratulations!",
        },
    )
    assert duplicate_send.json()["id"] == sent.json()["id"]
    async with api.app.state.session_factory() as db:
        wallet = await user_account(db, sender.id, LedgerAccountType.user_wallet)
        liability = await system_account(db, "system:gift_liability")
        earnings = await user_account(db, recipient.id, LedgerAccountType.creator_earnings)
        revenue = await system_account(db, "system:platform_revenue")
        assert await account_balance(db, wallet) == 700
        assert await account_balance(db, liability) == 0
        assert await account_balance(db, earnings) == 210
        assert await account_balance(db, revenue) == 90
        item = await db.get(InventoryItem, uuid.UUID(purchase.json()["id"]))
        assert item is not None and item.quantity == 0
    events = await api.client.get(
        "/v1/gifts/events?limit=1",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert events.status_code == 200
    assert events.json()["items"][0]["event"] == "gift_delivered"
    sent_history = await api.client.get(
        "/v1/gifts/history/sent?limit=1",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert sent_history.json()["items"][0]["id"] == sent.json()["id"]


@pytest.mark.asyncio
async def test_concurrent_idempotent_purchase_and_supply_cap(
    api: APIHarness,
) -> None:
    _, admin_tokens = await create_member(
        api,
        email="concurrency-admin@example.com",
        display_name="Concurrency Admin",
        role="admin",
    )
    author, _ = await create_member(
        api,
        email="concurrency-author@example.com",
        display_name="Concurrency Author",
    )
    buyer, buyer_tokens = await create_member(
        api,
        email="concurrency-buyer@example.com",
        display_name="Concurrency Buyer",
    )
    gift_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="single-supply-gift",
        price_minor=100,
        supply_cap=1,
    )
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=buyer.id,
        amount_minor=500,
        key="concurrency-issuance-0001",
    )

    async def buy() -> Any:
        return await api.client.post(
            "/v1/gifts/purchases",
            headers={
                **bearer(buyer_tokens["access_token"]),
                "Idempotency-Key": "concurrent-purchase-0001",
            },
            json={"gift_definition_id": str(gift_id), "quantity": 1},
        )

    first, second = await asyncio.gather(buy(), buy())
    assert first.status_code == second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    exhausted = await api.client.post(
        "/v1/gifts/purchases",
        headers={
            **bearer(buyer_tokens["access_token"]),
            "Idempotency-Key": "concurrent-purchase-0002",
        },
        json={"gift_definition_id": str(gift_id), "quantity": 1},
    )
    assert exhausted.status_code == 404
    assert exhausted.json()["code"] == "gift_not_available"
    async with api.app.state.session_factory() as db:
        gift = await db.get(GiftDefinition, gift_id)
        assert gift is not None and gift.sold_count == 1
        assert (
            await db.scalar(
                select(func.count())
                .select_from(InventoryItem)
                .where(
                    InventoryItem.owner_user_id == buyer.id,
                    InventoryItem.gift_definition_id == gift_id,
                )
            )
            == 1
        )
        wallet = await user_account(db, buyer.id, LedgerAccountType.user_wallet)
        assert await account_balance(db, wallet) == 400


@pytest.mark.asyncio
async def test_authoring_bootstrap_lists_and_requires_manifest_before_review(
    api: APIHarness,
) -> None:
    author, tokens = await create_member(
        api,
        email="bootstrap-author@sylora.dev",
        display_name="Bootstrap Author",
        role="creator",
    )
    headers = bearer(tokens["access_token"])
    category = await api.client.post(
        "/v1/gifts/author/categories",
        headers=headers,
        json={"slug": "bootstrap", "name": "Bootstrap"},
    )
    definition = await api.client.post(
        "/v1/gifts/author/definitions",
        headers=headers,
        json={
            "category_id": category.json()["id"],
            "slug": "asset-first-gift",
            "name": "Asset First Gift",
            "description": "A draft whose assets are uploaded before its strict manifest.",
            "price_minor": 100,
            "creator_revenue_share_bps": 7000,
            "tier": "simple",
        },
    )
    version = await api.client.post(
        f"/v1/gifts/author/definitions/{definition.json()['id']}/versions",
        headers=headers,
        json={},
    )
    assert version.status_code == 201, version.text
    assert version.json()["runtime_manifest"] == {}

    listed_definitions = await api.client.get(
        "/v1/gifts/author/definitions",
        headers=headers,
    )
    assert [item["id"] for item in listed_definitions.json()] == [definition.json()["id"]]
    listed_versions = await api.client.get(
        f"/v1/gifts/author/definitions/{definition.json()['id']}/versions",
        headers=headers,
    )
    assert listed_versions.json()[0]["id"] == version.json()["id"]
    assert (
        await api.client.get(
            f"/v1/gifts/author/versions/{version.json()['id']}/assets",
            headers=headers,
        )
    ).json() == []

    submit = await api.client.post(
        f"/v1/gifts/author/versions/{version.json()['id']}/submit",
        headers=headers,
    )
    assert submit.status_code == 422
    assert submit.json()["code"] == "invalid_runtime_manifest"
    assert author.id


@pytest.mark.asyncio
async def test_catalog_runtime_contract_and_one_time_browser_socket_ticket(
    api: APIHarness,
) -> None:
    author, _ = await create_member(
        api,
        email="runtime-author@sylora.dev",
        display_name="Runtime Author",
    )
    viewer, tokens = await create_member(
        api,
        email="runtime-viewer@sylora.dev",
        display_name="Runtime Viewer",
    )
    gift_id, version_id, asset_id = await create_gift(
        api,
        author_id=author.id,
        slug="runtime-contract",
    )
    headers = bearer(tokens["access_token"])
    runtime = await api.client.get(
        "/v1/gifts/catalog/runtime-contract/runtime",
        headers=headers,
    )
    assert runtime.status_code == 200, runtime.text
    assert runtime.json()["gift_definition_id"] == str(gift_id)
    assert runtime.json()["gift_version_id"] == str(version_id)
    assert runtime.json()["manifest"]["schema_version"] == "1.0"
    assert runtime.json()["assets"][0]["id"] == str(asset_id)

    issued = await api.client.post("/v1/gifts/events/ticket", headers=headers)
    assert issued.status_code == 200, issued.text
    ticket = issued.json()["ticket"]
    websocket = SimpleNamespace(app=api.app)
    consumed_user = await websocket_ticket_user(websocket, ticket)  # type: ignore[arg-type]
    assert consumed_user == viewer.id
    with pytest.raises(APIError, match="invalid_realtime_ticket"):
        await websocket_ticket_user(websocket, ticket)  # type: ignore[arg-type]


@pytest.mark.asyncio
async def test_send_policy_daily_limit_inventory_expiry_and_creator_setting(
    api: APIHarness,
) -> None:
    _, admin_tokens = await create_member(
        api,
        email="policy-admin@example.com",
        display_name="Policy Admin",
        role="admin",
    )
    author, _ = await create_member(
        api, email="policy-author@example.com", display_name="Policy Author"
    )
    sender, sender_tokens = await create_member(
        api, email="policy-sender@example.com", display_name="Policy Sender"
    )
    recipient, _ = await create_member(
        api, email="policy-recipient@example.com", display_name="Policy Recipient"
    )
    gift_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="policy-gift",
        price_minor=300,
        per_user_limit=1,
    )
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=1_000,
        key="policy-issuance-0001",
    )
    base = bearer(sender_tokens["access_token"])
    self_send = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-self-0001"},
        json={
            "recipient_user_id": str(sender.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert self_send.status_code == 422
    assert self_send.json()["code"] == "self_gift_forbidden"
    disabled = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-disabled-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert disabled.status_code == 403
    assert disabled.json()["code"] == "creator_monetization_disabled"
    async with api.app.state.session_factory() as db:
        db.add(
            CreatorMonetizationSetting(
                user_id=recipient.id,
                gifts_enabled=True,
            )
        )
        db.add(
            UserGiftPreference(
                user_id=sender.id,
                daily_spending_limit_minor=100,
            )
        )
        db.add(
            UserGiftPreference(
                user_id=recipient.id,
                accepts_gifts=False,
            )
        )
        await db.commit()
    recipient_disabled = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-preference-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert recipient_disabled.status_code == 403
    assert recipient_disabled.json()["code"] == "recipient_gifts_disabled"
    async with api.app.state.session_factory() as db:
        recipient_preference = await db.get(UserGiftPreference, recipient.id)
        assert recipient_preference is not None
        recipient_preference.accepts_gifts = True
        recipient_preference.friends_only = True
        await db.commit()
    private = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-private-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert private.status_code == 403
    assert private.json()["code"] == "recipient_gifts_friends_only"
    async with api.app.state.session_factory() as db:
        recipient_preference = await db.get(UserGiftPreference, recipient.id)
        assert recipient_preference is not None
        recipient_preference.friends_only = False
        await db.commit()
    limited = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-limit-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert limited.status_code == 409
    assert limited.json()["code"] == "daily_spending_limit_exceeded"
    async with api.app.state.session_factory() as db:
        preference = await db.get(UserGiftPreference, sender.id)
        assert preference is not None
        preference.daily_spending_limit_minor = 1_000
        db.add(Block(blocker_id=recipient.id, blocked_id=sender.id))
        await db.commit()
    blocked = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-block-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert blocked.status_code == 404
    async with api.app.state.session_factory() as db:
        block = await db.get(
            Block,
            {"blocker_id": recipient.id, "blocked_id": sender.id},
        )
        assert block is not None
        await db.delete(block)
        await db.commit()
    purchase = await api.client.post(
        "/v1/gifts/purchases",
        headers={**base, "Idempotency-Key": "policy-purchase-0001"},
        json={"gift_definition_id": str(gift_id), "quantity": 1},
    )
    assert purchase.status_code == 201
    async with api.app.state.session_factory() as db:
        item = await db.get(InventoryItem, uuid.UUID(purchase.json()["id"]))
        assert item is not None
        item.expires_at = utcnow() - timedelta(seconds=1)
        await db.commit()
    expired = await api.client.post(
        "/v1/gifts/sends",
        headers={**base, "Idempotency-Key": "policy-expired-0001"},
        json={
            "recipient_user_id": str(recipient.id),
            "inventory_item_id": purchase.json()["id"],
        },
    )
    assert expired.status_code == 409
    assert expired.json()["code"] == "inventory_item_expired"
    over_limit = await api.client.post(
        "/v1/gifts/purchases",
        headers={**base, "Idempotency-Key": "policy-purchase-0002"},
        json={"gift_definition_id": str(gift_id), "quantity": 1},
    )
    assert over_limit.status_code == 409
    assert over_limit.json()["code"] == "gift_user_limit_exceeded"


@pytest.mark.asyncio
async def test_retry_does_not_recharge_refund_is_single_and_records_shortfall(
    api: APIHarness,
) -> None:
    admin, admin_tokens = await create_member(
        api,
        email="refund-admin@example.com",
        display_name="Refund Admin",
        role="admin",
    )
    author, _ = await create_member(
        api, email="refund-author@example.com", display_name="Refund Author"
    )
    sender, sender_tokens = await create_member(
        api, email="refund-sender@example.com", display_name="Refund Sender"
    )
    recipient, _ = await create_member(
        api, email="refund-recipient@example.com", display_name="Refund Recipient"
    )
    gift_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="refund-gift",
        price_minor=300,
        share_bps=7000,
    )
    async with api.app.state.session_factory() as db:
        db.add(
            CreatorMonetizationSetting(
                user_id=recipient.id,
                gifts_enabled=True,
            )
        )
        await db.commit()
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=1_000,
        key="refund-issuance-0001",
    )
    sent = await api.client.post(
        "/v1/gifts/sends",
        headers={
            **bearer(sender_tokens["access_token"]),
            "Idempotency-Key": "refund-send-0001",
        },
        json={
            "recipient_user_id": str(recipient.id),
            "gift_definition_id": str(gift_id),
        },
    )
    assert sent.status_code == 201
    send_id = uuid.UUID(sent.json()["id"])
    async with api.app.state.session_factory() as db:
        transaction_count = await db.scalar(select(func.count()).select_from(LedgerTransaction))
        send = await db.get(GiftSend, send_id)
        assert send is not None
        send.status = GiftSendStatus.failed
        send.failed_at = utcnow()
        send.delivered_at = None
        delivery = await db.scalar(select(GiftDelivery).where(GiftDelivery.gift_send_id == send_id))
        assert delivery is not None
        delivery.status = "failed"
        await db.commit()
    retried = await api.client.post(
        f"/v1/gifts/sends/{send_id}/retry",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert retried.status_code == 200
    assert retried.json()["status"] == "delivered"
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(select(func.count()).select_from(LedgerTransaction))
            == transaction_count
        )
        earnings = await user_account(db, recipient.id, LedgerAccountType.creator_earnings)
        revenue = await system_account(db, "system:platform_revenue")
        creator_balance = await account_balance(db, earnings)
        await post_transaction(
            db,
            transaction_type=LedgerTransactionType.gift_send,
            actor_user_id=recipient.id,
            idempotency_scope="test-earnings-spend",
            idempotency_key="earnings-spend-0001",
            postings=[
                LedgerPosting(
                    account_id=earnings.id,
                    side=LedgerSide.debit,
                    amount_minor=creator_balance,
                ),
                LedgerPosting(
                    account_id=revenue.id,
                    side=LedgerSide.credit,
                    amount_minor=creator_balance,
                ),
            ],
        )
        await db.commit()
    refund_headers = {
        **bearer(admin_tokens["access_token"]),
        "Idempotency-Key": "refund-admin-0001",
    }
    refunded = await api.client.post(
        f"/v1/admin/gifts/sends/{send_id}/refund",
        headers=refund_headers,
        json={"reason": "Verified customer support refund"},
    )
    assert refunded.status_code == 200, refunded.text
    duplicate = await api.client.post(
        f"/v1/admin/gifts/sends/{send_id}/refund",
        headers=refund_headers,
        json={"reason": "Verified customer support refund"},
    )
    assert duplicate.status_code == 200
    assert duplicate.json()["refund_id"] == refunded.json()["refund_id"]
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(GiftRefund)
                .where(GiftRefund.gift_send_id == send_id)
            )
            == 1
        )
        wallet = await user_account(db, sender.id, LedgerAccountType.user_wallet)
        debt = await system_account(db, "system:refund_liability")
        assert await account_balance(db, wallet) == 1_000
        assert await account_balance(db, debt) == -210
        assert admin.id != sender.id


@pytest.mark.asyncio
async def test_same_gift_combo_increment_and_rankings(api: APIHarness) -> None:
    _, admin_tokens = await create_member(
        api,
        email="combo-admin@example.com",
        display_name="Combo Admin",
        role="admin",
    )
    author, _ = await create_member(
        api, email="combo-author@example.com", display_name="Combo Author"
    )
    sender, sender_tokens = await create_member(
        api, email="combo-sender@example.com", display_name="Combo Sender"
    )
    recipient, recipient_tokens = await create_member(
        api, email="combo-recipient@example.com", display_name="Combo Recipient"
    )
    gift_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="same-gift-combo",
        price_minor=100,
    )
    live_session_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        db.add(CreatorMonetizationSetting(user_id=recipient.id, gifts_enabled=True))
        db.add(
            LiveSession(
                id=live_session_id,
                owner_user_id=recipient.id,
                title="Gift rankings live",
                language="en",
                state=LiveSessionState.live,
                ingest_path=f"combo-test/{live_session_id}",
                ingest_key_hash="e" * 64,
                ingest_provisioned=True,
                started_at=utcnow(),
            )
        )
        await db.commit()
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=500,
        key="combo-issuance-0001",
    )

    for index in range(2):
        response = await api.client.post(
            "/v1/gifts/sends",
            headers={
                **bearer(sender_tokens["access_token"]),
                "Idempotency-Key": f"same-gift-combo-{index}",
            },
            json={
                "recipient_user_id": str(recipient.id),
                "gift_definition_id": str(gift_id),
            },
        )
        assert response.status_code == 201, response.text
        assert response.json()["status"] == "delivered"

    events = await api.client.get(
        "/v1/gifts/events?limit=10",
        headers=bearer(recipient_tokens["access_token"]),
    )
    assert events.status_code == 200
    combo_payloads = [
        item["payload"]
        for item in events.json()["items"]
        if item["event"] == "gift_received" and item["payload"].get("combo_count") == 2
    ]
    assert combo_payloads
    assert combo_payloads[0]["combo_active"] is True
    assert combo_payloads[0]["combo_multiplier"] == 2
    assert str(live_session_id) in combo_payloads[0]["live_session_ids"]

    global_rankings = await api.client.get(
        "/v1/gifts/rankings?scope=global_daily&limit=5",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert global_rankings.status_code == 200, global_rankings.text
    assert global_rankings.json()["items"][0]["sender_user_id"] == str(sender.id)
    assert global_rankings.json()["items"][0]["gift_count"] == 2
    assert global_rankings.json()["items"][0]["total_spent_minor"] == 200

    live_rankings = await api.client.get(
        "/v1/gifts/rankings",
        params={"scope": "live_session", "id": str(live_session_id), "limit": 5},
        headers=bearer(recipient_tokens["access_token"]),
    )
    assert live_rankings.status_code == 200, live_rankings.text
    assert live_rankings.json()["live_session_id"] == str(live_session_id)
    assert live_rankings.json()["items"][0]["sender_user_id"] == str(sender.id)
    assert live_rankings.json()["items"][0]["gift_count"] == 2

    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(GiftCombination)
                .where(GiftCombination.combination_key == f"same_gift:{gift_id}")
            )
            == 1
        )


@pytest.mark.asyncio
async def test_recommendation_explanation_history_cursor_and_combination_event(
    api: APIHarness,
) -> None:
    _, admin_tokens = await create_member(
        api,
        email="event-admin@example.com",
        display_name="Event Admin",
        role="admin",
    )
    author, _ = await create_member(
        api, email="event-author@example.com", display_name="Event Author"
    )
    sender, sender_tokens = await create_member(
        api, email="event-sender@example.com", display_name="Event Sender"
    )
    recipient, recipient_tokens = await create_member(
        api, email="event-recipient@example.com", display_name="Event Recipient"
    )
    first_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="combination-first",
        price_minor=100,
        combination_id="spark",
        compatible_id="wave",
    )
    second_id, _, _ = await create_gift(
        api,
        author_id=author.id,
        slug="combination-second",
        price_minor=100,
        combination_id="wave",
        compatible_id="spark",
    )
    async with api.app.state.session_factory() as db:
        db.add(
            CreatorMonetizationSetting(
                user_id=recipient.id,
                gifts_enabled=True,
            )
        )
        await db.commit()
    await issue(
        api,
        admin_token=admin_tokens["access_token"],
        user_id=sender.id,
        amount_minor=500,
        key="event-issuance-0001",
    )
    for index, gift_id in enumerate((first_id, second_id), start=1):
        response = await api.client.post(
            "/v1/gifts/sends",
            headers={
                **bearer(sender_tokens["access_token"]),
                "Idempotency-Key": f"combination-send-{index:04d}",
            },
            json={
                "recipient_user_id": str(recipient.id),
                "gift_definition_id": str(gift_id),
            },
        )
        assert response.status_code == 201, response.text
    history = await api.client.get(
        "/v1/gifts/history/sent?limit=1",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert history.status_code == 200
    assert history.json()["next_cursor"] is not None
    second_page = await api.client.get(
        "/v1/gifts/history/sent",
        params={"limit": 1, "cursor": history.json()["next_cursor"]},
        headers=bearer(sender_tokens["access_token"]),
    )
    assert second_page.status_code == 200
    assert second_page.json()["items"][0]["id"] != history.json()["items"][0]["id"]
    recommendation = await api.client.get(
        "/v1/gifts/recommendations",
        headers=bearer(sender_tokens["access_token"]),
    )
    assert recommendation.status_code == 200
    assert recommendation.json()["method"] == "heuristic"
    assert "purchase(s)" in recommendation.json()["items"][0]["explanation"]
    events = await api.client.get(
        "/v1/gifts/events?limit=1",
        headers=bearer(recipient_tokens["access_token"]),
    )
    assert events.status_code == 200
    assert events.json()["next_cursor"] is not None
    replay_page = await api.client.get(
        "/v1/gifts/events",
        params={"limit": 10, "cursor": events.json()["next_cursor"]},
        headers=bearer(recipient_tokens["access_token"]),
    )
    replayed = [*events.json()["items"], *replay_page.json()["items"]]
    assert any(item["event"] == "gift_combination" for item in replayed)
    assert all("binary" not in str(item["payload"]).lower() for item in replayed)
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(GiftEvent)
                .where(
                    GiftEvent.user_id == recipient.id,
                    GiftEvent.event_type == "gift_combination",
                )
            )
            == 1
        )
