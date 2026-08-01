#!/usr/bin/env python3
"""Seed helper notes for publishing Official Gift Library into SYLORA API.

Does not invent a successful publish. Requires a running API with author +
reviewer credentials. Docker Compose is the supported local path.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "artifacts" / "gift-library"
OUT = ROOT / "docs" / "implementation" / "GIFT_LIBRARY_SEED.md"


def main() -> None:
    catalog = json.loads((LIB / "catalog.json").read_text())
    built = [g for g in catalog["gifts"] if g["status"] != "SPEC_ONLY"]
    lines = [
        "# SYLORA Gift Library — API seed / publish path\n\n",
        "Publish gifts only through Gift Studio + `/v1/gifts/author/*` and\n",
        "`/v1/gifts/review/*/publish`. Do not insert fake catalog rows.\n\n",
        "## Prerequisites\n\n",
        "```bash\n",
        "cp infrastructure/.env.example infrastructure/.env\n",
        "# fill required secrets\n",
        "docker compose --env-file infrastructure/.env \\\n",
        "  -f infrastructure/compose/compose.yml up --build\n",
        "```\n\n",
        "## Per-gift publish checklist\n\n",
        "1. Create category `official-gift-library`.\n",
        "2. Create definition with slug, name, `price_minor`, `api_tier`.\n",
        "3. Create version; upload `model.glb`, `poster.png`, `sound/main.wav`, `.blend` as source.\n",
        "4. PATCH runtime manifest from `runtime-manifest.json` (replace asset UUIDs with verified upload IDs).\n",
        "5. Submit → validate → publish.\n",
        "6. Confirm `GET /v1/gifts/catalog` and `GET /v1/gifts/catalog/{slug}/runtime`.\n",
        "7. Test send via `POST /v1/gifts/sends` and receive on `/v1/ws/gifts`.\n\n",
        f"## Current built candidates ({len(built)})\n\n",
    ]
    for g in built:
        lines.append(
            f"- `{g['slug']}` — {g['name']} — {g['rarity']} — {g['cost']} — **{g['status']}**\n"
        )
    lines.append(
        "\n## Not READY\n\n"
        "No gift is marked READY until runtime preview, wallet send, WebSocket\n"
        "delivery to a second user, and device performance samples succeed.\n"
    )
    OUT.write_text("".join(lines), encoding="utf-8")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
