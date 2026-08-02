from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, WebSocket, WebSocketDisconnect, status
from sqlalchemy import and_, exists, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.dependencies import AuthContext, aware, current_auth, get_session, get_settings
from app.errors import APIError
from app.models import AccessSession, User, UserStatus
from app.rate_limit import rate_limit
from app.schemas import MessageResponse as StatusResponse
from app.security import decode_jwt, utcnow
from app.social_models import (
    Block,
    Channel,
    CommunityMembership,
    Conversation,
    ConversationParticipant,
    ConversationState,
    MembershipStatus,
    Message,
    MessageEvent,
    MessageReceipt,
    ParticipantState,
)
from app.gift_schemas import WebSocketTicketResponse
from app.social_schemas import (
    ConversationCreate,
    ConversationParticipantResponse,
    ConversationResponse,
    MessageCreate,
    MessagePageResponse,
    MessagePatch,
    MessageResponse,
    ReadReceiptRequest,
    ReadReceiptResponse,
    WebSocketEvent,
)
from app.ws_tickets import consume_websocket_ticket, mint_websocket_ticket
from app.social_service import (
    apply_cursor,
    are_friends,
    create_notification,
    decode_cursor,
    direct_pair_key,
    encode_cursor,
    ensure_not_blocked,
    is_blocked,
    not_blocked_condition,
    profile_for_handle,
    require_handle,
)

router = APIRouter(tags=["Messaging"])


class MessageConnectionHub:
    """Process-local socket transport; durable state remains in the database."""

    def __init__(self, queue_size: int = 100) -> None:
        self.queue_size = queue_size
        self._queues: dict[uuid.UUID, set[asyncio.Queue[WebSocketEvent]]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: uuid.UUID) -> asyncio.Queue[WebSocketEvent]:
        queue: asyncio.Queue[WebSocketEvent] = asyncio.Queue(maxsize=self.queue_size)
        async with self._lock:
            self._queues[user_id].add(queue)
        return queue

    async def unsubscribe(self, user_id: uuid.UUID, queue: asyncio.Queue[WebSocketEvent]) -> None:
        async with self._lock:
            self._queues[user_id].discard(queue)
            if not self._queues[user_id]:
                self._queues.pop(user_id, None)

    async def publish(self, user_id: uuid.UUID, event: WebSocketEvent) -> None:
        async with self._lock:
            queues = tuple(self._queues.get(user_id, ()))
        for queue in queues:
            if queue.full():
                queue.get_nowait()
            queue.put_nowait(event)


async def conversation_response(
    db: AsyncSession, conversation: Conversation
) -> ConversationResponse:
    participants = list(
        (
            await db.scalars(
                select(ConversationParticipant)
                .where(ConversationParticipant.conversation_id == conversation.id)
                .order_by(ConversationParticipant.joined_at.asc())
            )
        ).all()
    )
    return ConversationResponse(
        id=conversation.id,
        state=conversation.state,
        created_by_id=conversation.created_by_id,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        participants=[
            ConversationParticipantResponse.model_validate(participant)
            for participant in participants
        ],
    )


def conversation_visibility_condition(user_id: uuid.UUID) -> Any:
    other_participants = select(ConversationParticipant.user_id).where(
        ConversationParticipant.conversation_id == Conversation.id,
        ConversationParticipant.user_id != user_id,
    )
    blocked = exists(
        select(Block.blocker_id).where(
            or_(
                and_(
                    Block.blocker_id == user_id,
                    Block.blocked_id.in_(other_participants),
                ),
                and_(
                    Block.blocked_id == user_id,
                    Block.blocker_id.in_(other_participants),
                ),
            )
        )
    )
    return and_(
        exists(
            select(ConversationParticipant.user_id).where(
                ConversationParticipant.conversation_id == Conversation.id,
                ConversationParticipant.user_id == user_id,
            )
        ),
        ~blocked,
    )


async def visible_conversation(
    db: AsyncSession, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[Conversation, ConversationParticipant]:
    conversation = await db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            conversation_visibility_condition(user_id),
        )
    )
    participant = (
        await db.get(
            ConversationParticipant,
            {"conversation_id": conversation_id, "user_id": user_id},
        )
        if conversation is not None
        else None
    )
    if conversation is None or participant is None:
        raise APIError(
            404,
            "conversation_not_found",
            "Conversation not found",
            "The requested conversation does not exist.",
        )
    return conversation, participant


