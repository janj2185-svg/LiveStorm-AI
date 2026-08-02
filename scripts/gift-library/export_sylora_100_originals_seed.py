#!/usr/bin/env python3
"""Export SYLORA 100 originals → machine-readable Gift Studio seed.

Reads:
  docs/implementation/SYLORA_GIFT_100_ORIGINALS.md
  docs/implementation/SYLORA_GIFT_CONCEPT_ART.md
  artifacts/sylora-gift-concepts/*.png

Writes (SPEC_ONLY — never marks READY):
  artifacts/sylora-gift-100-originals/seed.json
  artifacts/sylora-gift-100-originals/catalog.json
  artifacts/sylora-gift-100-originals/<slug>/spec.json
  docs/implementation/SYLORA_GIFT_100_SEED.md

Does not insert fake API catalog rows. Publish only via Gift Studio /
/v1/gifts/author/* after real GLB + WAV + runtime proof.
"""

from __future__ import annotations

import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ORIGINALS_MD = ROOT / "docs" / "implementation" / "SYLORA_GIFT_100_ORIGINALS.md"
CONCEPT_MD = ROOT / "docs" / "implementation" / "SYLORA_GIFT_CONCEPT_ART.md"
CONCEPT_DIR = ROOT / "artifacts" / "sylora-gift-concepts"
OUT = ROOT / "artifacts" / "sylora-gift-100-originals"
SEED_DOC = ROOT / "docs" / "implementation" / "SYLORA_GIFT_100_SEED.md"

API_TIER = {
    "Rare": "rare",
    "Epic": "epic",
    "Legendary": "legendary",
    "Mythic": "mythical",
    "Divine": "ultra_premium",
}

# Known markdown typos / non-API slug forms → canonical API slug
SLUG_FIXES = {
    "pant-of-rooms": "codex-of-rooms",
    "world-without-cliché": "world-without-cliche",
}

