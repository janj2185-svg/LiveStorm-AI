from __future__ import annotations

import argparse
import asyncio
import json

from app.config import get_settings
from app.database import create_engine, create_session_factory, seed_rbac
from app.email import drain_outbox
from app.gift_seed import seed_ready_starter_gifts
from app.owner_config_service import deploy_readiness


async def run_drain(limit: int) -> None:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        sent, failed = await drain_outbox(create_session_factory(engine), settings, limit=limit)
        print(json.dumps({"sent": sent, "failed": failed}, separators=(",", ":")))
    finally:
        await engine.dispose()


async def run_seed_ready_gifts(limit: int | None) -> None:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        session_factory = create_session_factory(engine)
        async with session_factory() as session:
            await seed_rbac(session)
            result = await seed_ready_starter_gifts(session, limit=limit)
        print(json.dumps(result, separators=(",", ":")))
    finally:
        await engine.dispose()


async def run_validate_owner_config(environment: str | None, strict: bool) -> int:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        async with create_session_factory(engine)() as session:
            readiness = await deploy_readiness(session, settings, environment=environment)
        payload = readiness.model_dump(mode="json")
        print(json.dumps(payload, separators=(",", ":")))
        if not readiness.ready:
            return 2
        if strict and readiness.warnings:
            return 3
        return 0
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(prog="sylora-api")
    subparsers = parser.add_subparsers(dest="command", required=True)
    drain_parser = subparsers.add_parser(
        "drain-outbox", help="Send due messages through configured SMTP"
    )
    drain_parser.add_argument("--limit", type=int, default=50)
    seed_parser = subparsers.add_parser(
        "seed-ready-gifts",
        help="Publish sandbox/staging READY Lumen starter gifts into the API catalog",
    )
    seed_parser.add_argument("--limit", type=int, default=None)
    validate_parser = subparsers.add_parser(
        "validate-owner-config",
        help="Fail if required Owner Configuration credentials are missing for deploy",
    )
    validate_parser.add_argument(
        "--environment",
        default=None,
        help="development | staging | production (defaults to ENVIRONMENT)",
    )
    validate_parser.add_argument(
        "--strict",
        action="store_true",
        help="Also fail when recommended providers are missing",
    )
    arguments = parser.parse_args()
    if arguments.command == "drain-outbox":
        if arguments.limit < 1 or arguments.limit > 1000:
            parser.error("--limit must be between 1 and 1000")
        asyncio.run(run_drain(arguments.limit))
    elif arguments.command == "seed-ready-gifts":
        if arguments.limit is not None and (arguments.limit < 1 or arguments.limit > 10):
            parser.error("--limit must be between 1 and 10")
        asyncio.run(run_seed_ready_gifts(arguments.limit))
    elif arguments.command == "validate-owner-config":
        raise SystemExit(
            asyncio.run(
                run_validate_owner_config(arguments.environment, arguments.strict)
            )
        )


if __name__ == "__main__":
    main()
