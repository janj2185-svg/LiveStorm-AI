"""Command-line entry points for the companion."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import ipaddress
import json
import sys
from typing import NoReturn

import httpx
import uvicorn

from .app import create_app
from .config import ConfigurationError, Settings
from .logging import configure_logging
from .runtime import AlreadyRunningError, SingleInstanceLock
from .security import LocalTokenManager, SecretStore
from .updater import UpdateRejected, UpdaterUnavailable


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="sylora-companion")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("run", help="run the localhost companion")
    pair = subcommands.add_parser("pair", help="pair with SYLORA using a one-time token")
    pair.add_argument(
        "--pairing-token",
        help="one-time token; omit to enter it without shell history",
    )
    subcommands.add_parser("status", help="query local companion status")
    rotate = subcommands.add_parser("token-rotate", help="rotate the local API token")
    rotate.add_argument(
        "--show",
        action="store_true",
        help="print the newly rotated token exactly once",
    )
    update = subcommands.add_parser("update-check", help="verify the signed update manifest")
    update.add_argument("--stage", action="store_true", help="download and stage the update")
    return parser


def _fail(message: str, code: int = 1) -> NoReturn:
    print(message, file=sys.stderr)
    raise SystemExit(code)


def _run(settings: Settings) -> None:
    lock = SingleInstanceLock(settings.state_dir)
    with lock:
        uvicorn.run(
            create_app(settings),
            host=settings.bind_host,
            port=settings.bind_port,
            ssl_certfile=str(settings.tls_cert) if settings.tls_cert else None,
            ssl_keyfile=str(settings.tls_key) if settings.tls_key else None,
            access_log=False,
            server_header=False,
            log_config=None,
        )


async def _pair(settings: Settings, pairing_token: str | None) -> None:
    token = pairing_token or getpass.getpass("One-time SYLORA pairing token: ")
    app = create_app(settings)
    device_id = await app.state.cloud.pair(token)
    print(json.dumps({"paired": True, "deviceId": device_id}, separators=(",", ":")))


async def _status(settings: Settings) -> None:
    store = SecretStore(settings.state_dir)
    token = LocalTokenManager(store).load_or_create()
    address = ipaddress.ip_address(settings.bind_host)
    host = settings.bind_host if address.is_loopback else "127.0.0.1"
    scheme = "https" if settings.tls_cert else "http"
    url = f"{scheme}://{host}:{settings.bind_port}/v1/status"
    async with httpx.AsyncClient(timeout=3) as client:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"})
        response.raise_for_status()
    print(json.dumps(response.json(), separators=(",", ":")))


async def _update(settings: Settings, stage: bool) -> None:
    app = create_app(settings)
    updater = app.state.updater
    if not stage:
        manifest = await updater.check()
        print(
            json.dumps(
                {
                    "available": True,
                    "version": manifest.version,
                    "platform": manifest.platform,
                },
                separators=(",", ":"),
            )
        )
        return
    obs = app.state.obs
    obs.start()
    try:
        await obs.wait_connected(wait_seconds=settings.obs_request_timeout)
        path = await updater.check_and_stage()
    finally:
        await obs.stop()
    print(json.dumps({"staged": True, "path": str(path)}, separators=(",", ":")))


def main(argv: list[str] | None = None) -> None:
    configure_logging()
    arguments = _parser().parse_args(argv)
    try:
        settings = Settings.from_env()
        if arguments.command == "run":
            _run(settings)
        elif arguments.command == "pair":
            with SingleInstanceLock(settings.state_dir):
                asyncio.run(_pair(settings, arguments.pairing_token))
        elif arguments.command == "status":
            asyncio.run(_status(settings))
        elif arguments.command == "token-rotate":
            if not arguments.show:
                _fail("token-rotate requires --show because rotation invalidates existing clients")
            with SingleInstanceLock(settings.state_dir):
                print(LocalTokenManager(SecretStore(settings.state_dir)).rotate())
        elif arguments.command == "update-check":
            with SingleInstanceLock(settings.state_dir):
                asyncio.run(_update(settings, arguments.stage))
    except (ConfigurationError, AlreadyRunningError, UpdaterUnavailable, UpdateRejected) as exc:
        _fail(str(exc))
    except (httpx.HTTPError, TimeoutError) as exc:
        _fail(f"operation failed: {type(exc).__name__}")


if __name__ == "__main__":
    main()