ROW_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([\d\s]+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*\|\s*$"
)
CONCEPT_ROW_RE = re.compile(
    r"^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+?)\s*\|\s*([\d]+)\s*\|\s*([^|]+?)\s*\|\s*$"
)
SLUG_OK = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _norm_name(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _ascii_slug(raw: str) -> str:
    text = unicodedata.normalize("NFKD", raw.strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text


def parse_originals(md: str) -> list[dict]:
    rarity = None
    gifts: list[dict] = []
    for line in md.splitlines():
        if line.startswith("## Rare"):
            rarity = "Rare"
        elif line.startswith("## Epic"):
            rarity = "Epic"
        elif line.startswith("## Legendary"):
            rarity = "Legendary"
        elif line.startswith("## Mythic"):
            rarity = "Mythic"
        elif line.startswith("## Divine"):
            rarity = "Divine"
        m = ROW_RE.match(line)
        if not m or rarity is None:
            continue
        index = int(m.group(1))
        raw_slug = m.group(2).strip()
        name = m.group(3).strip()
        price = int(re.sub(r"\s+", "", m.group(4)))
        effect = m.group(5).strip()
        hook = m.group(6).strip().strip("“”\"'")
        slug = SLUG_FIXES.get(raw_slug, _ascii_slug(raw_slug))
        if not SLUG_OK.fullmatch(slug):
            raise SystemExit(f"invalid slug after normalize: {raw_slug!r} → {slug!r}")
        gifts.append(
            {
                "index": index,
                "slug": slug,
                "slug_source": raw_slug,
                "name": name,
                "price_minor": price,
                "rarity": rarity,
                "api_tier": API_TIER[rarity],
                "effect": effect,
                "cohost_hook": hook,
            }
        )
    if len(gifts) != 100:
        raise SystemExit(f"expected 100 originals rows, got {len(gifts)}")
    return gifts


def parse_concept_index(md: str) -> dict[str, dict]:
    """Map normalized gift name → concept file metadata."""
    by_name: dict[str, dict] = {}
    for line in md.splitlines():
        m = CONCEPT_ROW_RE.match(line)
        if not m:
            continue
        file_name = m.group(2).strip()
        gift_name = m.group(3).strip()
        price = int(m.group(4))
        tier = m.group(5).strip()
        by_name[_norm_name(gift_name)] = {
            "concept_file": file_name,
            "concept_art_index": int(m.group(1)),
            "concept_price": price,
            "concept_tier": tier,
        }
    if len(by_name) != 100:
        raise SystemExit(f"expected 100 concept rows, got {len(by_name)}")
    return by_name


def build_seed(gifts: list[dict], concepts_by_name: dict[str, dict]) -> list[dict]:
    missing: list[str] = []
    seed: list[dict] = []
    for g in gifts:
        concept = concepts_by_name.get(_norm_name(g["name"]))
        if concept is None:
            missing.append(g["name"])
            continue
        rel_poster = f"artifacts/sylora-gift-concepts/{concept['concept_file']}"
        abs_poster = ROOT / rel_poster
        if not abs_poster.is_file():
            raise SystemExit(f"missing concept poster file: {rel_poster}")
        description = (
            f"{g['effect']}. Co-Host: {g['cohost_hook']}. "
            "Never fabricate delivery."
        )
        entry = {
            **g,
            "description": description,
            "creator_revenue_share_bps": 0,
            "category_slug": "official-gift-library",
            "search_tags": [
                "official",
                "sylora-original",
                g["api_tier"].replace("_", "-"),
                "anti-cliche",
            ],
            "status": "SPEC_ONLY",
            "ready": False,
            "concept_poster": rel_poster,
            "concept_art_index": concept["concept_art_index"],
            "concept_file": concept["concept_file"],
            "definition_payload": {
                "slug": g["slug"],
                "name": g["name"],
                "description": description,
                "price_minor": g["price_minor"],
                "creator_revenue_share_bps": 0,
                "tier": g["api_tier"],
                "search_tags": [
                    "official",
                    "sylora-original",
                    g["api_tier"].replace("_", "-"),
                    "anti-cliche",
                ],
            },
            "asset_gaps": {
                "glb": True,
                "wav": True,
                "runtime_manifest": True,
                "blend_source": True,
                "concept_poster_only": True,
            },
            "notes": (
                "Concept PNG is mood/reference only. "
                "Cannot publish/READY without verified GLB + WAV + manifest + E2E proof."
            ),
        }
        seed.append(entry)
    if missing:
        raise SystemExit("concept poster name mismatch: " + ", ".join(missing))
    return seed


def write_outputs(seed: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rarity_counts = Counter(g["rarity"] for g in seed)
    catalog = {
        "project": "SYLORA",
        "library": "SYLORA 100 Originals (anti-TikTok-cliché)",
        "source_templates": "docs/implementation/SYLORA_GIFT_100_ORIGINALS.md",
        "source_concept_art": "docs/implementation/SYLORA_GIFT_CONCEPT_ART.md",
        "total": len(seed),
        "rarity_counts": dict(rarity_counts),
        "ready_count": 0,
        "spec_only_count": len(seed),
        "policy": (
            "READY only after real GLB/WAV, Gift Studio publish, catalog runtime, "
            "wallet send, WebSocket delivery, and device performance checks. "
            "Concept posters alone never make a gift READY. "
            "Do not insert fake API catalog rows."
        ),
        "parallel_library_note": (
            "Distinct from artifacts/gift-library fantasy Official Gift Library. "
            "Decide product catalog ownership before bulk-publishing either set."
        ),
        "gifts": [
            {
                "index": g["index"],
                "name": g["name"],
                "slug": g["slug"],
                "rarity": g["rarity"],
                "api_tier": g["api_tier"],
                "price_minor": g["price_minor"],
                "status": g["status"],
                "concept_file": g["concept_file"],
            }
            for g in seed
        ],
    }
    (OUT / "catalog.json").write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    (OUT / "seed.json").write_text(
        json.dumps(
            {
                "project": "SYLORA",
                "version": 1,
                "total": len(seed),
                "ready_count": 0,
                "gifts": seed,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    for g in seed:
        gift_dir = OUT / g["slug"]
        gift_dir.mkdir(parents=True, exist_ok=True)
        spec = {
            "index": g["index"],
            "slug": g["slug"],
            "name": g["name"],
            "price_minor": g["price_minor"],
            "rarity": g["rarity"],
            "api_tier": g["api_tier"],
            "effect": g["effect"],
            "cohost_hook": g["cohost_hook"],
            "description": g["description"],
            "status": "SPEC_ONLY",
            "ready": False,
            "concept_poster": g["concept_poster"],
            "definition_payload": g["definition_payload"],
            "asset_gaps": g["asset_gaps"],
            "paths": {
                "concept_poster": g["concept_poster"],
                "glb": None,
                "wav": None,
                "runtime_manifest": None,
                "blend": None,
            },
            "ready_checklist": {
                "real_3d_model": False,
                "real_animation": False,
                "real_vfx": False,
                "real_sound": False,
                "runtime_manifest": False,
                "gift_studio_publish": False,
                "catalog_runtime": False,
                "wallet_send": False,
                "websocket_delivery": False,
                "device_performance": False,
            },
            "notes": g["notes"],
        }
        (gift_dir / "spec.json").write_text(
            json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )


def write_seed_doc(seed: list[dict]) -> None:
    priority = [
        "soft-ping",
        "cohost-nod",
        "reply-ribbon",
        "open-rehearsal",
        "memory-pin",
        "ai-listening-room",
        "world-without-cliche",
        "sylora-eternal-listening",
    ]
    by_slug = {g["slug"]: g for g in seed}
    lines = [
        "# SYLORA 100 Originals — machine-readable seed\n\n",
        "Generated by `scripts/gift-library/export_sylora_100_originals_seed.py`.\n\n",
        "## Artifacts\n\n",
        "- `artifacts/sylora-gift-100-originals/seed.json` — full seed + `definition_payload`\n",
        "- `artifacts/sylora-gift-100-originals/catalog.json` — compact index\n",
        "- `artifacts/sylora-gift-100-originals/<slug>/spec.json` — per-gift SPEC_ONLY\n",
        "- Concept posters remain in `artifacts/sylora-gift-concepts/` (mood only)\n\n",
        "## Honesty\n\n",
        "- Status of every gift: **SPEC_ONLY** / `ready: false`\n",
        "- Concept PNG ≠ runtime poster for publish validation\n",
        "- **Never** insert fake published catalog rows\n",
        "- READY only after GLB + WAV + Gift Studio publish + send/WS proof\n\n",
        "## Regenerate\n\n",
        "```bash\n",
        "python3 scripts/gift-library/export_sylora_100_originals_seed.py\n",
        "```\n\n",
        "## Draft definitions (when API is up)\n\n",
        "1. Ensure category `official-gift-library` exists.\n",
        "2. For each gift, `POST /v1/gifts/author/definitions` using `definition_payload`\n",
        "   plus `category_id` from step 1.\n",
        "3. Stop at draft until real assets exist — do not publish from concept art alone.\n\n",
        f"## Counts\n\n- total: **{len(seed)}**\n- READY: **0**\n\n",
        "## Priority launch batch\n\n",
    ]
    for slug in priority:
        g = by_slug[slug]
        lines.append(
            f"- `{g['slug']}` — {g['name']} — {g['price_minor']} — {g['rarity']} — "
            f"`{g['concept_file']}`\n"
        )
    lines.append("\n## All gifts\n\n| # | slug | name | price | tier | concept |\n|---:|---|---|---:|---|---|\n")
    for g in seed:
        lines.append(
            f"| {g['index']} | `{g['slug']}` | {g['name']} | {g['price_minor']} | "
            f"{g['rarity']} | `{g['concept_file']}` |\n"
        )
    SEED_DOC.write_text("".join(lines), encoding="utf-8")


def main() -> None:
    gifts = parse_originals(ORIGINALS_MD.read_text(encoding="utf-8"))
    concepts = parse_concept_index(CONCEPT_MD.read_text(encoding="utf-8"))
    seed = build_seed(gifts, concepts)
    write_outputs(seed)
    write_seed_doc(seed)
    print(f"wrote {OUT / 'seed.json'} ({len(seed)} gifts, READY=0)")
    print(f"wrote {OUT / 'catalog.json'}")
    print(f"wrote {SEED_DOC}")


if __name__ == "__main__":
    main()
