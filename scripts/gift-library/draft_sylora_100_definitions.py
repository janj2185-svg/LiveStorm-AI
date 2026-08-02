#!/usr/bin/env python3
"""Create draft gift definitions from SYLORA-100 seed (API must be running).

Dry-run by default. Does NOT publish. Does NOT mark READY.
Requires author token + category official-gift-library.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "artifacts" / "sylora-gift-100-originals" / "seed.json"

PRIORITY = [
    "soft-ping",
    "cohost-nod",
    "reply-ribbon",
    "open-rehearsal",
    "memory-pin",
    "ai-listening-room",
    "world-without-cliche",
    "sylora-eternal-listening",
]


def api(base: str, method: str, path: str, token: str | None, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        base.rstrip("/") + path,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {}),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, raw
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default=os.environ.get("SYLORA_API_BASE", "http://127.0.0.1:8000"))
    ap.add_argument("--token", default=os.environ.get("SYLORA_AUTHOR_TOKEN", ""))
    ap.add_argument("--category-id", default=os.environ.get("SYLORA_GIFT_CATEGORY_ID", ""))
    ap.add_argument("--slugs", nargs="+", default=PRIORITY)
    ap.add_argument("--execute", action="store_true", help="actually POST definitions")
    args = ap.parse_args()

    seed = json.loads(SEED.read_text(encoding="utf-8"))
    by_slug = {g["slug"]: g for g in seed["gifts"]}
    missing = [s for s in args.slugs if s not in by_slug]
    if missing:
        raise SystemExit(f"unknown slugs: {missing}")

    plans = []
    for slug in args.slugs:
        g = by_slug[slug]
        payload = dict(g["definition_payload"])
        if args.category_id:
            payload["category_id"] = args.category_id
        plans.append({"slug": slug, "payload": payload, "status": g.get("status")})

    print(json.dumps({"mode": "execute" if args.execute else "dry-run", "count": len(plans), "plans": plans}, indent=2))

    if not args.execute:
        print("\nDry-run only. Re-run with --execute --token … --category-id … to create drafts.", file=sys.stderr)
        return

    if not args.token or not args.category_id:
        raise SystemExit("--token and --category-id required for --execute")

    results = []
    for plan in plans:
        code, body = api(args.base_url, "POST", "/v1/gifts/author/definitions", args.token, plan["payload"])
        results.append({"slug": plan["slug"], "http": code, "body": body})
        print(f"{plan['slug']}: HTTP {code}", flush=True)
    out = ROOT / "artifacts" / "sylora-gift-100-originals" / "draft-definitions-result.json"
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
