from __future__ import annotations

import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy import func, select

from app.ledger_models import (
    LedgerAccountType,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionType,
)
from app.ledger_schemas import LedgerPosting
from app.ledger_service import account_balance, post_transaction, system_account, user_account
from app.models import Role, SecurityAuditEvent, UserRole
from app.platform_models import (
    AssetState,
    Cart,
    Certificate,
    ContentItem,
    ContentProcessingJob,
    Course,
    CourseState,
    CourseVersion,
    Enrollment,
    LessonProgress,
    Order,
    OrderLine,
    ProductAsset,
    ProductEntitlement,
    ProductVersion,
    ServiceBookingRequest,
    SettlementMethod,
)
from app.platform_service import publish_scheduled_content
from app.security import utcnow
from tests.conftest import APIHarness, bearer, login, register_and_verify


async def member(
    api: APIHarness,
    email: str,
    display_name: str,
    role: str | None = None,
) -> tuple[Any, dict[str, str]]:
    await register_and_verify(api, email=email, display_name=display_name)
    user = await api.user(email)
    if role is not None:
        async with api.app.state.session_factory() as db:
            selected = await db.scalar(select(Role).where(Role.name == role))
            assert selected is not None
            db.add(UserRole(user_id=user.id, role_id=selected.id))
            await db.commit()
    tokens = await login(api, email=email)
    return user, bearer(tokens["access_token"])


async def fund_wallet(api: APIHarness, user_id: uuid.UUID, amount: int) -> None:
    async with api.app.state.session_factory() as db:
        issuance = await system_account(db, "system:platform_issuance")
        wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
        await post_transaction(
            db,
            transaction_type=LedgerTransactionType.issuance,
            actor_user_id=user_id,
            idempotency_scope="platform-feature-test-funding",
            idempotency_key=f"fund-{user_id}-{amount}",
            postings=[
                LedgerPosting(account_id=issuance.id, side=LedgerSide.debit, amount_minor=amount),
                LedgerPosting(account_id=wallet.id, side=LedgerSide.credit, amount_minor=amount),
            ],
            metadata={"test_record": True},
        )
        await db.commit()


async def activate_creator(
    api: APIHarness, headers: dict[str, str], slug: str, *, subscriptions: bool = True
) -> None:
    created = await api.client.post(
        "/v1/creator/account",
        headers=headers,
        json={
            "public_slug": slug,
            "channel_name": f"{slug} channel",
            "description": "Creator channel description.",
            "category": "education",
        },
    )
    assert created.status_code == 201, created.text
    activated = await api.client.patch(
        "/v1/creator/account",
        headers=headers,
        json={
            "status": "active",
            "subscriptions_enabled": subscriptions,
            "content_monetization_enabled": True,
            "marketplace_enabled": True,
        },
    )
    assert activated.status_code == 200, activated.text


