"""Outbound-only SYLORA pairing, cloud socket, and gated command dispatch."""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
from collections.abc import Awaitable, Callable
from enum import StrEnum
from typing import Any, Protocol, cast

import httpx
from pydantic import ValidationError
from websockets.asyncio.client import ClientConnection, connect

from .events import EventBus
from .models import (
    CloudCommand,
    InputMuteMutation,
    InputVolumeMutation,
    PairingResponse,
    SceneItemMutation,
    SceneName,
)
from .obs import OBSClient, OBSRequestError
from .policies import CapabilityDenied, CommandPolicy, ConfirmationDenied
from .security import SecretStore, SignedMessageVerifier

LOGGER = logging.getLogger(__name__)


class CloudState(StrEnum):
    UNPAIRED = "unpaired"
    DISCONNECTED = "disconnected"
    CONNECTED = "connected"


class CloudTransport(Protocol):
    async def send(self, message: dict[str, Any]) -> None: ...

    async def recv(self) -> dict[str, Any]: ...

    async def close(self) -> None: ...


class WebSocketCloudTransport:
    def __init__(self, connection: ClientConnection) -> None:
        self._connection = connection

    @classmethod
    async def open(cls, url: str, credential: str) -> WebSocketCloudTransport:
        connection = await connect(
            url,
            additional_headers={"Authorization": f"Bearer {credential}"},
            open_timeout=10,
            close_timeout=5,
            ping_interval=20,
            ping_timeout=20,
            max_size=1024 * 1024,
            max_queue=32,
            compression=None,
        )
        return cls(connection)

    async def send(self, message: dict[str, Any]) -> None:
        await self._connection.send(json.dumps(message, separators=(",", ":")))

    async def recv(self) -> dict[str, Any]:
        raw = await self._connection.recv()
        if not isinstance(raw, str):
            raise RuntimeError("cloud sent a non-text message")
        message = json.loads(raw)
        if not isinstance(message, dict):
            raise RuntimeError("cloud message must be an object")
        return cast(dict[str, Any], message)

    async def close(self) -> None:
        await self._connection.close(code=1000, reason="companion shutdown")


class OBSCommandDispatcher:
    """Map approved cloud actions to a fixed set of official wrappers."""

    def __init__(self, obs: OBSClient, policy: CommandPolicy) -> None:
        self._obs = obs
        self._policy = policy

    async def execute(self, action: str, arguments: dict[str, Any]) -> dict[str, Any]:
        await self._policy.authorize(action, arguments)
        if action == "scene.switch":
            scene = SceneName.model_validate(arguments)
            return await self._obs.set_current_scene(scene.scene_name)
        if action == "scene_item.enable":
            item = SceneItemMutation.model_validate(arguments)
            return await self._obs.set_scene_item_enabled(
                item.scene_name, item.scene_item_id, item.enabled
            )
        if action == "input.mute":
            mute = InputMuteMutation.model_validate(arguments)
            return await self._obs.set_input_mute(mute.input_name, mute.muted)
        if action == "input.volume":
            volume = InputVolumeMutation.model_validate(arguments)
            return await self._obs.set_input_volume(
                volume.input_name,
                multiplier=volume.multiplier,
                decibels=volume.decibels,
            )
        no_argument_actions: dict[str, Callable[[], Awaitable[dict[str, Any]]]] = {
            "stream.start": self._obs.start_stream,
            "stream.stop": self._obs.stop_stream,
            "record.start": self._obs.start_record,
            "record.stop": self._obs.stop_record,
            "virtual_camera.start": self._obs.start_virtual_camera,
            "virtual_camera.stop": self._obs.stop_virtual_camera,
        }
        operation = no_argument_actions.get(action)
        if operation is None:
            raise CapabilityDenied(f"unsupported cloud action: {action}")
        if arguments:
            raise ValueError(f"{action} accepts no arguments")
        return await operation()


CloudTransportFactory = Callable[[str, str], Awaitable[CloudTransport]]