async def message_event_records(
    db: AsyncSession,
    *,
    event_type: str,
    actor_user_id: uuid.UUID,
    message: Message | None,
    conversation_id: uuid.UUID | None,
    metadata: dict[str, str] | None = None,
) -> list[MessageEvent]:
    if conversation_id is not None:
        recipient_ids = list(
            (
                await db.scalars(
                    select(ConversationParticipant.user_id).where(
                        ConversationParticipant.conversation_id == conversation_id,
                        ConversationParticipant.state != ParticipantState.declined,
                    )
                )
            ).all()
        )
    elif message is not None and message.channel_id is not None:
        recipient_ids = list(
            (
                await db.scalars(
                    select(CommunityMembership.user_id)
                    .join(Channel, Channel.community_id == CommunityMembership.community_id)
                    .where(
                        Channel.id == message.channel_id,
                        Channel.deleted_at.is_(None),
                        CommunityMembership.status == MembershipStatus.active,
                    )
                )
            ).all()
        )
    else:
        recipient_ids = [actor_user_id]
    visible_recipient_ids = [
        recipient_id
        for recipient_id in set(recipient_ids)
        if recipient_id == actor_user_id or not await is_blocked(db, actor_user_id, recipient_id)
    ]
    records = [
        MessageEvent(
            user_id=recipient_id,
            event_type=event_type,
            message_id=message.id if message else None,
            conversation_id=conversation_id,
            actor_user_id=actor_user_id,
            event_metadata=metadata or {},
        )
        for recipient_id in visible_recipient_ids
    ]
    db.add_all(records)
    await db.flush()
    return records


async def event_response(
    db: AsyncSession, settings: Settings, record: MessageEvent
) -> WebSocketEvent:
    message = await db.get(Message, record.message_id) if record.message_id else None
    return WebSocketEvent(
        event=record.event_type,
        cursor=encode_cursor(settings, "ws_events", record.created_at, record.id),
        message=MessageResponse.model_validate(message) if message is not None else None,
        conversation_id=record.conversation_id,
        user_id=record.actor_user_id,
        event_metadata={str(key): str(value) for key, value in record.event_metadata.items()},
        occurred_at=record.created_at,
    )


async def publish_records(
    request: Request,
    db: AsyncSession,
    settings: Settings,
    records: list[MessageEvent],
) -> None:
    hub: MessageConnectionHub = request.app.state.message_hub
    for record in records:
        await hub.publish(record.user_id, await event_response(db, settings, record))