async def test_creator_content_subscription_ledger_and_entitlement(api: APIHarness) -> None:
    creator, creator_headers = await member(
        api, "creator-platform@example.com", "Creator", "creator"
    )
    buyer, buyer_headers = await member(api, "subscriber@example.com", "Subscriber")
    await activate_creator(api, creator_headers, "creator-platform")
    await fund_wallet(api, buyer.id, 2_000)

    tier_response = await api.client.post(
        "/v1/creator/subscription-tiers",
        headers=creator_headers,
        json={
            "name": "Studio",
            "description": "Subscriber-only studio access.",
            "price_minor": 1_000,
            "duration_days": 30,
            "benefits": ["Paid posts"],
        },
    )
    assert tier_response.status_code == 201, tier_response.text
    tier_id = tier_response.json()["id"]
    content = await api.client.post(
        "/v1/content",
        headers=creator_headers,
        json={
            "kind": "post",
            "visibility": "tier",
            "required_tier_id": tier_id,
            "title": "Subscriber post",
            "body": "Actual subscriber content.",
        },
    )
    assert content.status_code == 201, content.text
    content_id = content.json()["id"]
    published = await api.client.post(f"/v1/content/{content_id}/publish", headers=creator_headers)
    assert published.status_code == 200, published.text

    denied = await api.client.get(f"/v1/content/{content_id}", headers=buyer_headers)
    assert denied.status_code == 403
    subscribed = await api.client.post(
        "/v1/subscriptions",
        headers={**buyer_headers, "Idempotency-Key": "subscribe-studio-0001"},
        json={
            "tier_id": tier_id,
            "settlement_method": "credits",
            "auto_renew": False,
        },
    )
    assert subscribed.status_code == 201, subscribed.text
    subscription_id = subscribed.json()["id"]
    assert subscribed.json()["status"] == "active"
    replayed_subscription = await api.client.post(
        "/v1/subscriptions",
        headers={**buyer_headers, "Idempotency-Key": "subscribe-studio-0001"},
        json={
            "tier_id": tier_id,
            "settlement_method": "credits",
            "auto_renew": False,
        },
    )
    assert replayed_subscription.status_code == 201, replayed_subscription.text
    assert replayed_subscription.json()["id"] == subscription_id
    entitled = await api.client.get(f"/v1/content/{content_id}", headers=buyer_headers)
    assert entitled.status_code == 200, entitled.text
    analytics = await api.client.get("/v1/creator/analytics", headers=creator_headers)
    assert analytics.status_code == 200, analytics.text
    assert analytics.json()["content_count"] == 1
    assert analytics.json()["published_content_count"] == 1
    assert analytics.json()["active_subscription_count"] == 1
    assert analytics.json()["subscription_revenue_minor"] == 900
    assert analytics.json()["total_creator_earnings_minor"] == 900

    async with api.app.state.session_factory() as db:
        wallet = await user_account(db, buyer.id, LedgerAccountType.user_wallet)
        earnings = await user_account(db, creator.id, LedgerAccountType.creator_earnings)
        assert await account_balance(db, wallet) == 1_000
        assert await account_balance(db, earnings) == 900

    cancelled = await api.client.post(
        f"/v1/subscriptions/{subscription_id}/cancel", headers=buyer_headers
    )
    assert cancelled.json()["status"] == "cancelled"
    # Cancellation preserves the paid entitlement window; refund ends it.
    assert (
        await api.client.get(f"/v1/content/{content_id}", headers=buyer_headers)
    ).status_code == 200
    refunded = await api.client.post(
        f"/v1/subscriptions/{subscription_id}/refund",
        headers={**buyer_headers, "Idempotency-Key": "refund-studio-0001"},
    )
    assert refunded.status_code == 200, refunded.text
    assert refunded.json()["status"] == "refunded"
    assert (
        await api.client.get(f"/v1/content/{content_id}", headers=buyer_headers)
    ).status_code == 403
    async with api.app.state.session_factory() as db:
        wallet = await user_account(db, buyer.id, LedgerAccountType.user_wallet)
        earnings = await user_account(db, creator.id, LedgerAccountType.creator_earnings)
        assert await account_balance(db, wallet) == 2_000
        assert await account_balance(db, earnings) == 0
        assert (
            await db.scalar(
                select(func.count())
                .select_from(SecurityAuditEvent)
                .where(
                    SecurityAuditEvent.action == "creator.subscription_refunded",
                    SecurityAuditEvent.actor_user_id == buyer.id,
                )
            )
            == 1
        )


async def test_content_schedule_uses_dispatch_and_published_version_is_immutable(
    api_factory: Any,
) -> None:
    dispatched: list[tuple[uuid.UUID, Any]] = []

    async def dispatch(content_id: uuid.UUID, scheduled_at: Any) -> None:
        dispatched.append((content_id, scheduled_at))

    async with api_factory(content_publish_dispatcher=dispatch) as api:
        _, headers = await member(api, "scheduler@example.com", "Scheduler", "creator")
        await activate_creator(api, headers, "scheduler")
        created = await api.client.post(
            "/v1/content",
            headers=headers,
            json={
                "kind": "post",
                "visibility": "public",
                "title": "Scheduled post",
                "body": "Scheduled through the durable worker boundary.",
            },
        )
        content_id = created.json()["id"]
        version_id = created.json()["version"]["id"]
        processing = await api.client.post(
            f"/v1/content/{content_id}/versions/{version_id}/processing-jobs",
            headers=headers,
            json={"operation": "captions"},
        )
        assert processing.status_code == 503
        assert processing.json()["code"] == "content_processor_unavailable"
        async with api.app.state.session_factory() as db:
            job = await db.scalar(
                select(ContentProcessingJob).where(
                    ContentProcessingJob.content_version_id == uuid.UUID(version_id)
                )
            )
            assert job is not None
            assert job.state == "unavailable"
        scheduled = await api.client.post(
            f"/v1/content/{content_id}/schedule",
            headers=headers,
            json={"scheduled_at": (utcnow() + timedelta(hours=1)).isoformat()},
        )
        assert scheduled.status_code == 200, scheduled.text
        assert scheduled.json()["state"] == "scheduled"
        assert dispatched and str(dispatched[0][0]) == content_id

        # Execute the persisted operation used by the registered Celery task.
        async with api.app.state.session_factory() as db:
            item = await db.get(ContentItem, uuid.UUID(content_id))
            assert item is not None
            item.scheduled_at = utcnow() - timedelta(seconds=1)
            await db.commit()
        async with api.app.state.session_factory() as db:
            published = await publish_scheduled_content(db, uuid.UUID(content_id))
            assert published.state == "published"
        immutable = await api.client.patch(
            f"/v1/content/{content_id}/versions/{version_id}",
            headers=headers,
            json={"title": "Mutated"},
        )
        assert immutable.status_code == 409
        assert immutable.json()["code"] == "published_version_immutable"