class CloudClient:
    """Maintain a single outbound WSS connection; no inbound listener is created."""

    def __init__(
        self,
        api_url: str | None,
        ws_url: str | None,
        secrets_store: SecretStore,
        events: EventBus,
        obs: OBSClient,
        dispatcher: OBSCommandDispatcher,
        transport_factory: CloudTransportFactory | None = None,
    ) -> None:
        self._api_url = api_url
        self._ws_url = ws_url
        self._store = secrets_store
        self._events = events
        self._obs = obs
        self._dispatcher = dispatcher
        self._factory = transport_factory or self._production_factory
        self._state = CloudState.UNPAIRED
        self._manager: asyncio.Task[None] | None = None
        self._event_task: asyncio.Task[None] | None = None
        self._transport: CloudTransport | None = None
        self._outgoing: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=256)
        self._stop = asyncio.Event()
        self._verifier: SignedMessageVerifier | None = None

    @staticmethod
    async def _production_factory(url: str, credential: str) -> CloudTransport:
        return await WebSocketCloudTransport.open(url, credential)

    @property
    def state(self) -> CloudState:
        return self._state

    @property
    def paired(self) -> bool:
        return self._load_pairing() is not None and self._ws_url is not None

    async def pair(self, pairing_token: str) -> str:
        if not self._api_url or not self._ws_url:
            raise RuntimeError("cloud API and WSS URLs must be configured before pairing")
        if not pairing_token:
            raise ValueError("pairing token is required")
        async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
            response = await client.post(
                f"{self._api_url}/v1/companions/pair",
                json={"pairingToken": pairing_token},
            )
            response.raise_for_status()
        pairing = PairingResponse.model_validate(response.json())
        self._save_pairing(pairing.device_id, pairing.credential)
        self._verifier = SignedMessageVerifier(pairing.credential)
        self._state = CloudState.DISCONNECTED
        return pairing.device_id

    def start(self) -> None:
        if self._manager is not None and not self._manager.done():
            return
        if not self.paired:
            self._state = CloudState.UNPAIRED
            return
        self._stop.clear()
        self._manager = asyncio.create_task(self._run(), name="cloud-connection-manager")
        self._event_task = asyncio.create_task(self._forward_events(), name="cloud-event-forwarder")

    async def stop(self) -> None:
        self._stop.set()
        if self._transport is not None:
            await self._transport.close()
        tasks = [task for task in (self._manager, self._event_task) if task is not None]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        self._manager = None
        self._event_task = None
        self._transport = None
        self._state = CloudState.DISCONNECTED if self.paired else CloudState.UNPAIRED

    async def _run(self) -> None:
        attempt = 0
        while not self._stop.is_set():
            pairing = self._load_pairing()
            if pairing is None or self._ws_url is None:
                self._state = CloudState.UNPAIRED
                return
            _, credential = pairing
            self._verifier = SignedMessageVerifier(credential)
            try:
                transport = await self._factory(self._ws_url, credential)
                self._transport = transport
                self._state = CloudState.CONNECTED
                attempt = 0
                await self._serve_connection(transport)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if not self._stop.is_set():
                    LOGGER.warning(
                        "cloud connection lost",
                        extra={"fields": {"error_type": type(exc).__name__, "attempt": attempt}},
                    )
            finally:
                self._state = CloudState.DISCONNECTED
                current = self._transport
                self._transport = None
                if current is not None:
                    try:
                        await current.close()
                    except Exception:
                        LOGGER.debug("cloud transport close failed", exc_info=True)
            if self._stop.is_set():
                return
            delay = min(30.0, 0.5 * (2 ** min(attempt, 16)))
            attempt += 1
            try:
                await asyncio.wait_for(self._stop.wait(), delay)
            except TimeoutError:
                continue

    async def _serve_connection(self, transport: CloudTransport) -> None:
        await transport.send(
            {
                "type": "status",
                "timestamp": int(time.time()),
                "obsConnected": self._obs.connected,
            }
        )
        reader = asyncio.create_task(self._read_commands(transport))
        writer = asyncio.create_task(self._write_outgoing(transport))
        done, pending = await asyncio.wait(
            {reader, writer}, return_when=asyncio.FIRST_EXCEPTION
        )
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        for task in done:
            exception = task.exception()
            if exception is not None:
                raise exception

    async def _read_commands(self, transport: CloudTransport) -> None:
        while not self._stop.is_set():
            raw = await transport.recv()
            await self._handle_message(raw)

    async def _handle_message(self, raw: dict[str, Any]) -> None:
        verifier = self._verifier
        if verifier is None or not verifier.verify(raw):
            LOGGER.warning("rejected unsigned, stale, or replayed cloud message")
            return
        if raw.get("type") == "credential.rotate":
            new_credential = raw.get("credential")
            pairing = self._load_pairing()
            if not isinstance(new_credential, str) or len(new_credential) < 32 or pairing is None:
                return
            self._save_pairing(pairing[0], new_credential)
            self._verifier = SignedMessageVerifier(new_credential)
            if self._transport is not None:
                await self._transport.close()
            return
        try:
            command = CloudCommand.model_validate(raw)
            result = await self._dispatcher.execute(command.action, command.arguments)
            await self._queue_signed(
                {
                    "type": "command.result",
                    "commandId": command.command_id,
                    "ok": True,
                    "result": result,
                }
            )
        except (ValidationError, CapabilityDenied, ConfirmationDenied, ValueError) as exc:
            command_id = raw.get("commandId")
            await self._queue_signed(
                {
                    "type": "command.result",
                    "commandId": command_id if isinstance(command_id, str) else "",
                    "ok": False,
                    "error": type(exc).__name__,
                }
            )
        except OBSRequestError as exc:
            command_id = raw.get("commandId")
            await self._queue_signed(
                {
                    "type": "command.result",
                    "commandId": command_id if isinstance(command_id, str) else "",
                    "ok": False,
                    "error": type(exc).__name__,
                    "requestType": exc.request_type,
                    "obsCode": exc.code,
                    "obsComment": exc.comment,
                }
            )
        except Exception as exc:
            command_id = raw.get("commandId")
            LOGGER.warning(
                "cloud OBS command failed",
                extra={"fields": {"error_type": type(exc).__name__}},
            )
            await self._queue_signed(
                {
                    "type": "command.result",
                    "commandId": command_id if isinstance(command_id, str) else "",
                    "ok": False,
                    "error": type(exc).__name__,
                }
            )

    async def _queue_signed(self, message: dict[str, Any]) -> None:
        pairing = self._load_pairing()
        if pairing is None:
            return
        signed = {
            **message,
            "timestamp": int(time.time()),
            "nonce": secrets.token_urlsafe(18),
        }
        signed["signature"] = SignedMessageVerifier(pairing[1]).sign(signed)
        if self._outgoing.full():
            self._outgoing.get_nowait()
        self._outgoing.put_nowait(signed)

    async def _write_outgoing(self, transport: CloudTransport) -> None:
        while not self._stop.is_set():
            try:
                async with asyncio.timeout(30):
                    message = await self._outgoing.get()
            except TimeoutError:
                message = {
                    "type": "status",
                    "timestamp": int(time.time()),
                    "obsConnected": self._obs.connected,
                }
            await transport.send(message)

    async def _forward_events(self) -> None:
        queue = await self._events.subscribe()
        try:
            while not self._stop.is_set():
                event = await queue.get()
                await self._queue_signed({"type": "event", "event": event.as_dict()})
        finally:
            await self._events.unsubscribe(queue)

    def _load_pairing(self) -> tuple[str, str] | None:
        raw = self._store.get("cloud-pairing")
        if not raw:
            return None
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            return None
        device_id = payload.get("device_id")
        credential = payload.get("credential")
        if not isinstance(device_id, str) or not isinstance(credential, str):
            return None
        return device_id, credential

    def _save_pairing(self, device_id: str, credential: str) -> None:
        self._store.set(
            "cloud-pairing",
            json.dumps(
                {"device_id": device_id, "credential": credential},
                separators=(",", ":"),
            ),
        )
