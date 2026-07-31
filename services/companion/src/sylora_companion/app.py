"""FastAPI application exposing the authenticated local OBS control plane."""

from __future__ import annotations

import asyncio
import ipaddress
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import unquote

from fastapi import FastAPI, HTTPException, Query, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram
from prometheus_client.exposition import generate_latest
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from . import __version__
from .cloud import CloudClient, CloudTransportFactory, OBSCommandDispatcher
from .config import Settings
from .events import EventBus
from .models import (
    ConfirmationDecision,
    EnabledMutation,
    MuteMutation,
    SaveScreenshotRequest,
    SceneName,
    ScreenshotRequest,
    VolumeMutation,
)
from .obs import OBSClient, OBSConnectionError, OBSRequestError
from .policies import CommandPolicy, ConfirmationManager
from .runtime import WatchdogHeartbeat
from .security import (
    BoundaryMiddleware,
    LocalAuthenticationMiddleware,
    LocalTokenManager,
    RateLimitMiddleware,
    SecretStore,
)
from .updater import SignedUpdater, UpdateRejected


class Metrics:
    def __init__(self) -> None:
        self.registry = CollectorRegistry(auto_describe=True)
        self.requests = Counter(
            "sylora_companion_http_requests_total",
            "Local HTTP requests",
            ("method", "route", "status"),
            registry=self.registry,
        )
        self.duration = Histogram(
            "sylora_companion_http_request_duration_seconds",
            "Local HTTP request duration",
            ("method", "route"),
            registry=self.registry,
        )
        self.obs_connected = Gauge(
            "sylora_companion_obs_connected",
            "Whether OBS is identified",
            registry=self.registry,
        )
        self.cloud_connected = Gauge(
            "sylora_companion_cloud_connected",
            "Whether the outbound cloud socket is connected",
            registry=self.registry,
        )


class MetricsMiddleware:
    def __init__(self, app: ASGIApp, metrics: Metrics) -> None:
        self.app = app
        self._metrics = metrics

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = time.monotonic()
        status_code = 500

        async def capture_send(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, capture_send)
        finally:
            route = scope.get("route")
            route_path = getattr(route, "path", scope.get("path", "unknown"))
            method = scope.get("method", "unknown")
            self._metrics.requests.labels(method, route_path, str(status_code)).inc()
            self._metrics.duration.labels(method, route_path).observe(
                time.monotonic() - started
            )


