"""Single-instance process lock and external-watchdog heartbeat."""

from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from types import TracebackType
from typing import TextIO


class AlreadyRunningError(RuntimeError):
    """Another companion process holds the state-directory lock."""


class SingleInstanceLock:
    """Non-blocking OS file lock retained for the process lifetime."""

    def __init__(self, state_dir: Path) -> None:
        self._state_dir = state_dir
        self._handle: TextIO | None = None

    def acquire(self) -> None:
        self._state_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
        os.chmod(self._state_dir, 0o700)
        path = self._state_dir / "companion.lock"
        handle = path.open("a+", encoding="utf-8")
        os.chmod(path, 0o600)
        try:
            if os.name == "nt":
                import msvcrt

                handle.seek(0)
                if handle.read(1) == "":
                    handle.write("\0")
                    handle.flush()
                handle.seek(0)
                locking = vars(msvcrt)["locking"]
                locking(handle.fileno(), vars(msvcrt)["LK_NBLCK"], 1)
            else:
                import fcntl

                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            handle.close()
            raise AlreadyRunningError("another SYLORA companion instance is running") from exc
        handle.seek(0)
        handle.truncate()
        handle.write(str(os.getpid()))
        handle.flush()
        self._handle = handle

    def release(self) -> None:
        if self._handle is None:
            return
        handle = self._handle
        self._handle = None
        if os.name == "nt":
            import msvcrt

            handle.seek(0)
            locking = vars(msvcrt)["locking"]
            locking(handle.fileno(), vars(msvcrt)["LK_UNLCK"], 1)
        else:
            import fcntl

            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
        handle.close()

    def __enter__(self) -> SingleInstanceLock:
        self.acquire()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        self.release()


class WatchdogHeartbeat:
    """Publish a permission-restricted liveness file for process supervisors."""

    def __init__(self, state_dir: Path, interval: float = 5) -> None:
        self._path = state_dir / "heartbeat.json"
        self._interval = interval
        self._task: asyncio.Task[None] | None = None
        self._stop = asyncio.Event()
        self._started_at = int(time.time())

    def start(self) -> None:
        if self._task is not None and not self._task.done():
            return
        self._stop.clear()
        self._task = asyncio.create_task(self._run(), name="process-watchdog-heartbeat")

    async def stop(self) -> None:
        self._stop.set()
        if self._task is not None:
            await self._task
        self._task = None

    async def _run(self) -> None:
        self._path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        while not self._stop.is_set():
            payload = {
                "pid": os.getpid(),
                "started_at": self._started_at,
                "heartbeat_at": int(time.time()),
            }
            temporary = self._path.with_suffix(".tmp")
            descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump(payload, handle, separators=(",", ":"))
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self._path)
            os.chmod(self._path, 0o600)
            try:
                await asyncio.wait_for(self._stop.wait(), self._interval)
            except TimeoutError:
                continue
