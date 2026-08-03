#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.database import create_engine, create_session_factory, seed_rbac  # noqa: E402
from app.gift_seed import seed_ready_starter_gifts  # noqa: E402


async def run(limit: int | None) -> None:
    settings = get_settings()
    engine = create_engine(settings)
    try:
        session_factory = create_session_factory(engine)
        async with session_factory() as session:
            await seed_rbac(session)
            result = await seed_ready_starter_gifts(session, limit=limit)
        print(json.dumps(result, indent=2))
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed sandbox/staging READY Lumen starter gifts into the SYLORA API catalog."
    )
    parser.add_argument("--limit", type=int, default=None, help="Seed the first N starter gifts.")
    args = parser.parse_args()
    if args.limit is not None and (args.limit < 1 or args.limit > 10):
        parser.error("--limit must be between 1 and 10")
    asyncio.run(run(args.limit))


if __name__ == "__main__":
    main()
