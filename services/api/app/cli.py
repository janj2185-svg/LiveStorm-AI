from __future__ import annotations

import argparse
import asyncio
import json

from app.bootstrap_demo import bootstrap_demo
from app.config import get_settings
from app.database import create_engine, create_session_factory, seed_rbac
from app.email import drain_outbox
from app.ledger_service import seed_platform_accounts
from app.storage import S3ObjectStorage


async def run_drain(limit: int) -> None:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        sent, failed = await drain_outbox(create_session_factory(engine), settings, limit=limit)
        print(json.dumps({"sent": sent, "failed": failed}, separators=(",", ":")))
    finally:
        await engine.dispose()


async def run_bootstrap_demo() -> None:
    settings = get_settings()
    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    try:
        async with session_factory() as session:
            await seed_rbac(session)
            await seed_platform_accounts(session)
            await session.commit()
        result = await bootstrap_demo(session_factory, settings, S3ObjectStorage(settings))
        print(json.dumps(result, indent=2, sort_keys=True))
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
        "bootstrap-demo",
        help="Seed local demo accounts, credits, and a published Lottie gift "
        "(ENVIRONMENT=development only)",
    )
    arguments = parser.parse_args()
    if arguments.command == "drain-outbox":
        if arguments.limit < 1 or arguments.limit > 1000:
            parser.error("--limit must be between 1 and 1000")
        asyncio.run(run_drain(arguments.limit))
    elif arguments.command == "bootstrap-demo":
        asyncio.run(run_bootstrap_demo())


if __name__ == "__main__":
    main()
