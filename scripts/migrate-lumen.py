"""
One-shot migration from the previous dark-first token vocabulary to Lumen.

Kept in the repository as a record of exactly what the rename covered, because
"we renamed some CSS variables" is not a reviewable statement and a diff of
15,000 lines of stylesheet is not readable.

Run once:  python3 scripts/migrate-lumen.py
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Order matters: longer keys first, so `sy-glass--veil` is not partially
# rewritten by the `sy-glass` rule.
REPLACEMENTS: list[tuple[str, str]] = [
    # --- Signature surface class names -------------------------------------
    ("sy-glass--veil", "sy-vellum--veil"),
    ("sy-glass--dome", "sy-vellum--dome"),
    ("sy-glass--panel", "sy-vellum--panel"),
    ("sy-glass", "sy-vellum"),
    ("sy-aurora-duration", "sy-lumen-duration"),
    ("sy-aurora", "sy-lumen"),
    # --- Vellum tokens ------------------------------------------------------
    ("--sy-glass-", "--sy-vellum-"),
    # --- Refraction replaces glow ------------------------------------------
    ("--sy-glow-subtle-spread", "--sy-refract-edge-spread"),
    ("--sy-glow-subtle-alpha", "--sy-refract-edge-alpha"),
    ("--sy-glow-base-spread", "--sy-refract-edge-spread"),
    ("--sy-glow-base-alpha", "--sy-refract-edge-alpha"),
    ("--sy-glow-strong-spread", "--sy-refract-bloom-spread"),
    ("--sy-glow-strong-alpha", "--sy-refract-bloom-alpha"),
    ("--sy-glow-halo-spread", "--sy-refract-halo-spread"),
    ("--sy-glow-halo-alpha", "--sy-refract-halo-alpha"),
    # --- Gradients ----------------------------------------------------------
    ("--sy-gradient-aurora", "--sy-gradient-prism"),
    ("--sy-gradient-signal", "--sy-gradient-beam"),
    ("--sy-gradient-depth", "--sy-gradient-daylight"),
    # --- Colour families ----------------------------------------------------
    ("--sy-neutral-", "--sy-porcelain-"),
    ("--sy-iris-", "--sy-aether-"),
    ("--sy-flux-", "--sy-pulse-"),
    ("--sy-nova-", "--sy-bloom-"),
    ("--sy-verdant-", "--sy-verdigris-"),
    ("--sy-crimson-", "--sy-rose-"),
    ("--sy-on-iris", "--sy-on-accent"),
    ("--sy-on-flux", "--sy-on-live"),
    ("--sy-on-nova", "--sy-on-creator"),
    ("--sy-on-verdant", "--sy-on-success"),
    ("--sy-on-solar", "--sy-on-warning"),
    ("--sy-on-crimson", "--sy-on-danger"),
]

TARGETS = [
    *(ROOT / "src").rglob("*.css"),
    *(ROOT / "src").rglob("*.tsx"),
    *(ROOT / "src").rglob("*.ts"),
]

SKIP = {ROOT / "src" / "design-system" / "styles" / "tokens.css"}


def main() -> None:
    changed = 0
    edits = 0
    for path in TARGETS:
        if path in SKIP:
            continue
        original = path.read_text(encoding="utf8")
        text = original
        for old, new in REPLACEMENTS:
            if old in text:
                edits += text.count(old)
                text = text.replace(old, new)
        if text != original:
            path.write_text(text, encoding="utf8")
            changed += 1
    print(f"{edits} replacements across {changed} files")

    # Anything left pointing at a family that no longer exists is a bug.
    stale = re.compile(r"--sy-(neutral|iris|flux|nova|verdant|crimson)-|--sy-glow-|--sy-glass-")
    for path in TARGETS:
        if path in SKIP:
            continue
        for number, line in enumerate(path.read_text(encoding="utf8").splitlines(), 1):
            if stale.search(line):
                print(f"  STALE {path.relative_to(ROOT)}:{number}: {line.strip()[:100]}")


if __name__ == "__main__":
    main()
