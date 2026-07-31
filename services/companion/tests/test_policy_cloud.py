from __future__ import annotations

import asyncio
import json
import time

import pytest
from conftest import MemorySecretStore, TestCloudTransport, TestOBSTransport

from sylora_companion.cloud import CloudClient, CloudState, OBSCommandDispatcher
from sylora_companion.events import EventBus
from sylora_companion.obs import OBSClient
from sylora_companion.policies import (
    CapabilityDenied,
    CommandPolicy,
    ConfirmationDenied,
    ConfirmationManager,
)
from sylora_companion.security import SignedMessageVerifier


async def connected_obs() -> tuple[OBSClient, TestOBSTransport]:
    transport = TestOBSTransport()

    async def factory() -> TestOBSTransport:
        return transport

    client = OBSClient(factory, "", EventBus(), request_timeout=0.2)
    client.start()
    await client.wait_connected()
    return client, transport


@pytest.mark.asyncio
async def test_capability_allowlist_blocks_before_obs() -> None:
    obs, transport = await connected_obs()
    confirmations = ConfirmationManager(EventBus())
    dispatcher = OBSCommandDispatcher(
        obs,
        CommandPolicy(frozenset(), frozenset(), confirmations, 0.1),
    )
    with pytest.raises(CapabilityDenied):
        await dispatcher.execute("scene.switch", {"sceneName": "Live"})
    assert all(message.get("op") != 6 for message in transport.sent)
    await obs.stop()


@pytest.mark.asyncio
async def test_confirmation_policy_approves_sensitive_action() -> None:
    obs, transport = await connected_obs()
    events = EventBus()
    confirmations = ConfirmationManager(events)
    dispatcher = OBSCommandDispatcher(
        obs,
        CommandPolicy(
            frozenset({"stream.start"}),
            frozenset({"stream.start"}),
            confirmations,
            0.2,
        ),
    )
    command = asyncio.create_task(dispatcher.execute("stream.start", {}))
    pending = []
    for _ in range(20):
        pending = await confirmations.pending()
        if pending:
            break
        await asyncio.sleep(0)
    assert len(pending) == 1
    assert await confirmations.resolve(pending[0].confirmation_id, True)
    assert await command == {}
    assert any(
        message.get("d", {}).get("requestType") == "StartStream"
        for message in transport.sent
    )
    await obs.stop()


@pytest.mark.asyncio
async def test_confirmation_timeout_denies_action() -> None:
    obs, _ = await connected_obs()
    confirmations = ConfirmationManager(EventBus())
    dispatcher = OBSCommandDispatcher(
        obs,
        CommandPolicy(
            frozenset({"record.stop"}),
            frozenset({"record.stop"}),
            confirmations,
            0.001,
        ),
    )
    with pytest.raises(ConfirmationDenied):
        await dispatcher.execute("record.stop", {})
    await obs.stop()


@pytest.mark.asyncio
async def test_signed_cloud_command_uses_outbound_transport_and_rejects_replay() -> None:
    obs, obs_transport = await connected_obs()
    events = EventBus()
    confirmations = ConfirmationManager(events)
    dispatcher = OBSCommandDispatcher(
        obs,
        CommandPolicy(
            frozenset({"scene.switch"}),
            frozenset(),
            confirmations,
            0.1,
        ),
    )
    credential = "c" * 48
    store = MemorySecretStore()
    store.set(
        "cloud-pairing",
        json.dumps({"device_id": "device-1", "credential": credential}),
    )
    cloud_transport = TestCloudTransport()
    factory_calls: list[tuple[str, str]] = []

    async def factory(url: str, supplied_credential: str) -> TestCloudTransport:
        factory_calls.append((url, supplied_credential))
        return cloud_transport

    cloud = CloudClient(
        "https://api.sylora.example",
        "wss://cloud.sylora.example/companion",
        store,  # type: ignore[arg-type]
        events,
        obs,
        dispatcher,
        factory,
    )
    cloud.start()
    for _ in range(50):
        if cloud.state is CloudState.CONNECTED:
            break
        await asyncio.sleep(0.001)
    assert cloud.state is CloudState.CONNECTED
    assert factory_calls == [
        ("wss://cloud.sylora.example/companion", credential)
    ]

    command = {
        "type": "command",
        "commandId": "command-1",
        "action": "scene.switch",
        "arguments": {"sceneName": "Live"},
        "timestamp": int(time.time()),
        "nonce": "nonce-that-is-long-enough",
    }
    command["signature"] = SignedMessageVerifier(credential).sign(command)
    await cloud_transport.incoming.put(command)
    for _ in range(50):
        if any(message.get("type") == "command.result" for message in cloud_transport.sent):
            break
        await asyncio.sleep(0.001)
    results = [
        message for message in cloud_transport.sent if message.get("type") == "command.result"
    ]
    assert len(results) == 1
    assert results[0]["ok"] is True
    assert any(
        message.get("d", {}).get("requestType") == "SetCurrentProgramScene"
        for message in obs_transport.sent
    )

    await cloud_transport.incoming.put(command)
    await asyncio.sleep(0.01)
    assert (
        len(
            [
                message
                for message in cloud_transport.sent
                if message.get("type") == "command.result"
            ]
        )
        == 1
    )
    await cloud.stop()
    await obs.stop()
