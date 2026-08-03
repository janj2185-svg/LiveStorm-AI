from __future__ import annotations

import argparse
import asyncio
import json

from app.config import get_settings
from app.database import create_engine, create_session_factory, seed_rbac
from app.email import drain_outbox
from app.gift_seed import seed_ready_starter_gifts


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
    arguments = parser.parse_args()
    if arguments.command == "drain-outbox":
        if arguments.limit < 1 or arguments.limit > 1000:
            parser.error("--limit must be between 1 and 1000")
        asyncio.run(run_drain(arguments.limit))
    elif arguments.command == "seed-ready-gifts":
        if arguments.limit is not None and (arguments.limit < 1 or arguments.limit > 10):
            parser.error("--limit must be between 1 and 10")
        asyncio.run(run_seed_ready_gifts(arguments.limit))


if __name__ == "__main__":
    main()