@router.post(
    "/messages/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: ConversationCreate,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ConversationResponse:
    await require_handle(db, auth.user.id)
    target = await profile_for_handle(db, payload.recipient_handle)
    await ensure_not_blocked(db, auth.user.id, target.user_id)
    pair_key = direct_pair_key(auth.user.id, target.user_id)
    conversation = await db.scalar(
        select(Conversation).where(Conversation.direct_pair_key == pair_key)
    )
    if conversation is not None:
        return await conversation_response(db, conversation)
    friends = await are_friends(db, auth.user.id, target.user_id)
    conversation = Conversation(
        direct_pair_key=pair_key,
        created_by_id=auth.user.id,
        state=ConversationState.active if friends else ConversationState.request,
    )
    db.add(conversation)
    await db.flush()
    db.add_all(
        [
            ConversationParticipant(
                conversation_id=conversation.id,
                user_id=auth.user.id,
                state=ParticipantState.active,
            ),
            ConversationParticipant(
                conversation_id=conversation.id,
                user_id=target.user_id,
                state=ParticipantState.active if friends else ParticipantState.requested,
            ),
        ]
    )
    if not friends:
        await create_notification(
            db,
            user_id=target.user_id,
            notification_type="message_request",
            actor_user_id=auth.user.id,
            target_type="conversation",
            target_id=conversation.id,
        )
    await db.commit()
    await db.refresh(conversation)
    return await conversation_response(db, conversation)


@router.get("/messages/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> list[ConversationResponse]:
    conversations = list(
        (
            await db.scalars(
                select(Conversation)
                .where(conversation_visibility_condition(auth.user.id))
                .order_by(Conversation.updated_at.desc())
            )
        ).all()
    )
    return [await conversation_response(db, conversation) for conversation in conversations]


@router.post(
    "/messages/conversations/{conversation_id}/accept",
    response_model=ConversationResponse,
)
async def accept_message_request(
    conversation_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> ConversationResponse:
    conversation, participant = await visible_conversation(db, conversation_id, auth.user.id)
    if participant.state != ParticipantState.requested:
        raise APIError(
            409,
            "message_request_not_pending",
            "Message request not pending",
            "There is no pending message request to accept.",
        )
    participant.state = ParticipantState.active
    conversation.state = ConversationState.active
    await db.commit()
    await db.refresh(conversation)
    return await conversation_response(db, conversation)


@router.post(
    "/messages/conversations/{conversation_id}/decline",
    response_model=StatusResponse,
)
async def decline_message_request(
    conversation_id: uuid.UUID,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
) -> StatusResponse:
    conversation, participant = await visible_conversation(db, conversation_id, auth.user.id)
    if participant.state != ParticipantState.requested:
        raise APIError(
            409,
            "message_request_not_pending",
            "Message request not pending",
            "There is no pending message request to decline.",
        )
    participant.state = ParticipantState.declined
    conversation.state = ConversationState.declined
    await db.commit()
    return StatusResponse(status="declined")


@router.get(
    "/messages/conversations/{conversation_id}/messages",
    response_model=MessagePageResponse,
)
async def message_history(
    conversation_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessagePageResponse:
    await visible_conversation(db, conversation_id, auth.user.id)
    scope = f"conversation:{conversation_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    statement = select(Message).where(Message.conversation_id == conversation_id)
    statement = apply_cursor(statement, Message.created_at, Message.id, cursor_value)
    messages = list(
        (
            await db.scalars(
                statement.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = messages[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(messages) > limit and visible
        else None
    )
    return MessagePageResponse(
        items=[MessageResponse.model_validate(message) for message in visible],
        next_cursor=next_cursor,
    )


async def create_receipts(
    db: AsyncSession, message: Message, recipient_ids: list[uuid.UUID]
) -> None:
    now = utcnow()
    receipts: list[MessageReceipt] = []
    for recipient_id in set(recipient_ids):
        if recipient_id == message.sender_id or await is_blocked(
            db, message.sender_id, recipient_id
        ):
            continue
        receipts.append(
            MessageReceipt(
                message_id=message.id,
                user_id=recipient_id,
                delivered_at=now,
            )
        )
    db.add_all(receipts)


@router.post(
    "/messages/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Message:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="messages",
        subject=str(auth.user.id),
        limit=settings.message_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    conversation, participant = await visible_conversation(db, conversation_id, auth.user.id)
    if participant.state != ParticipantState.active:
        raise APIError(
            403,
            "message_request_not_accepted",
            "Message request not accepted",
            "Accept the message request before replying.",
        )
    recipients = list(
        (
            await db.scalars(
                select(ConversationParticipant.user_id).where(
                    ConversationParticipant.conversation_id == conversation.id,
                    ConversationParticipant.user_id != auth.user.id,
                    ConversationParticipant.state != ParticipantState.declined,
                )
            )
        ).all()
    )
    for recipient_id in recipients:
        await ensure_not_blocked(db, auth.user.id, recipient_id)
    message = Message(
        conversation_id=conversation.id,
        sender_id=auth.user.id,
        body=payload.body,
        attachment_url=payload.attachment_url,
    )
    db.add(message)
    conversation.updated_at = utcnow()
    await db.flush()
    await create_receipts(db, message, recipients)
    records = await message_event_records(
        db,
        event_type="message",
        actor_user_id=auth.user.id,
        message=message,
        conversation_id=conversation.id,
    )
    await db.commit()
    await db.refresh(message)
    await publish_records(request, db, settings, records)
    return message


async def owned_message(db: AsyncSession, message_id: uuid.UUID, user_id: uuid.UUID) -> Message:
    message = await db.scalar(
        select(Message).where(Message.id == message_id, Message.sender_id == user_id)
    )
    if message is None:
        raise APIError(
            404,
            "message_not_found",
            "Message not found",
            "The message does not exist.",
        )
    if message.conversation_id is not None:
        await visible_conversation(db, message.conversation_id, user_id)
    return message


@router.patch("/messages/{message_id}", response_model=MessageResponse)
async def edit_message(
    message_id: uuid.UUID,
    payload: MessagePatch,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Message:
    message = await owned_message(db, message_id, auth.user.id)
    if message.deleted_at is not None:
        raise APIError(
            409,
            "message_deleted",
            "Message deleted",
            "A deleted message cannot be edited.",
        )
    message.body = payload.body
    message.edited_at = utcnow()
    records = await message_event_records(
        db,
        event_type="message_edited",
        actor_user_id=auth.user.id,
        message=message,
        conversation_id=message.conversation_id,
    )
    await db.commit()
    await db.refresh(message)
    await publish_records(request, db, settings, records)
    return message


@router.delete("/messages/{message_id}", response_model=StatusResponse)
async def delete_message(
    message_id: uuid.UUID,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> StatusResponse:
    message = await owned_message(db, message_id, auth.user.id)
    message.body = ""
    message.attachment_url = None
    message.deleted_at = utcnow()
    records = await message_event_records(
        db,
        event_type="message_deleted",
        actor_user_id=auth.user.id,
        message=message,
        conversation_id=message.conversation_id,
    )
    await db.commit()
    await publish_records(request, db, settings, records)
    return StatusResponse(status="deleted")


@router.post(
    "/messages/conversations/{conversation_id}/read",
    response_model=ReadReceiptResponse,
)
async def mark_conversation_read(
    conversation_id: uuid.UUID,
    payload: ReadReceiptRequest,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ReadReceiptResponse:
    _, participant = await visible_conversation(db, conversation_id, auth.user.id)
    through = await db.scalar(
        select(Message).where(
            Message.id == payload.through_message_id,
            Message.conversation_id == conversation_id,
        )
    )
    if through is None:
        raise APIError(
            422,
            "invalid_read_position",
            "Invalid read position",
            "The selected message is not in this conversation.",
        )
    read_at = utcnow()
    await db.execute(
        update(MessageReceipt)
        .where(
            MessageReceipt.user_id == auth.user.id,
            MessageReceipt.message_id.in_(
                select(Message.id).where(
                    Message.conversation_id == conversation_id,
                    or_(
                        Message.created_at < through.created_at,
                        and_(
                            Message.created_at == through.created_at,
                            Message.id <= through.id,
                        ),
                    ),
                )
            ),
        )
        .values(read_at=read_at)
    )
    participant.last_read_at = read_at
    records = await message_event_records(
        db,
        event_type="read",
        actor_user_id=auth.user.id,
        message=None,
        conversation_id=conversation_id,
        metadata={"through_message_id": str(through.id)},
    )
    await db.commit()
    await publish_records(request, db, settings, records)
    return ReadReceiptResponse(
        conversation_id=conversation_id,
        through_message_id=through.id,
        read_at=read_at,
    )


async def channel_for_user(db: AsyncSession, channel_id: uuid.UUID, user_id: uuid.UUID) -> Channel:
    channel = await db.scalar(
        select(Channel)
        .join(
            CommunityMembership,
            CommunityMembership.community_id == Channel.community_id,
        )
        .where(
            Channel.id == channel_id,
            Channel.deleted_at.is_(None),
            CommunityMembership.user_id == user_id,
            CommunityMembership.status == MembershipStatus.active,
        )
    )
    if channel is None:
        raise APIError(
            404,
            "channel_not_found",
            "Channel not found",
            "The requested channel does not exist.",
        )
    return channel


@router.get(
    "/messages/channels/{channel_id}",
    response_model=MessagePageResponse,
)
async def channel_message_history(
    channel_id: uuid.UUID,
    cursor: str | None = None,
    limit: int = Query(default=50, ge=1, le=100),
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessagePageResponse:
    await channel_for_user(db, channel_id, auth.user.id)
    scope = f"channel:{channel_id}"
    cursor_value = decode_cursor(settings, scope, cursor)
    statement = select(Message).where(
        Message.channel_id == channel_id,
        not_blocked_condition(auth.user.id, Message.sender_id),
    )
    statement = apply_cursor(statement, Message.created_at, Message.id, cursor_value)
    messages = list(
        (
            await db.scalars(
                statement.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit + 1)
            )
        ).all()
    )
    visible = messages[:limit]
    next_cursor = (
        encode_cursor(settings, scope, visible[-1].created_at, visible[-1].id)
        if len(messages) > limit and visible
        else None
    )
    return MessagePageResponse(
        items=[MessageResponse.model_validate(message) for message in visible],
        next_cursor=next_cursor,
    )


@router.post(
    "/messages/channels/{channel_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_channel_message(
    channel_id: uuid.UUID,
    payload: MessageCreate,
    request: Request,
    auth: AuthContext = Depends(current_auth),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Message:
    await require_handle(db, auth.user.id)
    await rate_limit(
        request,
        bucket="messages",
        subject=str(auth.user.id),
        limit=settings.message_rate_limit,
        window_seconds=settings.social_rate_window_seconds,
    )
    channel = await channel_for_user(db, channel_id, auth.user.id)
    recipient_ids = list(
        (
            await db.scalars(
                select(CommunityMembership.user_id).where(
                    CommunityMembership.community_id == channel.community_id,
                    CommunityMembership.status == MembershipStatus.active,
                )
            )
        ).all()
    )
    message = Message(
        channel_id=channel.id,
        sender_id=auth.user.id,
        body=payload.body,
        attachment_url=payload.attachment_url,
    )
    db.add(message)
    await db.flush()
    await create_receipts(db, message, recipient_ids)
    records = await message_event_records(
        db,
        event_type="message",
        actor_user_id=auth.user.id,
        message=message,
        conversation_id=None,
    )
    await db.commit()
    await db.refresh(message)
    await publish_records(request, db, settings, records)
    return message


async def websocket_user(websocket: WebSocket) -> uuid.UUID:
    authorization = websocket.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise APIError(
            401,
            "authentication_required",
            "Authentication required",
            "Provide a bearer access token.",
        )
    settings: Settings = websocket.app.state.settings
    payload = decode_jwt(token, settings, "access")
    try:
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (ValueError, KeyError, TypeError) as exc:
        raise APIError(401, "invalid_token", "Invalid token", "Authentication failed.") from exc
    async with websocket.app.state.session_factory() as db:
        user = await db.get(User, user_id)
        access_session = await db.get(AccessSession, session_id)
        if (
            user is None
            or access_session is None
            or access_session.user_id != user_id
            or access_session.revoked_at is not None
            or aware(access_session.expires_at) <= utcnow()
            or user.status != UserStatus.active
            or user.token_version != payload.get("ver")
        ):
            raise APIError(401, "invalid_token", "Invalid token", "Authentication failed.")
    return user_id


@router.post("/messages/events/ticket", response_model=WebSocketTicketResponse)
async def create_message_websocket_ticket(
    request: Request,
    auth: AuthContext = Depends(current_auth),
) -> WebSocketTicketResponse:
    return await mint_websocket_ticket(
        request,
        user_id=auth.user.id,
        namespace="msg",
        rate_bucket="message-socket-ticket",
        unavailable_code="message_realtime_unavailable",
        unavailable_title="Message realtime unavailable",
    )


async def websocket_ticket_user(websocket: WebSocket, ticket: str) -> uuid.UUID:
    return await consume_websocket_ticket(
        websocket,
        ticket,
        namespace="msg",
        unavailable_code="message_realtime_unavailable",
        unavailable_title="Message realtime unavailable",
    )


@router.websocket("/ws/messages")
async def message_websocket(websocket: WebSocket) -> None:
    try:
        ticket = websocket.query_params.get("ticket")
        user_id = (
            await websocket_ticket_user(websocket, ticket)
            if ticket
            else await websocket_user(websocket)
        )
        settings: Settings = websocket.app.state.settings
        since = decode_cursor(settings, "ws_events", websocket.query_params.get("since"))
    except APIError:
        await websocket.close(code=4401)
        return
    await websocket.accept()
    hub: MessageConnectionHub = websocket.app.state.message_hub
    queue = await hub.subscribe(user_id)
    try:
        if since is not None:
            since_at, since_id = since
            async with websocket.app.state.session_factory() as db:
                records = list(
                    (
                        await db.scalars(
                            select(MessageEvent)
                            .where(
                                MessageEvent.user_id == user_id,
                                or_(
                                    MessageEvent.created_at > since_at,
                                    and_(
                                        MessageEvent.created_at == since_at,
                                        MessageEvent.id > since_id,
                                    ),
                                ),
                            )
                            .order_by(MessageEvent.created_at.asc(), MessageEvent.id.asc())
                            .limit(500)
                        )
                    ).all()
                )
                for record in records:
                    event = await event_response(db, settings, record)
                    await websocket.send_json(event.model_dump(mode="json"))
        while True:
            outgoing = asyncio.create_task(queue.get())
            incoming = asyncio.create_task(websocket.receive_text())
            done, pending = await asyncio.wait(
                {outgoing, incoming},
                timeout=25,
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            if not done:
                await websocket.send_json(
                    WebSocketEvent(
                        event="heartbeat",
                        occurred_at=utcnow(),
                    ).model_dump(mode="json")
                )
                continue
            if outgoing in done:
                event = outgoing.result()
                await websocket.send_json(event.model_dump(mode="json"))
            elif incoming in done:
                payload = incoming.result()
                if payload == "ping":
                    await websocket.send_json(
                        WebSocketEvent(
                            event="heartbeat",
                            occurred_at=utcnow(),
                        ).model_dump(mode="json")
                    )
    except (WebSocketDisconnect, RuntimeError):
        return
    finally:
        await hub.unsubscribe(user_id, queue)
