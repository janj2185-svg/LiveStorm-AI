#!/usr/bin/env python3
"""Validate runtime manifests for built SYLORA gifts (structural checks)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "artifacts" / "gift-library"

REQUIRED = [
    "schema_version",
    "renderer_targets",
    "duration_ms",
    "assets",
    "fallbacks",
    "quality_budgets",
]


def validate_manifest(path: Path) -> list[str]:
    errors: list[str] = []
    data = json.loads(path.read_text())
    for key in REQUIRED:
        if key not in data:
            errors.append(f"missing {key}")
    if data.get("schema_version") != "1.0":
        errors.append("schema_version must be 1.0")
    if not data.get("assets"):
        errors.append("assets empty")
    budgets = data.get("quality_budgets") or {}
    if data.get("duration_ms", 0) > budgets.get("max_duration_ms", 0):
        errors.append("duration exceeds budget")
    return errors


def main() -> int:
    catalog = json.loads((LIB / "catalog.json").read_text())
    checked = 0
    failed = 0
    for gift in catalog["gifts"]:
        slug = gift["slug"]
        manifest = LIB / slug / "runtime-manifest.json"
        if not manifest.exists():
            continue
        checked += 1
        errs = validate_manifest(manifest)
        glb = LIB / slug / "model.glb"
        if not glb.exists():
            errs.append("missing model.glb")
        audio = LIB / slug / "sound" / "main.wav"
        if not audio.exists() or audio.stat().st_size < 1000:
            errs.append("missing/empty audio")
        if errs:
            failed += 1
            print(f"FAIL {slug}: {', '.join(errs)}")
        else:
            print(f"OK   {slug}")
    print(f"checked={checked} failed={failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
