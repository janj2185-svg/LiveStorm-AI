from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import APIError
from app.gift_models import (
    AcquisitionSource,
    DeliveryStatus,
    GiftDefinition,
    GiftDelivery,
    GiftEvent,
    GiftLifecycle,
    GiftRefund,
    GiftSend,
    GiftSendStatus,
    GiftSpendDaily,
    InventoryItem,
)
from app.gift_schemas import GiftPurchaseRequest, GiftSendRequest
from app.gift_service import (
    aware,
    creator_monetization,
    deliver_gift_send,
    gift_preference,
    published_version,
    record_affinity,
    require_available_eligible_gift,
)
from app.ledger_models import (
    LedgerAccount,
    LedgerAccountType,
    LedgerSide,
    LedgerTransaction,
    LedgerTransactionType,
)
from app.ledger_schemas import LedgerPosting
from app.ledger_service import (
    account_balance,
    post_transaction,
    system_account,
    user_account,
)
from app.models import User, UserStatus
from app.security import utcnow
from app.social_service import are_friends, is_blocked
from app.conference_models import ConferenceStatus, LiveConference, LiveConferenceParticipant
from app.live_models import LiveSession, LiveSessionState


async def require_live_send_context(
    db: AsyncSession,
    *,
    payload: GiftSendRequest,
    recipient_user_id: uuid.UUID,
) -> None:
    """Gifts may only be sent inside live communication contexts."""
    if payload.live_session_id is not None:
        session = await db.get(LiveSession, payload.live_session_id)
        if session is None:
            raise APIError(
                404,
                "live_session_not_found",
                "Live session not found",
                "The live session for this gift does not exist.",
            )
        if session.state not in {
            LiveSessionState.live,
            LiveSessionState.reconnecting,
            LiveSessionState.starting,
        }:
            raise APIError(
                409,
                "live_session_not_active",
                "Live session not active",
                "Gifts can only be sent while the live session is active.",
            )
        if session.owner_user_id != recipient_user_id:
            raise APIError(
                400,
                "gift_recipient_not_host",
                "Gift recipient must be the live host",
                "Send gifts to the host of the active live session.",
            )
        return

    if payload.conference_id is not None:
        conference = await db.get(LiveConference, payload.conference_id)
        if conference is None:
            raise APIError(
                404,
                "conference_not_found",
                "Conference not found",
                "The conference for this gift does not exist.",
            )
        if conference.status == ConferenceStatus.ended:
            raise APIError(
                409,
                "conference_not_live",
                "Conference not live",
                "Gifts can only be sent during a live conference or voice room.",
            )
        if conference.status == ConferenceStatus.scheduled:
            conference.status = ConferenceStatus.live
        if conference.host_id == recipient_user_id:
            return
        participant = await db.scalar(
            select(LiveConferenceParticipant).where(
                LiveConferenceParticipant.conference_id == conference.id,
                LiveConferenceParticipant.user_id == recipient_user_id,
                LiveConferenceParticipant.left_at.is_(None),
            )
        )
        if participant is None:
            raise APIError(
                400,
                "gift_recipient_not_in_conference",
                "Recipient not in conference",
                "Gift recipient must be an active conference participant.",
            )
        return

    raise APIError(
        400,
        "live_context_required",
        "Live context required",
        "Gifts can only be sent during Live, Guest, Multi-host, Conference, or Voice Rooms.",
    )


async def enforce_acquisition_limits(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    gift: GiftDefinition,
    quantity: int,
) -> None:
    if gift.supply_cap is not None and gift.sold_count + quantity > gift.supply_cap:
        raise APIError(
            409,
            "gift_supply_exhausted",
            "Gift supply exhausted",
            "The requested quantity exceeds the remaining gift supply.",
        )
    if gift.per_user_limit is not None:
        acquired = await db.scalar(
            select(func.coalesce(func.sum(InventoryItem.acquired_quantity), 0)).where(
                InventoryItem.owner_user_id == user_id,
                InventoryItem.gift_definition_id == gift.id,
            )
        )
        sent_directly = await db.scalar(
            select(func.count())
            .select_from(GiftSend)
            .where(
                GiftSend.sender_user_id == user_id,
                GiftSend.gift_definition_id == gift.id,
                GiftSend.inventory_item_id.is_(None),
            )
        )
        if int(acquired or 0) + int(sent_directly or 0) + quantity > gift.per_user_limit:
            raise APIError(
                409,
                "gift_user_limit_exceeded",
                "Gift user limit exceeded",
                "This acquisition would exceed the per-user limit.",
            )