async def test_creator_rbac_and_cross_owner_references_are_rejected(api: APIHarness) -> None:
    _, member_headers = await member(api, "ordinary-member@example.com", "Ordinary member")
    denied = await api.client.post(
        "/v1/creator/account",
        headers=member_headers,
        json={
            "public_slug": "ordinary-member",
            "channel_name": "Ordinary member",
            "category": "education",
        },
    )
    assert denied.status_code == 403

    _, first_headers = await member(api, "first-owner@example.com", "First owner", "creator")
    _, second_headers = await member(api, "second-owner@example.com", "Second owner", "creator")
    await activate_creator(api, first_headers, "first-owner")
    await activate_creator(api, second_headers, "second-owner")
    foreign_tier = await api.client.post(
        "/v1/creator/subscription-tiers",
        headers=second_headers,
        json={
            "name": "Second owner tier",
            "description": "Only the second owner may reference this tier.",
            "price_minor": 100,
            "duration_days": 30,
        },
    )
    assert foreign_tier.status_code == 201, foreign_tier.text
    invalid_reference = await api.client.post(
        "/v1/content",
        headers=first_headers,
        json={
            "kind": "post",
            "visibility": "tier",
            "required_tier_id": foreign_tier.json()["id"],
            "title": "Cross-owner tier",
            "body": "This content must not be created.",
        },
    )
    assert invalid_reference.status_code == 422
    assert invalid_reference.json()["code"] == "invalid_content_tier"

    owned = await api.client.post(
        "/v1/content",
        headers=first_headers,
        json={
            "kind": "post",
            "visibility": "public",
            "title": "First owner content",
            "body": "Only the first owner can change this content.",
        },
    )
    assert owned.status_code == 201, owned.text
    cross_owner_patch = await api.client.patch(
        f"/v1/content/{owned.json()['id']}",
        headers=second_headers,
        json={"visibility": "followers"},
    )
    assert cross_owner_patch.status_code == 404


async def create_service_product(
    api: APIHarness, seller_headers: dict[str, str], slug: str, price: int
) -> str:
    product = await api.client.post(
        "/v1/marketplace/seller/products",
        headers=seller_headers,
        json={
            "slug": slug,
            "kind": "service",
            "category": "consulting",
            "title": "Creator consultation",
            "description": "A scheduled consultation.",
            "fulfillment_terms": "Seller and buyer agree on a schedule.",
            "settlement_method": "credits",
            "amount_minor": price,
            "currency": "SYLORA_CREDIT",
            "quantity_available": 5,
        },
    )
    assert product.status_code == 201, product.text
    product_id = product.json()["id"]
    published = await api.client.post(
        f"/v1/marketplace/seller/products/{product_id}/publish",
        headers=seller_headers,
    )
    assert published.status_code == 200, published.text
    return product_id


