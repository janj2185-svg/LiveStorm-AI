from __future__ import annotations

import uuid
from collections.abc import Mapping, Sequence
from typing import Any

import pytest

from app.live_adapters import (
    AdapterActionResult,
    AdapterConnectionContext,
    AdapterConnectionResult,
    BasePlatformAdapter,
    PlatformDescriptor,
)
from app.live_models import IntegrationPlatform, LiveCapability
from tests.test_ai_live_hub import creator_headers


class StudioObsAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.obs
    potential_capabilities = frozenset(
        {
            LiveCapability.obs_scene,
            LiveCapability.record_control,
            LiveCapability.stream_control,
        }
    )

    def __init__(self) -> None:
        self.scenes = ["Main", "Intermission", "Q&A"]
        self.current_scene = "Main"
        self.recording = False

    def descriptor(self) -> PlatformDescriptor:
        return PlatformDescriptor(
            platform=self.platform,
            available=True,
            status="test_obs_adapter",
            potential_capabilities=self.potential_capabilities,
        )

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        requested = {
            LiveCapability(value)
            for value in context.safe_configuration.get("requested_capabilities", [])
            if value in LiveCapability._value2member_map_
        }
        return AdapterConnectionResult(
            verified_capabilities=frozenset(requested & self.potential_capabilities),
            provider_metadata={"obs_websocket_version": "5.0.0"},
        )

    async def health(self, context: AdapterConnectionContext):
        result = await self.connect(context)
        from app.live_adapters import AdapterHealth

        return AdapterHealth(
            ok=True,
            status="connected",
            verified_capabilities=result.verified_capabilities,
        )

    async def create_broadcast(
        self,
        context: AdapterConnectionContext,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        return AdapterActionResult(provider_reference=str(uuid.uuid4()))

    async def list_scenes(self, context: AdapterConnectionContext) -> tuple[list[str], str | None]:
        return list(self.scenes), self.current_scene

    async def set_current_scene(
        self, context: AdapterConnectionContext, scene_name: str
    ) -> AdapterActionResult:
        self.current_scene = scene_name
        if scene_name not in self.scenes:
            self.scenes.append(scene_name)
        return AdapterActionResult(provider_reference=scene_name)

    async def set_recording(
        self, context: AdapterConnectionContext, *, active: bool
    ) -> Mapping[str, Any]:
        self.recording = active
        return {"outputActive": self.recording, "outputPath": "/recordings/session.mkv"}


class StudioMediaAdapter(BasePlatformAdapter):
    platform = IntegrationPlatform.rtmp_webrtc
    potential_capabilities = frozenset({LiveCapability.publish, LiveCapability.first_party_ingest})

    async def connect(self, context: AdapterConnectionContext) -> AdapterConnectionResult:
        return AdapterConnectionResult(verified_capabilities=self.potential_capabilities)

    async def health(self, context: AdapterConnectionContext):
        from app.live_adapters import AdapterHealth

        return AdapterHealth(
            ok=True,
            status="connected",
            verified_capabilities=self.potential_capabilities,
        )

    async def create_broadcast(
        self,
        context: AdapterConnectionContext,
        configuration: Mapping[str, Any],
    ) -> AdapterActionResult:
        return AdapterActionResult(provider_reference=str(configuration["ingest_path"]))


class StudioRegistry:
    def __init__(self, adapters: Sequence[BasePlatformAdapter]) -> None:
        self.adapters = {adapter.platform: adapter for adapter in adapters}

    def resolve(self, platform: IntegrationPlatform) -> BasePlatformAdapter:
        return self.adapters[platform]

    def descriptors(self) -> tuple[PlatformDescriptor, ...]:
        return tuple(adapter.descriptor() for adapter in self.adapters.values())


async def _session_with_obs_destination(api: Any, headers: dict[str, str]) -> str:
    connection = await api.client.post(
        "/v1/live/integrations/connect",
        headers=headers,
        json={
            "platform": "obs",
            "endpoint_url": "ws://localhost:4455",
            "connection_secret": "obs-secret",
            "requested_capabilities": [
                "obs_scene",
                "record_control",
                "stream_control",
            ],
        },
    )
    assert connection.status_code == 201, connection.text
    created = await api.client.post(
        "/v1/live/sessions",
        headers=headers,
        json={
            "title": "Creator Studio OBS",
            "destinations": [
                {
                    "connection_id": connection.json()["id"],
                    "publish_enabled": True,
                }
            ],
        },
    )
    assert created.status_code == 201, created.text
    return str(created.json()["id"])


@pytest.mark.asyncio
async def test_creator_studio_obs_scenes_and_record_controls(api_factory: Any) -> None:
    adapter = StudioObsAdapter()
    async with api_factory(
        live_adapter_registry=StudioRegistry([adapter, StudioMediaAdapter()])
    ) as api:
        headers, _ = await creator_headers(api)
        session_id = await _session_with_obs_destination(api, headers)

        scenes = await api.client.get(
            f"/v1/live/sessions/{session_id}/obs/scenes",
            headers=headers,
        )
        assert scenes.status_code == 200, scenes.text
        assert scenes.json()["current_scene"] == "Main"
        assert [item["name"] for item in scenes.json()["scenes"]] == adapter.scenes

        selected = await api.client.post(
            f"/v1/live/sessions/{session_id}/obs/scenes/select",
            headers=headers,
            json={"scene_name": "Intermission"},
        )
        assert selected.status_code == 200, selected.text
        assert selected.json()["current_scene"] == "Intermission"

        started = await api.client.post(
            f"/v1/live/sessions/{session_id}/obs/record/start",
            headers=headers,
        )
        assert started.status_code == 200, started.text
        assert started.json()["active"] is True
        assert started.json()["output_path"] == "/recordings/session.mkv"

        stopped = await api.client.post(
            f"/v1/live/sessions/{session_id}/obs/record/stop",
            headers=headers,
        )
        assert stopped.status_code == 200, stopped.text
        assert stopped.json()["active"] is False


@pytest.mark.asyncio
async def test_creator_studio_obs_routes_are_honest_without_destination(
    api_factory: Any,
) -> None:
    adapter = StudioObsAdapter()
    async with api_factory(
        live_adapter_registry=StudioRegistry([adapter, StudioMediaAdapter()])
    ) as api:
        headers, _ = await creator_headers(api)
        created = await api.client.post(
            "/v1/live/sessions",
            headers=headers,
            json={"title": "No OBS"},
        )
        assert created.status_code == 201, created.text
        session_id = created.json()["id"]

        scenes = await api.client.get(
            f"/v1/live/sessions/{session_id}/obs/scenes",
            headers=headers,
        )
        assert scenes.status_code == 409
        assert scenes.json()["code"] == "live_obs_destination_unavailable"