async def add_daily_spend(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    amount_minor: int,
) -> None:
    preference = await gift_preference(db, user_id)
    today = utcnow().date()
    spend = await db.scalar(
        select(GiftSpendDaily)
        .where(
            GiftSpendDaily.user_id == user_id,
            GiftSpendDaily.spend_date == today,
        )
        .with_for_update()
    )
    if spend is None:
        spend = GiftSpendDaily(user_id=user_id, spend_date=today, spent_minor=0)
        db.add(spend)
        await db.flush()
    if spend.spent_minor + amount_minor > preference.daily_spending_limit_minor:
        raise APIError(
            409,
            "daily_spending_limit_exceeded",
            "Daily spending limit exceeded",
            "This operation would exceed your configured daily gift spending limit.",
        )
    spend.spent_minor += amount_minor


async def purchase_inventory(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    payload: GiftPurchaseRequest,
    idempotency_key: str,
) -> tuple[InventoryItem, bool]:
    existing_transaction = await db.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.idempotency_actor_scope == str(user_id),
            LedgerTransaction.idempotency_scope == "gift-purchase",
            LedgerTransaction.idempotency_key == idempotency_key,
        )
    )
    if existing_transaction is not None:
        item = await db.scalar(
            select(InventoryItem).where(
                InventoryItem.acquisition_transaction_id == existing_transaction.id
            )
        )
        if (
            item is None
            or item.gift_definition_id != payload.gift_definition_id
            or item.acquired_quantity != payload.quantity
        ):
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different purchase.",
            )
        return item, False

    gift = await require_available_eligible_gift(db, user_id, payload.gift_definition_id, lock=True)
    existing_transaction = await db.scalar(
        select(LedgerTransaction).where(
            LedgerTransaction.idempotency_actor_scope == str(user_id),
            LedgerTransaction.idempotency_scope == "gift-purchase",
            LedgerTransaction.idempotency_key == idempotency_key,
        )
    )
    if existing_transaction is not None:
        item = await db.scalar(
            select(InventoryItem).where(
                InventoryItem.acquisition_transaction_id == existing_transaction.id
            )
        )
        if (
            item is None
            or item.gift_definition_id != payload.gift_definition_id
            or item.acquired_quantity != payload.quantity
        ):
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different purchase.",
            )
        return item, False
    await enforce_acquisition_limits(
        db,
        user_id=user_id,
        gift=gift,
        quantity=payload.quantity,
    )
    version = await published_version(db, gift.id)
    total_minor = gift.price_minor * payload.quantity
    await add_daily_spend(db, user_id=user_id, amount_minor=total_minor)
    wallet = await user_account(db, user_id, LedgerAccountType.user_wallet)
    liability = await system_account(db, "system:gift_liability")
    transaction, _ = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.gift_purchase,
        actor_user_id=user_id,
        idempotency_scope="gift-purchase",
        idempotency_key=idempotency_key,
        postings=[
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.debit,
                amount_minor=total_minor,
            ),
            LedgerPosting(
                account_id=liability.id,
                side=LedgerSide.credit,
                amount_minor=total_minor,
            ),
        ],
        metadata={
            "gift_definition_id": str(gift.id),
            "gift_version_id": str(version.id),
            "quantity": payload.quantity,
        },
    )
    gift.sold_count += payload.quantity
    item = InventoryItem(
        owner_user_id=user_id,
        gift_definition_id=gift.id,
        gift_version_id=version.id,
        acquisition_source=AcquisitionSource.purchased,
        quantity=payload.quantity,
        acquired_quantity=payload.quantity,
        unit_price_minor=gift.price_minor,
        acquisition_transaction_id=transaction.id,
        expires_at=gift.available_until,
    )
    db.add(item)
    await record_affinity(
        db,
        user_id=user_id,
        category_id=gift.category_id,
        purchase_increment=payload.quantity,
    )
    await db.flush()
    return item, True


