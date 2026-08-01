from __future__ import annotations

import argparse
import asyncio
import json

from app.config import get_settings
from app.database import create_engine, create_session_factory, seed_rbac
from app.email import drain_outbox
from app.ledger_service import seed_platform_accounts
from app.seed_demo import seed_demo_accounts


async def run_drain(limit: int) -> None:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        sent, failed = await drain_outbox(create_session_factory(engine), settings, limit=limit)
        print(json.dumps({"sent": sent, "failed": failed}, separators=(",", ":")))
    finally:
        await engine.dispose()


async def run_seed_demo() -> None:
    settings = get_settings()
    if settings.environment == "production":
        raise SystemExit("seed-demo is refused when ENVIRONMENT=production")
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            await seed_rbac(session)
            await seed_platform_accounts(session)
        accounts = await seed_demo_accounts(session_factory)
        print(json.dumps({"accounts": accounts}, indent=2, sort_keys=True))
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(prog="sylora-api")
    subparsers = parser.add_subparsers(dest="command", required=True)
    drain_parser = subparsers.add_parser(
        "drain-outbox", help="Send due messages through configured SMTP"
    )
    drain_parser.add_argument("--limit", type=int, default=50)
    subparsers.add_parser(
        "seed-demo",
        help="Create verified local demo accounts (refused in production)",
    )
    arguments = parser.parse_args()
    if arguments.command == "drain-outbox":
        if arguments.limit < 1 or arguments.limit > 1000:
            parser.error("--limit must be between 1 and 1000")
        asyncio.run(run_drain(arguments.limit))
    elif arguments.command == "seed-demo":
        asyncio.run(run_seed_demo())


if __name__ == "__main__":
    main()
