"""Real OBS WebSocket 5.x protocol client and official request wrappers."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import random
import time
import uuid
from collections.abc import Awaitable, Callable
from enum import StrEnum
from typing import Any, Protocol, cast

from websockets.asyncio.client import ClientConnection, connect

from .events import EventBus

LOGGER = logging.getLogger(__name__)


class OBSState(StrEnum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    IDENTIFIED = "identified"


class OBSConnectionError(RuntimeError):
    """OBS is unavailable or violated the negotiated protocol."""


class OBSRequestError(RuntimeError):
    """Official OBS request failure preserving protocol status."""

    def __init__(self, request_type: str, code: int, comment: str) -> None:
        self.request_type = request_type
        self.code = code
        self.comment = comment
        super().__init__(f"{request_type} failed ({code}): {comment}")


class OBSTransport(Protocol):
    async def send(self, message: dict[str, Any]) -> None: ...

    async def recv(self) -> dict[str, Any]: ...

    async def close(self) -> None: ...


class WebSocketOBSTransport:
    """JSON transport backed by the production websockets client."""

    def __init__(self, connection: ClientConnection) -> None:
        self._connection = connection

    @classmethod
    async def open(cls, url: str) -> WebSocketOBSTransport:
        connection = await connect(
            url,
            open_timeout=8,
            close_timeout=5,
            ping_interval=20,
            ping_timeout=20,
            max_size=8 * 1024 * 1024,
            max_queue=32,
            compression=None,
        )
        return cls(connection)

    async def send(self, message: dict[str, Any]) -> None:
        await self._connection.send(json.dumps(message, separators=(",", ":")))

    async def recv(self) -> dict[str, Any]:
        raw = await self._connection.recv()
        if not isinstance(raw, str):
            raise OBSConnectionError("OBS sent a non-text WebSocket message")
        decoded = json.loads(raw)
        if not isinstance(decoded, dict):
            raise OBSConnectionError("OBS message must be an object")
        return cast(dict[str, Any], decoded)

    async def close(self) -> None:
        await self._connection.close(code=1000, reason="companion shutdown")


def calculate_obs_auth(password: str, salt: str, challenge: str) -> str:
    """Calculate the OBS WebSocket 5.x Hello authentication response exactly."""

    secret_digest = hashlib.sha256((password + salt).encode()).digest()
    secret = base64.b64encode(secret_digest).decode()
    auth_digest = hashlib.sha256((secret + challenge).encode()).digest()
    return base64.b64encode(auth_digest).decode()


TransportFactory = Callable[[], Awaitable[OBSTransport]]


class OBSClient:
    """Connection manager, request correlator, and typed official request surface."""

    def __init__(
        self,
        transport_factory: TransportFactory,
        password: str,
        events: EventBus,
        *,
        request_timeout: float = 8,
        pending_limit: int = 128,
        event_subscriptions: int = 0xFFFFFFFF,
        reconnect_base: float = 0.5,
        reconnect_cap: float = 30,
        random_source: Callable[[], float] = random.random,
    ) -> None:
        self._transport_factory = transport_factory
        self._password = password
        self._events = events
        self._request_timeout = request_timeout
        self._pending_limit = pending_limit
        self._event_subscriptions = event_subscriptions
        self._reconnect_base = reconnect_base
        self._reconnect_cap = reconnect_cap
        self._random = random_source
        self._transport: OBSTransport | None = None
        self._pending: dict[str, asyncio.Future[dict[str, Any]]] = {}
        self._pending_lock = asyncio.Lock()
        self._send_lock = asyncio.Lock()
        self._stop = asyncio.Event()
        self._connected = asyncio.Event()
        self._manager_task: asyncio.Task[None] | None = None
        self._state = OBSState.DISCONNECTED
        self._last_message_at: float | None = None

    @classmethod
    def production(
        cls,
        url: str,
        password: str,
        events: EventBus,
        **kwargs: Any,
    ) -> OBSClient:
        async def factory() -> OBSTransport:
            return await WebSocketOBSTransport.open(url)

        return cls(factory, password, events, **kwargs)

    @property
    def state(self) -> OBSState:
        return self._state

    @property
    def connected(self) -> bool:
        return self._state is OBSState.IDENTIFIED and self._connected.is_set()

    @property
    def healthy(self) -> bool:
        return self.connected and self._manager_task is not None and not self._manager_task.done()

    @property
    def last_message_at(self) -> float | None:
        return self._last_message_at

    def start(self) -> None:
        if self._manager_task is not None and not self._manager_task.done():
            return
        self._stop.clear()
        self._manager_task = asyncio.create_task(self._run(), name="obs-connection-manager")

    async def stop(self) -> None:
        self._stop.set()
        transport = self._transport
        if transport is not None:
            await transport.close()
        if self._manager_task is not None:
            await asyncio.gather(self._manager_task, return_exceptions=True)
        await self._fail_pending(OBSConnectionError("OBS client stopped"))
        self._manager_task = None
        self._state = OBSState.DISCONNECTED
        self._connected.clear()

    async def wait_connected(self, wait_seconds: float = 5) -> None:
        async with asyncio.timeout(wait_seconds):
            await self._connected.wait()

    async def _run(self) -> None:
        attempt = 0
        while not self._stop.is_set():
            self._state = OBSState.CONNECTING
            try:
                transport = await self._transport_factory()
                self._transport = transport
                await self._identify(transport)
                self._state = OBSState.IDENTIFIED
                self._connected.set()
                attempt = 0
                await self._read_messages(transport)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if not self._stop.is_set():
                    LOGGER.warning(
                        "OBS connection lost",
                        extra={"fields": {"error_type": type(exc).__name__, "attempt": attempt}},
                    )
            finally:
                self._state = OBSState.DISCONNECTED
                self._connected.clear()
                current = self._transport
                self._transport = None
                if current is not None:
                    try:
                        await current.close()
                    except Exception:
                        LOGGER.debug("OBS transport close failed", exc_info=True)
                await self._fail_pending(OBSConnectionError("OBS connection lost"))
            if self._stop.is_set():
                break
            delay = min(
                self._reconnect_cap,
                self._reconnect_base * (2 ** min(attempt, 16)),
            )
            delay *= 0.5 + self._random()
            attempt += 1
            try:
                await asyncio.wait_for(self._stop.wait(), timeout=delay)
            except TimeoutError:
                continue

    async def _identify(self, transport: OBSTransport) -> None:
        hello = await asyncio.wait_for(transport.recv(), timeout=self._request_timeout)
        self._last_message_at = time.monotonic()
        if hello.get("op") != 0 or not isinstance(hello.get("d"), dict):
            raise OBSConnectionError("expected OBS Hello opcode")
        hello_data = hello["d"]
        rpc_version = hello_data.get("rpcVersion")
        if not isinstance(rpc_version, int) or rpc_version < 1:
            raise OBSConnectionError("OBS does not support RPC version 1")
        identify_data: dict[str, Any] = {
            "rpcVersion": 1,
            "eventSubscriptions": self._event_subscriptions,
        }
        authentication = hello_data.get("authentication")
        if authentication is not None:
            if not isinstance(authentication, dict):
                raise OBSConnectionError("invalid OBS authentication challenge")
            challenge = authentication.get("challenge")
            salt = authentication.get("salt")
            if not isinstance(challenge, str) or not isinstance(salt, str):
                raise OBSConnectionError("invalid OBS authentication challenge")
            identify_data["authentication"] = calculate_obs_auth(
                self._password, salt, challenge
            )
        await transport.send({"op": 1, "d": identify_data})
        identified = await asyncio.wait_for(transport.recv(), timeout=self._request_timeout)
        self._last_message_at = time.monotonic()
        if identified.get("op") != 2:
            raise OBSConnectionError("OBS identification failed")

    async def _read_messages(self, transport: OBSTransport) -> None:
        while not self._stop.is_set():
            message = await transport.recv()
            self._last_message_at = time.monotonic()
            opcode = message.get("op")
            data = message.get("d")
            if not isinstance(data, dict):
                continue
            if opcode == 7:
                request_id = data.get("requestId")
                if isinstance(request_id, str):
                    async with self._pending_lock:
                        future = self._pending.get(request_id)
                    if future is not None and not future.done():
                        future.set_result(data)
            elif opcode == 5:
                event_type = data.get("eventType")
                event_data = data.get("eventData", {})
                if isinstance(event_type, str) and isinstance(event_data, dict):
                    await self._events.publish(f"obs.{event_type}", event_data)

    async def _fail_pending(self, error: Exception) -> None:
        async with self._pending_lock:
            pending = list(self._pending.values())
            self._pending.clear()
        for future in pending:
            if not future.done():
                future.set_exception(error)

    async def request(
        self, request_type: str, request_data: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        transport = self._transport
        if not self.connected or transport is None:
            raise OBSConnectionError("OBS is not connected")
        request_id = str(uuid.uuid4())
        future: asyncio.Future[dict[str, Any]] = asyncio.get_running_loop().create_future()
        async with self._pending_lock:
            if len(self._pending) >= self._pending_limit:
                raise OBSConnectionError("OBS pending request limit reached")
            self._pending[request_id] = future
        payload: dict[str, Any] = {
            "requestType": request_type,
            "requestId": request_id,
        }
        if request_data is not None:
            payload["requestData"] = request_data
        try:
            async with self._send_lock:
                await transport.send({"op": 6, "d": payload})
            response = await asyncio.wait_for(future, timeout=self._request_timeout)
        except TimeoutError as exc:
            raise OBSConnectionError(f"OBS request {request_type} timed out") from exc
        finally:
            async with self._pending_lock:
                self._pending.pop(request_id, None)
        status_data = response.get("requestStatus")
        if not isinstance(status_data, dict):
            raise OBSConnectionError("OBS response omitted requestStatus")
        if status_data.get("result") is not True:
            code = status_data.get("code", 0)
            comment = status_data.get("comment", "OBS request rejected")
            raise OBSRequestError(
                request_type,
                code if isinstance(code, int) else 0,
                comment if isinstance(comment, str) else "OBS request rejected",
            )
        response_data = response.get("responseData", {})
        if not isinstance(response_data, dict):
            raise OBSConnectionError("OBS responseData must be an object")
        return response_data

    async def get_version(self) -> dict[str, Any]:
        return await self.request("GetVersion")

    async def get_status(self) -> dict[str, Any]:
        stream = await self.request("GetStreamStatus")
        record = await self.request("GetRecordStatus")
        virtual_camera = await self.request("GetVirtualCamStatus")
        return {"stream": stream, "record": record, "virtualCamera": virtual_camera}

    async def get_scene_list(self) -> dict[str, Any]:
        return await self.request("GetSceneList")

    async def get_current_scene(self) -> dict[str, Any]:
        return await self.request("GetCurrentProgramScene")

    async def set_current_scene(self, scene_name: str) -> dict[str, Any]:
        return await self.request("SetCurrentProgramScene", {"sceneName": scene_name})

    async def get_scene_items(self, scene_name: str) -> dict[str, Any]:
        return await self.request("GetSceneItemList", {"sceneName": scene_name})

    async def set_scene_item_enabled(
        self, scene_name: str, scene_item_id: int, enabled: bool
    ) -> dict[str, Any]:
        return await self.request(
            "SetSceneItemEnabled",
            {
                "sceneName": scene_name,
                "sceneItemId": scene_item_id,
                "sceneItemEnabled": enabled,
            },
        )

    async def get_input_mute(self, input_name: str) -> dict[str, Any]:
        return await self.request("GetInputMute", {"inputName": input_name})

    async def set_input_mute(self, input_name: str, muted: bool) -> dict[str, Any]:
        return await self.request("SetInputMute", {"inputName": input_name, "inputMuted": muted})

    async def get_input_volume(self, input_name: str) -> dict[str, Any]:
        return await self.request("GetInputVolume", {"inputName": input_name})

    async def set_input_volume(
        self, input_name: str, *, multiplier: float | None = None, decibels: float | None = None
    ) -> dict[str, Any]:
        data: dict[str, Any] = {"inputName": input_name}
        if multiplier is not None:
            data["inputVolumeMul"] = multiplier
        elif decibels is not None:
            data["inputVolumeDb"] = decibels
        else:
            raise ValueError("one volume representation is required")
        return await self.request("SetInputVolume", data)

    async def start_stream(self) -> dict[str, Any]:
        return await self.request("StartStream")

    async def stop_stream(self) -> dict[str, Any]:
        return await self.request("StopStream")

    async def start_record(self) -> dict[str, Any]:
        return await self.request("StartRecord")

    async def stop_record(self) -> dict[str, Any]:
        return await self.request("StopRecord")

    async def start_virtual_camera(self) -> dict[str, Any]:
        return await self.request("StartVirtualCam")

    async def stop_virtual_camera(self) -> dict[str, Any]:
        return await self.request("StopVirtualCam")

    async def take_screenshot(
        self,
        source_name: str,
        image_format: str,
        width: int | None = None,
        height: int | None = None,
        quality: int | None = None,
    ) -> dict[str, Any]:
        data = self._screenshot_data(source_name, image_format, width, height, quality)
        return await self.request("GetSourceScreenshot", data)

    async def save_screenshot(
        self,
        source_name: str,
        image_format: str,
        file_path: str,
        width: int | None = None,
        height: int | None = None,
        quality: int | None = None,
    ) -> dict[str, Any]:
        data = self._screenshot_data(source_name, image_format, width, height, quality)
        data["imageFilePath"] = file_path
        return await self.request("SaveSourceScreenshot", data)

    @staticmethod
    def _screenshot_data(
        source_name: str,
        image_format: str,
        width: int | None,
        height: int | None,
        quality: int | None,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "sourceName": source_name,
            "imageFormat": image_format,
        }
        if width is not None:
            data["imageWidth"] = width
        if height is not None:
            data["imageHeight"] = height
        if quality is not None:
            data["imageCompressionQuality"] = quality
        return data