async def test_marketplace_checkout_booking_review_refund_and_boundaries(
    api: APIHarness,
) -> None:
    seller, seller_headers = await member(api, "seller@example.com", "Seller", "creator")
    buyer, buyer_headers = await member(api, "buyer@example.com", "Buyer")
    await activate_creator(api, seller_headers, "seller")
    store = await api.client.post(
        "/v1/marketplace/seller/store",
        headers=seller_headers,
        json={
            "slug": "seller-store",
            "name": "Seller Store",
            "description": "Services and downloads.",
        },
    )
    assert store.status_code == 201, store.text
    product_id = await create_service_product(api, seller_headers, "consultation", 1_000)
    await fund_wallet(api, buyer.id, 1_000)

    added = await api.client.post(
        "/v1/marketplace/cart/items",
        headers=buyer_headers,
        json={"product_id": product_id, "quantity": 1, "settlement_method": "credits"},
    )
    assert added.status_code == 201, added.text
    cart_item_id = added.json()["items"][0]["id"]
    duplicate_service = await api.client.post(
        "/v1/marketplace/cart/items",
        headers=buyer_headers,
        json={"product_id": product_id, "quantity": 1, "settlement_method": "credits"},
    )
    assert duplicate_service.status_code == 422
    assert duplicate_service.json()["code"] == "service_quantity_invalid"
    updated_service = await api.client.patch(
        f"/v1/marketplace/cart/items/{cart_item_id}",
        headers=buyer_headers,
        json={"quantity": 2},
    )
    assert updated_service.status_code == 422
    assert updated_service.json()["code"] == "service_quantity_invalid"
    # A later price does not alter the persisted cart snapshot.
    repriced = await api.client.post(
        f"/v1/marketplace/seller/products/{product_id}/prices",
        headers=seller_headers,
        json={
            "settlement_method": "credits",
            "amount_minor": 1_500,
            "currency": "SYLORA_CREDIT",
        },
    )
    assert repriced.status_code == 201, repriced.text
    checkout = await api.client.post(
        "/v1/marketplace/checkout",
        headers={**buyer_headers, "Idempotency-Key": "checkout-service-0001"},
        json={"settlement_method": "credits"},
    )
    assert checkout.status_code == 201, checkout.text
    assert checkout.json()["total_minor"] == 1_000
    assert checkout.json()["state"] == "fulfilling"
    order_id = checkout.json()["id"]
    line_id = checkout.json()["lines"][0]["id"]
    premature_review = await api.client.post(
        "/v1/marketplace/reviews",
        headers=buyer_headers,
        json={"order_line_id": line_id, "rating": 5, "body": "Not completed yet."},
    )
    assert premature_review.status_code == 403
    assert premature_review.json()["code"] == "completed_purchase_required"
    replay = await api.client.post(
        "/v1/marketplace/checkout",
        headers={**buyer_headers, "Idempotency-Key": "checkout-service-0001"},
        json={"settlement_method": "credits"},
    )
    assert replay.status_code == 201
    assert replay.json()["id"] == order_id

    async with api.app.state.session_factory() as db:
        booking = await db.scalar(
            select(ServiceBookingRequest)
            .join(OrderLine, OrderLine.id == ServiceBookingRequest.order_line_id)
            .where(OrderLine.order_id == uuid.UUID(order_id))
        )
        assert booking is not None
        booking_id = str(booking.id)
    accepted = await api.client.patch(
        f"/v1/marketplace/orders/bookings/{booking_id}",
        headers=seller_headers,
        json={"status": "accepted"},
    )
    assert accepted.status_code == 200, accepted.text
    start = utcnow() + timedelta(days=1)
    scheduled = await api.client.patch(
        f"/v1/marketplace/orders/bookings/{booking_id}",
        headers=seller_headers,
        json={
            "status": "scheduled",
            "scheduled_start_at": start.isoformat(),
            "scheduled_end_at": (start + timedelta(hours=1)).isoformat(),
        },
    )
    assert scheduled.status_code == 200, scheduled.text
    completed = await api.client.patch(
        f"/v1/marketplace/orders/bookings/{booking_id}",
        headers=seller_headers,
        json={"status": "completed"},
    )
    assert completed.status_code == 200, completed.text
    review = await api.client.post(
        "/v1/marketplace/reviews",
        headers=buyer_headers,
        json={"order_line_id": line_id, "rating": 5, "body": "Delivered as scheduled."},
    )
    assert review.status_code == 201, review.text

    refunded = await api.client.post(
        f"/v1/marketplace/seller/orders/{order_id}/refund",
        headers={**seller_headers, "Idempotency-Key": "refund-service-0001"},
        json={"reason": "Buyer and seller agreed to a refund."},
    )
    assert refunded.status_code == 200, refunded.text
    assert refunded.json()["state"] == "refunded"
    second = await api.client.post(
        f"/v1/marketplace/seller/orders/{order_id}/refund",
        headers={**seller_headers, "Idempotency-Key": "refund-service-0002"},
        json={"reason": "A duplicate refund must not post."},
    )
    assert second.status_code == 200
    async with api.app.state.session_factory() as db:
        original = await db.scalar(
            select(Order.ledger_transaction_id).where(Order.id == uuid.UUID(order_id))
        )
        reversals = int(
            await db.scalar(
                select(func.count())
                .select_from(LedgerTransaction)
                .where(LedgerTransaction.reverses_transaction_id == original)
            )
            or 0
        )
        assert reversals == 1

    # No real external provider is configured: no pending or paid order is persisted.
    await api.client.delete("/v1/marketplace/cart", headers=buyer_headers)
    external_product = await api.client.post(
        "/v1/marketplace/seller/products",
        headers=seller_headers,
        json={
            "slug": "external-consultation",
            "kind": "service",
            "category": "consulting",
            "title": "External consultation",
            "description": "A service settled by a configured provider only.",
            "fulfillment_terms": "The provider must confirm payment.",
            "settlement_method": "external",
            "amount_minor": 2_500,
            "currency": "USD",
            "external_reference": "price_external_consultation",
            "quantity_available": 2,
        },
    )
    assert external_product.status_code == 201, external_product.text
    external_product_id = external_product.json()["id"]
    assert (
        await api.client.post(
            f"/v1/marketplace/seller/products/{external_product_id}/publish",
            headers=seller_headers,
        )
    ).status_code == 200
    added_external = await api.client.post(
        "/v1/marketplace/cart/items",
        headers=buyer_headers,
        json={
            "product_id": external_product_id,
            "quantity": 1,
            "settlement_method": "external",
        },
    )
    assert added_external.status_code == 201, added_external.text
    unavailable = await api.client.post(
        "/v1/marketplace/checkout",
        headers={**buyer_headers, "Idempotency-Key": "checkout-external-0001"},
        json={
            "settlement_method": "external",
            "return_url": "https://web.test.sylora.local/orders",
        },
    )
    assert unavailable.status_code == 503
    assert unavailable.json()["code"] == "payment_provider_unavailable"
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count()).select_from(Order).where(Order.buyer_user_id == buyer.id)
            )
            == 1
        )
    deleted = await api.client.request(
        "DELETE",
        "/v1/users/me",
        headers=buyer_headers,
        json={"password": "CorrectHorse!2026"},
    )
    assert deleted.status_code == 200, deleted.text
    async with api.app.state.session_factory() as db:
        preserved_order = await db.get(Order, uuid.UUID(order_id))
        assert preserved_order is not None
        assert preserved_order.buyer_display_name == "Deleted buyer"
        assert (
            await db.scalar(select(func.count()).select_from(Cart).where(Cart.user_id == buyer.id))
            == 0
        )