async def validate_recipient(
    db: AsyncSession,
    *,
    sender_user_id: uuid.UUID,
    recipient_user_id: uuid.UUID,
    gift: GiftDefinition,
) -> None:
    if sender_user_id == recipient_user_id:
        raise APIError(
            422,
            "self_gift_forbidden",
            "Self-gifting is not allowed",
            "A gift sender and recipient must be different users.",
        )
    recipient = await db.get(User, recipient_user_id)
    if recipient is None or recipient.status != UserStatus.active:
        raise APIError(
            404,
            "gift_recipient_not_found",
            "Gift recipient not found",
            "The selected recipient is unavailable.",
        )
    if await is_blocked(db, sender_user_id, recipient_user_id):
        raise APIError(
            404,
            "gift_recipient_not_found",
            "Gift recipient not found",
            "The selected recipient is unavailable.",
        )
    preference = await gift_preference(db, recipient_user_id)
    if not preference.accepts_gifts:
        raise APIError(
            403,
            "recipient_gifts_disabled",
            "Recipient does not accept gifts",
            "The recipient has disabled incoming gifts.",
        )
    if preference.friends_only and not await are_friends(db, sender_user_id, recipient_user_id):
        raise APIError(
            403,
            "recipient_gifts_friends_only",
            "Recipient accepts gifts from friends only",
            "The recipient's gift privacy setting requires an accepted friendship.",
        )
    if gift.tier.value in preference.blocked_tiers:
        raise APIError(
            403,
            "recipient_gift_tier_blocked",
            "Gift tier blocked by recipient",
            "The recipient does not accept this gift tier.",
        )
    monetization = await creator_monetization(db, recipient_user_id)
    if not monetization.gifts_enabled:
        raise APIError(
            403,
            "creator_monetization_disabled",
            "Creator monetization disabled",
            "The recipient has not enabled gift monetization.",
        )


