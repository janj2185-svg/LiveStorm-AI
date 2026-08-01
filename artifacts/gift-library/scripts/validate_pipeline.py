#!/usr/bin/env python3
"""Offline pipeline validation for SYLORA Gift Library."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog" / "sylora-gifts-100.json"
OUT = ROOT / "reports" / "pipeline-validation.json"


def main():
    cat = json.loads(CATALOG.read_text())
    rows = []
    totals = {
        "gifts": 0,
        "glb": 0,
        "blend": 0,
        "thumb": 0,
        "poster": 0,
        "mp4": 0,
        "gif": 0,
        "manifest": 0,
        "uniqueNames": 0,
        "uniqueSlugs": 0,
    }
    names, slugs = set(), set()
    for g in cat["gifts"]:
        totals["gifts"] += 1
        names.add(g["name"])
        slugs.add(g["slug"])
        row = {"id": g["id"], "slug": g["slug"], "rarity": g["rarity"], "price": g["priceCoins"]}
        checks = {
            "glb": (ROOT / g["assets"]["glb"]).exists(),
            "blend": (ROOT / g["assets"]["blender"]).exists(),
            "thumb": (ROOT / g["assets"]["thumbnail"]).exists(),
            "poster": (ROOT / g["assets"]["poster"]).exists(),
            "mp4": (ROOT / g["assets"]["previewMp4"]).exists(),
            "gif": (ROOT / g["assets"]["previewGif"]).exists(),
            "manifest": (ROOT / g["assets"]["manifest"]).exists(),
        }
        for k, v in checks.items():
            if v:
                totals[k] += 1
        if checks["glb"]:
            row["glbBytes"] = (ROOT / g["assets"]["glb"]).stat().st_size
        row["checks"] = checks
        row["pass"] = all(checks[k] for k in ("glb", "blend", "thumb", "manifest"))
        rows.append(row)

    totals["uniqueNames"] = len(names)
    totals["uniqueSlugs"] = len(slugs)
    report = {
        "ok": totals["glb"] == 100 and totals["uniqueNames"] == 100 and totals["uniqueSlugs"] == 100,
        "totals": totals,
        "rarityPrices": {
            r: sorted({row["price"] for row in rows if row["rarity"] == r})
            for r in ("rare", "epic", "legendary", "mythic", "divine")
        },
        "failed": [r for r in rows if not r["pass"]],
        "items": rows,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"ok": report["ok"], "totals": totals, "failed": len(report["failed"])}, indent=2))


if __name__ == "__main__":
    main()