async def test_digital_entitlement_download_requires_real_storage(api: APIHarness) -> None:
    seller, seller_headers = await member(
        api, "digital-seller@example.com", "Digital Seller", "creator"
    )
    buyer, buyer_headers = await member(api, "digital-buyer@example.com", "Digital Buyer")
    await activate_creator(api, seller_headers, "digital-seller")
    await api.client.post(
        "/v1/marketplace/seller/store",
        headers=seller_headers,
        json={"slug": "digital-store", "name": "Digital Store"},
    )
    created = await api.client.post(
        "/v1/marketplace/seller/products",
        headers=seller_headers,
        json={
            "slug": "download",
            "kind": "digital",
            "category": "templates",
            "title": "Download template",
            "description": "A licensed template download.",
            "fulfillment_terms": "Download access is limited.",
            "settlement_method": "credits",
            "amount_minor": 500,
            "currency": "SYLORA_CREDIT",
        },
    )
    product_id = uuid.UUID(created.json()["id"])
    asset_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        version = await db.scalar(
            select(ProductVersion).where(ProductVersion.product_id == product_id)
        )
        assert version is not None
        db.add(
            ProductAsset(
                id=asset_id,
                product_version_id=version.id,
                object_key=f"marketplace/test/{asset_id}",
                content_type="application/pdf",
                byte_size=100,
                sha256="a" * 64,
                state=AssetState.verified,
                download_limit=2,
                entitlement_days=30,
                rights_declaration="I own all rights to this generated test record.",
                verified_at=utcnow(),
            )
        )
        await db.commit()
    published = await api.client.post(
        f"/v1/marketplace/seller/products/{product_id}/publish",
        headers=seller_headers,
    )
    assert published.status_code == 200, published.text
    await api.client.post(
        "/v1/marketplace/cart/items",
        headers=buyer_headers,
        json={"product_id": str(product_id), "quantity": 1, "settlement_method": "credits"},
    )
    insufficient = await api.client.post(
        "/v1/marketplace/checkout",
        headers={**buyer_headers, "Idempotency-Key": "digital-insufficient-0001"},
        json={"settlement_method": "credits"},
    )
    assert insufficient.status_code == 409
    assert insufficient.json()["code"] == "insufficient_funds"
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count()).select_from(Order).where(Order.buyer_user_id == buyer.id)
            )
            == 0
        )
    await fund_wallet(api, buyer.id, 500)
    order = await api.client.post(
        "/v1/marketplace/checkout",
        headers={**buyer_headers, "Idempotency-Key": "digital-checkout-0001"},
        json={"settlement_method": "credits"},
    )
    assert order.status_code == 201, order.text
    assert order.json()["state"] == "completed"
    async with api.app.state.session_factory() as db:
        entitlement = await db.scalar(
            select(ProductEntitlement).where(ProductEntitlement.user_id == buyer.id)
        )
        assert entitlement is not None
        entitlement_id = entitlement.id
    download = await api.client.post(
        f"/v1/marketplace/downloads/{entitlement_id}/{asset_id}",
        headers=buyer_headers,
    )
    assert download.status_code == 503
    assert download.json()["code"] == "object_storage_unavailable"
    async with api.app.state.session_factory() as db:
        entitlement = await db.get(ProductEntitlement, entitlement_id)
        assert entitlement is not None
        assert entitlement.download_count == 0