def create_app(
    settings: Settings | None = None,
    *,
    obs: OBSClient | None = None,
    secret_store: SecretStore | None = None,
    cloud_transport_factory: CloudTransportFactory | None = None,
) -> FastAPI:
    """Build an app; injectable transports are intended for tests only."""

    configured = settings or Settings.from_env()
    store = secret_store or SecretStore(configured.state_dir)
    tokens = LocalTokenManager(store)
    events = EventBus()
    obs_client = obs or OBSClient.production(
        configured.obs_ws_url,
        configured.obs_password,
        events,
        request_timeout=configured.obs_request_timeout,
        pending_limit=configured.obs_pending_limit,
        event_subscriptions=configured.obs_event_subscriptions,
    )
    confirmations = ConfirmationManager(events)
    policy = CommandPolicy(
        configured.cloud_capabilities,
        configured.confirmation_actions,
        confirmations,
        configured.confirmation_timeout,
    )
    dispatcher = OBSCommandDispatcher(obs_client, policy)
    cloud = CloudClient(
        configured.cloud_api_url,
        configured.cloud_ws_url,
        store,
        events,
        obs_client,
        dispatcher,
        cloud_transport_factory,
    )
    watchdog = WatchdogHeartbeat(configured.state_dir)
    metrics = Metrics()

    async def is_streaming() -> bool:
        try:
            status_data = await obs_client.request("GetStreamStatus")
        except OBSConnectionError as exc:
            raise UpdateRejected("cannot safely stage update while OBS is unavailable") from exc
        return status_data.get("outputActive") is True

    updater = SignedUpdater(
        configured.update_manifest_url,
        configured.update_public_key,
        configured.state_dir,
        is_streaming,
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        tokens.load_or_create()
        obs_client.start()
        cloud.start()
        watchdog.start()
        try:
            yield
        finally:
            await cloud.stop()
            await obs_client.stop()
            await watchdog.stop()

    app = FastAPI(
        title="SYLORA Companion",
        version=__version__,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.settings = configured
    app.state.tokens = tokens
    app.state.events = events
    app.state.obs = obs_client
    app.state.cloud = cloud
    app.state.confirmations = confirmations
    app.state.updater = updater

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[configured.cors_origin],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )
    app.add_middleware(MetricsMiddleware, metrics=metrics)
    app.add_middleware(LocalAuthenticationMiddleware, tokens=tokens)
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=configured.rate_limit_per_minute,
    )
    app.add_middleware(BoundaryMiddleware, settings=configured)

    @app.exception_handler(OBSRequestError)
    async def obs_request_error(_request: Request, exc: OBSRequestError) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content={
                "detail": "OBS rejected request",
                "requestType": exc.request_type,
                "obsCode": exc.code,
                "obsComment": exc.comment,
            },
        )

    @app.exception_handler(OBSConnectionError)
    async def obs_connection_error(_request: Request, exc: OBSConnectionError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": str(exc)})

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        return {"status": "live"}

    @app.get("/health/ready")
    async def ready() -> JSONResponse:
        if obs_client.connected:
            return JSONResponse({"status": "ready", "obsConnected": True})
        return JSONResponse(
            {"status": "not_ready", "obsConnected": False},
            status_code=503,
        )

    @app.get("/v1/status")
    async def companion_status() -> dict[str, Any]:
        pending = await confirmations.pending()
        return {
            "version": __version__,
            "obs": {"state": obs_client.state, "connected": obs_client.connected},
            "cloud": {"state": cloud.state, "paired": cloud.paired},
            "updater": {"available": updater.available},
            "pendingConfirmations": len(pending),
        }

    @app.get("/metrics")
    async def prometheus_metrics(request: Request) -> Response:
        if request.client is None or not ipaddress.ip_address(request.client.host).is_loopback:
            raise HTTPException(status_code=403, detail="metrics are localhost-only")
        metrics.obs_connected.set(1 if obs_client.connected else 0)
        metrics.cloud_connected.set(1 if cloud.state == "connected" else 0)
        return Response(generate_latest(metrics.registry), media_type=CONTENT_TYPE_LATEST)

    @app.get("/v1/obs/version")
    async def obs_version() -> dict[str, Any]:
        return await obs_client.get_version()

    @app.get("/v1/obs/status")
    async def obs_status() -> dict[str, Any]:
        return await obs_client.get_status()

    @app.get("/v1/obs/scenes")
    async def scene_list() -> dict[str, Any]:
        return await obs_client.get_scene_list()

    @app.get("/v1/obs/scenes/current")
    async def current_scene() -> dict[str, Any]:
        return await obs_client.get_current_scene()

    @app.put("/v1/obs/scenes/current")
    async def switch_scene(body: SceneName) -> dict[str, Any]:
        return await obs_client.set_current_scene(body.scene_name)

    @app.get("/v1/obs/scenes/{scene_name}/items")
    async def scene_items(scene_name: str) -> dict[str, Any]:
        return await obs_client.get_scene_items(unquote(scene_name))

    @app.put("/v1/obs/scenes/{scene_name}/items/{scene_item_id}/enabled")
    async def scene_item_enabled(
        scene_name: str, scene_item_id: int, body: EnabledMutation
    ) -> dict[str, Any]:
        if scene_item_id < 0:
            raise HTTPException(status_code=422, detail="scene item ID must be non-negative")
        return await obs_client.set_scene_item_enabled(
            unquote(scene_name), scene_item_id, body.enabled
        )

    @app.get("/v1/obs/inputs/{input_name}/mute")
    async def input_mute(input_name: str) -> dict[str, Any]:
        return await obs_client.get_input_mute(unquote(input_name))

    @app.put("/v1/obs/inputs/{input_name}/mute")
    async def set_input_mute(input_name: str, body: MuteMutation) -> dict[str, Any]:
        return await obs_client.set_input_mute(unquote(input_name), body.muted)

    @app.get("/v1/obs/inputs/{input_name}/volume")
    async def input_volume(input_name: str) -> dict[str, Any]:
        return await obs_client.get_input_volume(unquote(input_name))

    @app.put("/v1/obs/inputs/{input_name}/volume")
    async def set_input_volume(
        input_name: str, body: VolumeMutation
    ) -> dict[str, Any]:
        return await obs_client.set_input_volume(
            unquote(input_name),
            multiplier=body.multiplier,
            decibels=body.decibels,
        )

    @app.post("/v1/obs/stream/start")
    async def start_stream() -> dict[str, Any]:
        return await obs_client.start_stream()

    @app.post("/v1/obs/stream/stop")
    async def stop_stream() -> dict[str, Any]:
        return await obs_client.stop_stream()

    @app.post("/v1/obs/record/start")
    async def start_record() -> dict[str, Any]:
        return await obs_client.start_record()

    @app.post("/v1/obs/record/stop")
    async def stop_record() -> dict[str, Any]:
        return await obs_client.stop_record()

    @app.post("/v1/obs/virtual-camera/start")
    async def start_virtual_camera() -> dict[str, Any]:
        return await obs_client.start_virtual_camera()

    @app.post("/v1/obs/virtual-camera/stop")
    async def stop_virtual_camera() -> dict[str, Any]:
        return await obs_client.stop_virtual_camera()

    @app.post("/v1/obs/screenshots/take")
    async def take_screenshot(body: ScreenshotRequest) -> dict[str, Any]:
        return await obs_client.take_screenshot(
            body.source_name,
            body.image_format,
            body.width,
            body.height,
            body.quality,
        )

    @app.post("/v1/obs/screenshots/save")
    async def save_screenshot(body: SaveScreenshotRequest) -> dict[str, Any]:
        return await obs_client.save_screenshot(
            body.source_name,
            body.image_format,
            body.file_path,
            body.width,
            body.height,
            body.quality,
        )

    @app.get("/v1/confirmations")
    async def pending_confirmations() -> dict[str, Any]:
        pending = await confirmations.pending()
        return {
            "confirmations": [
                {
                    "confirmationId": item.confirmation_id,
                    "action": item.action,
                    "arguments": item.arguments,
                }
                for item in pending
            ]
        }

    @app.post("/v1/confirmations/{confirmation_id}")
    async def resolve_confirmation(
        confirmation_id: str, body: ConfirmationDecision
    ) -> dict[str, bool]:
        if not await confirmations.resolve(confirmation_id, body.approved):
            raise HTTPException(status_code=404, detail="confirmation not found")
        return {"resolved": True}

    @app.websocket("/v1/events")
    async def event_stream(
        websocket: WebSocket,
        since: int = Query(default=0, ge=0),
    ) -> None:
        await websocket.accept()
        queue = await events.subscribe()
        last_sequence = since
        try:
            replay = await events.replay(since)
            if replay.truncated:
                await websocket.send_json(
                    {
                        "type": "companion.replay_gap",
                        "oldestSequence": replay.oldest_sequence,
                        "latestSequence": replay.latest_sequence,
                    }
                )
            for event in replay.events:
                await websocket.send_json(event.as_dict())
                last_sequence = event.sequence
            while True:
                event = await queue.get()
                if event.sequence > last_sequence:
                    await websocket.send_json(event.as_dict())
                    last_sequence = event.sequence
        except asyncio.CancelledError:
            raise
        except Exception:
            return
        finally:
            await events.unsubscribe(queue)

    return app
