#!/usr/bin/env python3
"""Report gift readiness gaps for PARTIAL gifts — never promotes to READY.

Honest Phase 4 prep without hiring. Prints what still blocks READY.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "artifacts" / "gift-library" / "catalog.json"

# Typical READY gates (must stay false until real production acceptance)
BLOCKERS = [
    ("model.glb", "model.glb"),
    ("preview.mp4", "preview.mp4"),
    ("poster.png", "poster.png"),
    ("runtime-manifest.json", "runtime-manifest.json"),
]


def main() -> int:
    if not CATALOG.is_file():
        print(f"Missing catalog: {CATALOG}")
        return 1
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    gifts = catalog.get("gifts") or []
    ready = [g for g in gifts if g.get("status") == "READY"]
    partial = [g for g in gifts if g.get("status") == "ASSETS_BUILT_NOT_READY"]
    spec = [g for g in gifts if g.get("status") == "SPEC_ONLY"]

    print("=== SYLORA gift readiness gaps (honest) ===")
    print(f"READY={len(ready)} PARTIAL={len(partial)} SPEC_ONLY={len(spec)} TOTAL={len(gifts)}")
    if ready:
        print("WARNING: catalog reports READY gifts — review before claiming ship.")
    else:
        print("OK: READY remains 0 (no false promotion).")

    print("")
    print("PARTIAL gaps (pipeline assets present ≠ production READY):")
    for gift in partial:
        slug = gift.get("slug") or gift.get("id") or "?"
        folder = ROOT / "artifacts" / "gift-library" / str(slug)
        missing = [label for label, name in BLOCKERS if not (folder / name).is_file()]
        extra = []
        report = folder / "report.json"
        if report.is_file():
            try:
                meta = json.loads(report.read_text(encoding="utf-8"))
                status = meta.get("status") or meta.get("production_status")
                if status:
                    extra.append(f"report.status={status}")
            except Exception:
                extra.append("report_unreadable")
        else:
            extra.append("no report.json")
        gap = ", ".join(missing) if missing else "local preview files present"
        note = f" · {'; '.join(extra)}" if extra else ""
        print(f"  - {slug}: {gap}{note}")
        print("      blocks READY: art direction AAA, device FPS/RAM QA, runtime preview wired, wallet publish, human accept")

    print("")
    print("SPEC_ONLY sample (first 5):")
    for gift in spec[:5]:
        print(f"  - {gift.get('slug') or gift.get('id')}")
    if len(spec) > 5:
        print(f"  … +{len(spec) - 5} more")

    print("")
    print("Next for Phase 4 (hiring gate still open):")
    print("  1. Pilot 3 PARTIAL → READY with external art + DoD")
    print("  2. Do not flip catalog status to READY from this script")
    print("  3. See docs/implementation/GIFT_LIBRARY_OWNER_STATUS.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