async def test_credit_course_enrollment_posts_atomic_split(api: APIHarness) -> None:
    author, _ = await member(api, "credit-author@example.com", "Credit Author", "creator")
    learner, learner_headers = await member(api, "credit-learner@example.com", "Credit Learner")
    await fund_wallet(api, learner.id, 1_000)
    course_id = uuid.uuid4()
    version_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        course = Course(
            id=course_id,
            author_user_id=author.id,
            slug="credit-course",
            category="technology",
            state=CourseState.draft,
            settlement_method=SettlementMethod.credits,
            price_minor=1_000,
        )
        db.add(course)
        await db.flush()
        db.add(
            CourseVersion(
                id=version_id,
                course_id=course.id,
                version_number=1,
                state=CourseState.published,
                title="Credit course",
                description="A paid course generated by this test.",
                learning_objectives=["Verify the ledger split"],
                created_by_id=author.id,
                published_at=utcnow(),
            )
        )
        await db.flush()
        course.state = CourseState.published
        course.published_version_id = version_id
        await db.commit()
    enrolled = await api.client.post(
        "/v1/learning/enrollments",
        headers={**learner_headers, "Idempotency-Key": "credit-course-enroll-0001"},
        json={"course_id": str(course_id)},
    )
    assert enrolled.status_code == 201, enrolled.text
    assert enrolled.json()["status"] == "active"
    async with api.app.state.session_factory() as db:
        wallet = await user_account(db, learner.id, LedgerAccountType.user_wallet)
        earnings = await user_account(db, author.id, LedgerAccountType.creator_earnings)
        assert await account_balance(db, wallet) == 0
        assert await account_balance(db, earnings) == 900
        enrollment_count = await db.scalar(
            select(func.count())
            .select_from(Enrollment)
            .where(Enrollment.course_id == course_id, Enrollment.user_id == learner.id)
        )
        assert enrollment_count == 1

    external_course_id = uuid.uuid4()
    external_version_id = uuid.uuid4()
    async with api.app.state.session_factory() as db:
        external_course = Course(
            id=external_course_id,
            author_user_id=author.id,
            slug="external-course",
            category="technology",
            state=CourseState.draft,
            settlement_method=SettlementMethod.external,
            external_settlement_reference="price_external_course",
        )
        db.add(external_course)
        await db.flush()
        db.add(
            CourseVersion(
                id=external_version_id,
                course_id=external_course.id,
                version_number=1,
                state=CourseState.published,
                title="External course",
                description="Requires a configured external provider.",
                learning_objectives=[],
                created_by_id=author.id,
                published_at=utcnow(),
            )
        )
        await db.flush()
        external_course.state = CourseState.published
        external_course.published_version_id = external_version_id
        await db.commit()
    unavailable = await api.client.post(
        "/v1/learning/enrollments",
        headers={**learner_headers, "Idempotency-Key": "external-course-enroll-0001"},
        json={
            "course_id": str(external_course_id),
            "return_url": "https://web.test.sylora.local/courses",
        },
    )
    assert unavailable.status_code == 503
    assert unavailable.json()["code"] == "payment_provider_unavailable"
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(Enrollment)
                .where(
                    Enrollment.course_id == external_course_id,
                    Enrollment.user_id == learner.id,
                )
            )
            == 0
        )