async def send_gift(
    db: AsyncSession,
    *,
    sender_user_id: uuid.UUID,
    payload: GiftSendRequest,
    idempotency_key: str,
) -> tuple[GiftSend, list[GiftEvent], bool]:
    existing = await db.scalar(
        select(GiftSend).where(
            GiftSend.sender_user_id == sender_user_id,
            GiftSend.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        same_source = (
            payload.inventory_item_id == existing.inventory_item_id
            if payload.inventory_item_id is not None
            else payload.gift_definition_id == existing.gift_definition_id
        )
        if (
            existing.recipient_user_id != payload.recipient_user_id
            or not same_source
            or existing.message != payload.message
        ):
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different gift send.",
            )
        return existing, [], False

    if sender_user_id == payload.recipient_user_id:
        raise APIError(
            422,
            "self_gift_forbidden",
            "Self-gifting is not allowed",
            "A gift sender and recipient must be different users.",
        )

    await require_live_send_context(
        db, payload=payload, recipient_user_id=payload.recipient_user_id
    )

    inventory: InventoryItem | None = None
    if payload.inventory_item_id is not None:
        inventory = await db.scalar(
            select(InventoryItem)
            .where(InventoryItem.id == payload.inventory_item_id)
            .with_for_update()
        )
        if inventory is None or inventory.owner_user_id != sender_user_id:
            raise APIError(
                404,
                "inventory_item_not_found",
                "Inventory item not found",
                "The selected inventory item does not exist.",
            )
        if inventory.quantity < 1:
            raise APIError(
                409,
                "inventory_item_consumed",
                "Inventory item already consumed",
                "This inventory item has no remaining quantity.",
            )
        if inventory.expires_at is not None and aware(inventory.expires_at) <= utcnow():
            raise APIError(
                409,
                "inventory_item_expired",
                "Inventory item expired",
                "This inventory entitlement has expired.",
            )
        gift = await db.scalar(
            select(GiftDefinition)
            .where(GiftDefinition.id == inventory.gift_definition_id)
            .with_for_update()
        )
        if gift is None or gift.state != GiftLifecycle.published:
            raise APIError(
                409,
                "gift_delivery_disabled",
                "Gift delivery disabled",
                "This gift has been retired and cannot create new deliveries.",
            )
        version = await published_version(db, gift.id)
        if version.id != inventory.gift_version_id:
            from app.gift_models import GiftVersion

            owned_version = await db.get(GiftVersion, inventory.gift_version_id)
            if owned_version is None or owned_version.state != GiftLifecycle.published:
                raise APIError(
                    409,
                    "gift_delivery_disabled",
                    "Gift delivery disabled",
                    "This gift version has been retired and cannot be delivered.",
                )
            version = owned_version
        price_minor = inventory.unit_price_minor
    else:
        assert payload.gift_definition_id is not None
        gift = await require_available_eligible_gift(
            db,
            sender_user_id,
            payload.gift_definition_id,
            lock=True,
        )
        await enforce_acquisition_limits(
            db,
            user_id=sender_user_id,
            gift=gift,
            quantity=1,
        )
        version = await published_version(db, gift.id)
        price_minor = gift.price_minor

    existing = await db.scalar(
        select(GiftSend).where(
            GiftSend.sender_user_id == sender_user_id,
            GiftSend.idempotency_key == idempotency_key,
        )
    )
    if existing is not None:
        same_source = (
            payload.inventory_item_id == existing.inventory_item_id
            if payload.inventory_item_id is not None
            else payload.gift_definition_id == existing.gift_definition_id
        )
        if (
            existing.recipient_user_id != payload.recipient_user_id
            or not same_source
            or existing.message != payload.message
        ):
            raise APIError(
                409,
                "idempotency_conflict",
                "Idempotency key conflict",
                "This idempotency key was already used for a different gift send.",
            )
        return existing, [], False
    await validate_recipient(
        db,
        sender_user_id=sender_user_id,
        recipient_user_id=payload.recipient_user_id,
        gift=gift,
    )
    creator_share = price_minor * gift.creator_revenue_share_bps // 10_000
    platform_share = price_minor - creator_share
    creator = await user_account(db, payload.recipient_user_id, LedgerAccountType.creator_earnings)
    platform = await system_account(db, "system:platform_revenue")
    postings = [
        LedgerPosting(
            account_id=creator.id,
            side=LedgerSide.credit,
            amount_minor=creator_share,
        )
        for _ in [0]
        if creator_share > 0
    ]
    if platform_share > 0:
        postings.append(
            LedgerPosting(
                account_id=platform.id,
                side=LedgerSide.credit,
                amount_minor=platform_share,
            )
        )
    if inventory is not None:
        liability = await system_account(db, "system:gift_liability")
        postings.append(
            LedgerPosting(
                account_id=liability.id,
                side=LedgerSide.debit,
                amount_minor=price_minor,
            )
        )
    else:
        await add_daily_spend(
            db,
            user_id=sender_user_id,
            amount_minor=price_minor,
        )
        wallet = await user_account(db, sender_user_id, LedgerAccountType.user_wallet)
        postings.append(
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.debit,
                amount_minor=price_minor,
            )
        )
    transaction, _ = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.gift_send,
        actor_user_id=sender_user_id,
        idempotency_scope="gift-send",
        idempotency_key=idempotency_key,
        postings=postings,
        metadata={
            "gift_definition_id": str(gift.id),
            "gift_version_id": str(version.id),
            "recipient_user_id": str(payload.recipient_user_id),
            "inventory_item_id": str(inventory.id) if inventory else None,
        },
    )
    if inventory is not None:
        inventory.quantity -= 1
    else:
        gift.sold_count += 1
        await record_affinity(
            db,
            user_id=sender_user_id,
            category_id=gift.category_id,
            purchase_increment=1,
        )
    gift_send = GiftSend(
        sender_user_id=sender_user_id,
        recipient_user_id=payload.recipient_user_id,
        gift_definition_id=gift.id,
        gift_version_id=version.id,
        inventory_item_id=inventory.id if inventory else None,
        ledger_transaction_id=transaction.id,
        idempotency_key=idempotency_key,
        price_minor=price_minor,
        creator_share_minor=creator_share,
        platform_share_minor=platform_share,
        message=payload.message,
        status=GiftSendStatus.queued,
    )
    db.add(gift_send)
    await db.flush()
    delivery = GiftDelivery(
        gift_send_id=gift_send.id,
        attempt_number=1,
        status=DeliveryStatus.queued,
    )
    db.add(delivery)
    await db.flush()
    events = await deliver_gift_send(db, gift_send, delivery)
    return gift_send, events, True


