from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any


class MemorySecretStore:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    def get(self, name: str) -> str | None:
        return self.values.get(name)

    def set(self, name: str, value: str) -> None:
        self.values[name] = value


class TestOBSTransport:
    __test__ = False

    def __init__(
        self,
        *,
        authentication: dict[str, str] | None = None,
        responses: dict[str, dict[str, Any] | tuple[int, str] | None] | None = None,
        hello: dict[str, Any] | None = None,
    ) -> None:
        hello_data: dict[str, Any] = {"obsWebSocketVersion": "5.5.0", "rpcVersion": 1}
        if authentication is not None:
            hello_data["authentication"] = authentication
        self.incoming: asyncio.Queue[dict[str, Any] | BaseException] = asyncio.Queue()
        self.incoming.put_nowait(hello or {"op": 0, "d": hello_data})
        self.incoming.put_nowait({"op": 2, "d": {"negotiatedRpcVersion": 1}})
        self.responses = responses or {}
        self.sent: list[dict[str, Any]] = []
        self.closed = False

    async def send(self, message: dict[str, Any]) -> None:
        self.sent.append(message)
        if message.get("op") != 6:
            return
        request = message["d"]
        request_type = request["requestType"]
        configured = self.responses.get(request_type, {})
        if configured is None:
            return
        if isinstance(configured, tuple):
            status = {
                "result": False,
                "code": configured[0],
                "comment": configured[1],
            }
            response_data: dict[str, Any] = {}
        else:
            status = {"result": True, "code": 100}
            response_data = configured
        await self.incoming.put(
            {
                "op": 7,
                "d": {
                    "requestType": request_type,
                    "requestId": request["requestId"],
                    "requestStatus": status,
                    "responseData": response_data,
                },
            }
        )

    async def recv(self) -> dict[str, Any]:
        value = await self.incoming.get()
        if isinstance(value, BaseException):
            raise value
        return value

    async def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        await self.incoming.put(ConnectionError("test transport closed"))


class TestCloudTransport:
    __test__ = False

    def __init__(self) -> None:
        self.incoming: asyncio.Queue[dict[str, Any] | BaseException] = asyncio.Queue()
        self.sent: list[dict[str, Any]] = []
        self.closed = False

    async def send(self, message: dict[str, Any]) -> None:
        self.sent.append(message)

    async def recv(self) -> dict[str, Any]:
        value = await self.incoming.get()
        if isinstance(value, BaseException):
            raise value
        return value

    async def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        await self.incoming.put(ConnectionError("test cloud transport closed"))


class TestUpdateTransport:
    __test__ = False

    def __init__(self, manifest: dict[str, Any], artifact: bytes) -> None:
        self.manifest = manifest
        self.artifact = artifact

    async def get_json(self, _url: str) -> dict[str, Any]:
        return self.manifest

    async def get_bytes(self, _url: str, limit: int) -> bytes:
        if len(self.artifact) > limit:
            raise RuntimeError("test artifact too large")
        return self.artifact


def mode(path: Path) -> int:
    return path.stat().st_mode & 0o777