async def test_learning_progress_quiz_certificate_and_immutability(api: APIHarness) -> None:
    author, author_headers = await member(api, "author@example.com", "Author", "creator")
    admin, admin_headers = await member(api, "publisher@example.com", "Publisher", "admin")
    learner, learner_headers = await member(api, "learner@example.com", "Learner")
    assert author and admin and learner
    course = await api.client.post(
        "/v1/learning/courses",
        headers=author_headers,
        json={
            "slug": "server-authoritative-course",
            "category": "technology",
            "title": "Server-authoritative learning",
            "description": "A course generated by the test through production APIs.",
            "learning_objectives": ["Complete ordered lessons", "Pass a quiz"],
            "settlement_method": "free",
        },
    )
    assert course.status_code == 201, course.text
    course_id = course.json()["id"]
    async with api.app.state.session_factory() as db:
        version = await db.scalar(
            select(CourseVersion).where(CourseVersion.course_id == uuid.UUID(course_id))
        )
        assert version is not None
        version_id = str(version.id)
    module = await api.client.post(
        f"/v1/learning/courses/{course_id}/versions/{version_id}/modules",
        headers=author_headers,
        json={"title": "Module one", "position": 0},
    )
    assert module.status_code == 201, module.text
    module_id = module.json()["id"]
    first = await api.client.post(
        f"/v1/learning/courses/{course_id}/modules/{module_id}/lessons",
        headers=author_headers,
        json={
            "kind": "text",
            "title": "First lesson",
            "body": "Read the first lesson.",
            "position": 0,
            "required": True,
            "required_seconds": 2,
            "required_heartbeat_seconds": 2,
        },
    )
    assert first.status_code == 201, first.text
    first_id = first.json()["id"]
    second = await api.client.post(
        f"/v1/learning/courses/{course_id}/modules/{module_id}/lessons",
        headers=author_headers,
        json={
            "kind": "text",
            "title": "Second lesson",
            "body": "Read the second lesson.",
            "position": 1,
            "required": True,
            "prerequisite_lesson_id": first_id,
        },
    )
    assert second.status_code == 201, second.text
    second_id = second.json()["id"]
    quiz = await api.client.post(
        f"/v1/learning/courses/{course_id}/versions/{version_id}/quizzes",
        headers=author_headers,
        json={
            "title": "Final quiz",
            "position": 0,
            "required": True,
            "pass_threshold_percent": 100,
            "attempt_limit": 2,
        },
    )
    assert quiz.status_code == 201, quiz.text
    quiz_id = quiz.json()["id"]
    question = await api.client.post(
        f"/v1/learning/courses/{course_id}/quizzes/{quiz_id}/questions",
        headers=author_headers,
        json={
            "prompt": "Which answer is correct?",
            "position": 0,
            "options": [
                {"text": "Incorrect", "is_correct": False},
                {"text": "Correct", "is_correct": True},
            ],
        },
    )
    assert question.status_code == 201, question.text
    await api.client.post(f"/v1/learning/courses/{course_id}/submit-review", headers=author_headers)
    reviewed = await api.client.post(
        f"/v1/learning/courses/{course_id}/review", headers=admin_headers
    )
    assert reviewed.status_code == 200, reviewed.text
    published = await api.client.post(
        f"/v1/learning/courses/{course_id}/publish", headers=admin_headers
    )
    assert published.status_code == 200, published.text
    immutable = await api.client.patch(
        f"/v1/learning/courses/{course_id}/versions/{version_id}",
        headers=author_headers,
        json={
            "title": "Changed",
            "description": "Changed after publication.",
            "learning_objectives": [],
        },
    )
    assert immutable.status_code == 409
    public_curriculum = await api.client.get(f"/v1/learning/courses/{course_id}/curriculum")
    assert public_curriculum.status_code == 200, public_curriculum.text
    assert "body" not in public_curriculum.json()["lessons"][0]

    enrollment = await api.client.post(
        "/v1/learning/enrollments",
        headers=learner_headers,
        json={"course_id": course_id},
    )
    assert enrollment.status_code == 201, enrollment.text
    enrollment_id = enrollment.json()["id"]
    enrolled_lesson = await api.client.get(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{first_id}",
        headers=learner_headers,
    )
    assert enrolled_lesson.status_code == 200, enrolled_lesson.text
    assert enrolled_lesson.json()["body"] == "Read the first lesson."
    prerequisite = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{second_id}/start",
        headers=learner_headers,
    )
    assert prerequisite.status_code == 409
    started = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{first_id}/start",
        headers=learner_headers,
    )
    assert started.status_code == 200, started.text
    too_soon = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{first_id}/complete",
        headers=learner_headers,
    )
    assert too_soon.status_code == 409
    assert too_soon.json()["code"] == "lesson_requirement_incomplete"
    async with api.app.state.session_factory() as db:
        progress = await db.scalar(
            select(LessonProgress).where(
                LessonProgress.enrollment_id == uuid.UUID(enrollment_id),
                LessonProgress.lesson_id == uuid.UUID(first_id),
            )
        )
        assert progress is not None
        progress.updated_at = utcnow() - timedelta(seconds=5)
        await db.commit()
    heartbeat = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{first_id}/heartbeat",
        headers=learner_headers,
        json={"elapsed_seconds": 2, "position_seconds": 2},
    )
    assert heartbeat.status_code == 200, heartbeat.text
    assert heartbeat.json()["heartbeat_seconds"] == 2
    first_completed = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{first_id}/complete",
        headers=learner_headers,
    )
    assert first_completed.status_code == 200, first_completed.text
    started = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{second_id}/start",
        headers=learner_headers,
    )
    assert started.status_code == 200, started.text
    second_completed = await api.client.post(
        f"/v1/learning/enrollments/{enrollment_id}/lessons/{second_id}/complete",
        headers=learner_headers,
    )
    assert second_completed.status_code == 200, second_completed.text

    public_quiz = await api.client.get(
        f"/v1/learning/quizzes/{quiz_id}",
        params={"enrollment_id": enrollment_id},
        headers=learner_headers,
    )
    assert public_quiz.status_code == 200, public_quiz.text
    assert "is_correct" not in public_quiz.text
    question_data = public_quiz.json()["questions"][0]
    wrong_option = question_data["options"][0]["id"]
    correct_option = question_data["options"][1]["id"]
    attempt_one = await api.client.post(
        f"/v1/learning/quizzes/{quiz_id}/attempts",
        headers=learner_headers,
        json={"enrollment_id": enrollment_id},
    )
    attempt_one_id = attempt_one.json()["id"]
    answer = await api.client.put(
        f"/v1/learning/quizzes/attempts/{attempt_one_id}/answers",
        headers=learner_headers,
        json={
            "question_id": question_data["id"],
            "selected_option_id": wrong_option,
        },
    )
    assert answer.json() == {"status": "recorded"}
    assert "correct" not in answer.text
    failed = await api.client.post(
        f"/v1/learning/quizzes/attempts/{attempt_one_id}/finalize",
        headers=learner_headers,
    )
    assert failed.json()["state"] == "failed"
    gated = await api.client.post(
        "/v1/learning/certificates",
        headers=learner_headers,
        json={"enrollment_id": enrollment_id},
    )
    assert gated.status_code == 409

    attempt_two = await api.client.post(
        f"/v1/learning/quizzes/{quiz_id}/attempts",
        headers=learner_headers,
        json={"enrollment_id": enrollment_id},
    )
    attempt_two_id = attempt_two.json()["id"]
    await api.client.put(
        f"/v1/learning/quizzes/attempts/{attempt_two_id}/answers",
        headers=learner_headers,
        json={
            "question_id": question_data["id"],
            "selected_option_id": correct_option,
        },
    )
    passed = await api.client.post(
        f"/v1/learning/quizzes/attempts/{attempt_two_id}/finalize",
        headers=learner_headers,
    )
    assert passed.json()["state"] == "passed"
    assert passed.json()["score_percent"] == 100
    attempt_limit = await api.client.post(
        f"/v1/learning/quizzes/{quiz_id}/attempts",
        headers=learner_headers,
        json={"enrollment_id": enrollment_id},
    )
    assert attempt_limit.status_code == 409
    assert attempt_limit.json()["code"] == "quiz_attempt_limit_reached"
    certificate = await api.client.post(
        "/v1/learning/certificates",
        headers=learner_headers,
        json={"enrollment_id": enrollment_id},
    )
    assert certificate.status_code == 201, certificate.text
    code = certificate.json()["verification_code"]
    verified = await api.client.get(f"/v1/learning/certificates/verify/{code}")
    assert verified.status_code == 200, verified.text
    assert verified.json() == {
        "valid": True,
        "verification_code": code,
        "recipient_display_name": "Learner",
        "course_title": "Server-authoritative learning",
        "issued_at": certificate.json()["issued_at"],
    }
    pdf = await api.client.post(
        f"/v1/learning/certificates/{certificate.json()['id']}/pdf",
        headers=learner_headers,
    )
    assert pdf.status_code == 503
    assert pdf.json()["code"] == "certificate_renderer_unavailable"
    async with api.app.state.session_factory() as db:
        assert (
            await db.scalar(
                select(func.count())
                .select_from(Certificate)
                .where(Certificate.enrollment_id == uuid.UUID(enrollment_id))
            )
            == 1
        )