async def retry_gift_delivery(
    db: AsyncSession,
    *,
    gift_send_id: uuid.UUID,
    user_id: uuid.UUID,
) -> tuple[GiftSend, list[GiftEvent], bool]:
    gift_send = await db.scalar(
        select(GiftSend).where(GiftSend.id == gift_send_id).with_for_update()
    )
    if gift_send is None or gift_send.sender_user_id != user_id:
        raise APIError(
            404,
            "gift_send_not_found",
            "Gift send not found",
            "The requested gift send does not exist.",
        )
    if gift_send.status == GiftSendStatus.delivered:
        return gift_send, [], False
    if gift_send.status != GiftSendStatus.failed:
        raise APIError(
            409,
            "gift_delivery_not_retryable",
            "Gift delivery is not retryable",
            "Only a failed gift delivery can be retried.",
        )
    attempt = int(
        await db.scalar(
            select(func.coalesce(func.max(GiftDelivery.attempt_number), 0)).where(
                GiftDelivery.gift_send_id == gift_send.id
            )
        )
        or 0
    )
    gift_send.status = GiftSendStatus.queued
    gift_send.failed_at = None
    delivery = GiftDelivery(
        gift_send_id=gift_send.id,
        attempt_number=attempt + 1,
        status=DeliveryStatus.queued,
    )
    db.add(delivery)
    await db.flush()
    events = await deliver_gift_send(db, gift_send, delivery)
    return gift_send, events, True


def _refund_debits(
    *,
    creator: LedgerAccount,
    creator_available: int,
    creator_share_minor: int,
    platform: LedgerAccount,
    platform_share_minor: int,
    debt: LedgerAccount,
) -> list[LedgerPosting]:
    creator_recovery = min(max(creator_available, 0), creator_share_minor)
    shortfall = creator_share_minor - creator_recovery
    postings: list[LedgerPosting] = []
    if creator_recovery:
        postings.append(
            LedgerPosting(
                account_id=creator.id,
                side=LedgerSide.debit,
                amount_minor=creator_recovery,
            )
        )
    if shortfall:
        postings.append(
            LedgerPosting(
                account_id=debt.id,
                side=LedgerSide.debit,
                amount_minor=shortfall,
            )
        )
    if platform_share_minor:
        postings.append(
            LedgerPosting(
                account_id=platform.id,
                side=LedgerSide.debit,
                amount_minor=platform_share_minor,
            )
        )
    return postings


async def refund_gift_send(
    db: AsyncSession,
    *,
    gift_send_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    idempotency_key: str,
    reason: str,
) -> tuple[GiftRefund, list[GiftEvent], bool]:
    existing = await db.scalar(select(GiftRefund).where(GiftRefund.gift_send_id == gift_send_id))
    if existing is not None:
        return existing, [], False
    gift_send = await db.scalar(
        select(GiftSend).where(GiftSend.id == gift_send_id).with_for_update()
    )
    if gift_send is None:
        raise APIError(
            404,
            "gift_send_not_found",
            "Gift send not found",
            "The requested gift send does not exist.",
        )
    existing = await db.scalar(select(GiftRefund).where(GiftRefund.gift_send_id == gift_send_id))
    if existing is not None:
        return existing, [], False
    if gift_send.status in {GiftSendStatus.refunded, GiftSendStatus.chargeback}:
        raise APIError(
            409,
            "gift_already_refunded",
            "Gift already refunded",
            "This gift send has already been refunded or charged back.",
        )
    creator = await user_account(
        db,
        gift_send.recipient_user_id,
        LedgerAccountType.creator_earnings,
    )
    platform = await system_account(db, "system:platform_revenue")
    debt = await system_account(db, "system:refund_liability")
    inventory: InventoryItem | None = None
    if gift_send.status != GiftSendStatus.delivered and gift_send.inventory_item_id is not None:
        inventory = await db.scalar(
            select(InventoryItem)
            .where(InventoryItem.id == gift_send.inventory_item_id)
            .with_for_update()
        )
    if inventory is not None:
        destination = await system_account(db, "system:gift_liability")
    else:
        destination = await user_account(
            db,
            gift_send.sender_user_id,
            LedgerAccountType.user_wallet,
        )
    account_ids = sorted(
        {creator.id, platform.id, debt.id, destination.id},
        key=lambda item: item.int,
    )
    await db.scalars(
        select(LedgerAccount)
        .where(LedgerAccount.id.in_(account_ids))
        .order_by(LedgerAccount.id)
        .with_for_update()
    )
    postings = _refund_debits(
        creator=creator,
        creator_available=await account_balance(db, creator),
        creator_share_minor=gift_send.creator_share_minor,
        platform=platform,
        platform_share_minor=gift_send.platform_share_minor,
        debt=debt,
    )
    postings.append(
        LedgerPosting(
            account_id=destination.id,
            side=LedgerSide.credit,
            amount_minor=gift_send.price_minor,
        )
    )
    transaction, _ = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.refund,
        actor_user_id=actor_user_id,
        idempotency_scope=f"gift-send-refund:{gift_send.id}",
        idempotency_key=idempotency_key,
        postings=postings,
        metadata={
            "gift_send_id": str(gift_send.id),
            "reason": reason,
            "delivered": gift_send.status == GiftSendStatus.delivered,
        },
    )
    if inventory is not None:
        inventory.quantity += 1
    gift_send.status = GiftSendStatus.refunded
    gift_send.refunded_at = utcnow()
    refund = GiftRefund(
        gift_send_id=gift_send.id,
        ledger_transaction_id=transaction.id,
        actor_user_id=actor_user_id,
        idempotency_key=idempotency_key,
        reason=reason,
    )
    db.add(refund)
    await db.flush()
    events = [
        GiftEvent(
            user_id=gift_send.sender_user_id,
            event_type="gift_refunded",
            gift_send_id=gift_send.id,
            gift_version_id=gift_send.gift_version_id,
            event_payload={"refund_id": str(refund.id)},
        ),
        GiftEvent(
            user_id=gift_send.recipient_user_id,
            event_type="gift_refunded",
            gift_send_id=gift_send.id,
            gift_version_id=gift_send.gift_version_id,
            event_payload={"refund_id": str(refund.id)},
        ),
    ]
    db.add_all(events)
    await db.flush()
    return refund, events, True


