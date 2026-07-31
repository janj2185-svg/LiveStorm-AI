from __future__ import annotations

import asyncio

import pytest
from conftest import TestOBSTransport

from sylora_companion.events import EventBus
from sylora_companion.obs import (
    OBSClient,
    OBSConnectionError,
    OBSRequestError,
    OBSState,
    calculate_obs_auth,
)


def test_official_authentication_calculation() -> None:
    assert (
        calculate_obs_auth("supersecret", "salty", "challenging")
        == "Tv359SbBCFlPttTV8CsWYdXfLX085qLAZQMG7iLybOM="
    )


@pytest.mark.asyncio
async def test_identify_request_response_and_event() -> None:
    transport = TestOBSTransport(
        authentication={"salt": "salty", "challenge": "challenging"},
        responses={"GetVersion": {"obsVersion": "31.0.0", "rpcVersion": 1}},
    )

    async def factory() -> TestOBSTransport:
        return transport

    events = EventBus()
    client = OBSClient(factory, "supersecret", events, request_timeout=0.2)
    client.start()
    await client.wait_connected()
    response = await client.get_version()
    assert response == {"obsVersion": "31.0.0", "rpcVersion": 1}
    identify = transport.sent[0]
    assert identify["op"] == 1
    assert identify["d"]["authentication"] == calculate_obs_auth(
        "supersecret", "salty", "challenging"
    )
    request = transport.sent[1]
    assert request["op"] == 6
    assert request["d"]["requestType"] == "GetVersion"
    assert request["d"]["requestId"]

    await transport.incoming.put(
        {
            "op": 5,
            "d": {
                "eventType": "CurrentProgramSceneChanged",
                "eventData": {"sceneName": "Live"},
            },
        }
    )
    await asyncio.sleep(0)
    replay = await events.replay(0)
    assert replay.events[0].type == "obs.CurrentProgramSceneChanged"
    assert replay.events[0].data == {"sceneName": "Live"}
    await client.stop()


@pytest.mark.asyncio
async def test_obs_error_preserves_code_and_comment() -> None:
    transport = TestOBSTransport(
        responses={"StartStream": (501, "Stream output is already active")}
    )

    async def factory() -> TestOBSTransport:
        return transport

    client = OBSClient(factory, "", EventBus(), request_timeout=0.2)
    client.start()
    await client.wait_connected()
    with pytest.raises(OBSRequestError) as caught:
        await client.start_stream()
    assert caught.value.code == 501
    assert caught.value.comment == "Stream output is already active"
    assert caught.value.request_type == "StartStream"
    await client.stop()


@pytest.mark.asyncio
async def test_pending_map_is_bounded_and_timeout_cleans_it() -> None:
    transport = TestOBSTransport(responses={"Never": None})

    async def factory() -> TestOBSTransport:
        return transport

    client = OBSClient(
        factory,
        "",
        EventBus(),
        request_timeout=0.03,
        pending_limit=1,
    )
    client.start()
    await client.wait_connected()
    first = asyncio.create_task(client.request("Never"))
    await asyncio.sleep(0)
    assert len(transport.sent) == 2
    with pytest.raises(OBSConnectionError, match="pending request limit"):
        await client.request("Never")
    with pytest.raises(OBSConnectionError, match="timed out"):
        await first
    await client.stop()


@pytest.mark.asyncio
async def test_reconnects_after_protocol_failure() -> None:
    bad = TestOBSTransport(hello={"op": 9, "d": {}})
    good = TestOBSTransport()
    transports = iter([bad, good])
    calls = 0

    async def factory() -> TestOBSTransport:
        nonlocal calls
        calls += 1
        return next(transports)

    client = OBSClient(
        factory,
        "",
        EventBus(),
        request_timeout=0.1,
        reconnect_base=0.001,
        reconnect_cap=0.001,
        random_source=lambda: 0,
    )
    client.start()
    await client.wait_connected()
    assert calls == 2
    assert client.state is OBSState.IDENTIFIED
    assert bad.closed
    await client.stop()
