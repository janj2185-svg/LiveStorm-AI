import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from platform_api.core.security import decode_access_token
from platform_api.infrastructure.redis import get_redis, subscribe_notifications

router = APIRouter(tags=["realtime"])


@router.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket, token: str) -> None:
    try:
        payload = decode_access_token(token)
        user_id = str(UUID(payload["sub"]))
    except (ValueError, KeyError):
        await websocket.close(code=4401)
        return

    await websocket.accept()
    redis_client = get_redis()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe("sylora:notifications")

    async def relay() -> None:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                data = json.loads(message["data"])
                if data.get("user_id") == user_id:
                    await websocket.send_json(data["payload"])
            await asyncio.sleep(0.05)

    task = asyncio.create_task(relay())
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        task.cancel()
        await pubsub.unsubscribe("sylora:notifications")
        await pubsub.close()