async def refund_inventory_item(
    db: AsyncSession,
    *,
    inventory_item_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    idempotency_key: str,
    reason: str,
) -> tuple[GiftRefund, bool]:
    existing = await db.scalar(
        select(GiftRefund).where(GiftRefund.inventory_item_id == inventory_item_id)
    )
    if existing is not None:
        return existing, False
    item = await db.scalar(
        select(InventoryItem).where(InventoryItem.id == inventory_item_id).with_for_update()
    )
    if item is None:
        raise APIError(
            404,
            "inventory_item_not_found",
            "Inventory item not found",
            "The selected inventory item does not exist.",
        )
    existing = await db.scalar(
        select(GiftRefund).where(GiftRefund.inventory_item_id == inventory_item_id)
    )
    if existing is not None:
        return existing, False
    if item.acquisition_source != AcquisitionSource.purchased or item.quantity <= 0:
        raise APIError(
            409,
            "inventory_not_refundable",
            "Inventory item is not refundable",
            "Only an unused purchased entitlement can be refunded.",
        )
    quantity = item.quantity
    amount_minor = item.unit_price_minor * quantity
    liability = await system_account(db, "system:gift_liability")
    wallet = await user_account(
        db,
        item.owner_user_id,
        LedgerAccountType.user_wallet,
    )
    transaction, _ = await post_transaction(
        db,
        transaction_type=LedgerTransactionType.refund,
        actor_user_id=actor_user_id,
        idempotency_scope=f"inventory-refund:{item.id}",
        idempotency_key=idempotency_key,
        postings=[
            LedgerPosting(
                account_id=liability.id,
                side=LedgerSide.debit,
                amount_minor=amount_minor,
            ),
            LedgerPosting(
                account_id=wallet.id,
                side=LedgerSide.credit,
                amount_minor=amount_minor,
            ),
        ],
        metadata={
            "inventory_item_id": str(item.id),
            "quantity": quantity,
            "reason": reason,
        },
    )
    item.quantity = 0
    gift = await db.get(GiftDefinition, item.gift_definition_id)
    if gift is not None:
        gift.sold_count = max(0, gift.sold_count - quantity)
    refund = GiftRefund(
        inventory_item_id=item.id,
        ledger_transaction_id=transaction.id,
        actor_user_id=actor_user_id,
        idempotency_key=idempotency_key,
        reason=reason,
    )
    db.add(refund)
    await db.flush()
    return refund, True
