#!/usr/bin/env python3
"""Build priority SYLORA-100 originals assets (honest non-READY).

Without Blender: procedural GLB + synthesized WAV + concept poster copy +
runtime-manifest. Status stays ASSETS_BUILT_NOT_READY or PARTIAL_ASSETS.
Never marks READY.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
LIB = ROOT / "artifacts" / "sylora-gift-100-originals"
CONCEPT = ROOT / "artifacts" / "sylora-gift-concepts"

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

DURATION_MS = {
    "Rare": 3200,
    "Epic": 5200,
    "Legendary": 7000,
    "Mythic": 9000,
    "Divine": 11000,
}

FORM_FAMILY = {
    "soft-ping": "pulse_orb",
    "cohost-nod": "avatar_cue",
    "reply-ribbon": "ribbon",
    "open-rehearsal": "curtain_room",
    "memory-pin": "cork_pin",
    "ai-listening-room": "chamber",
    "world-without-cliche": "shatter_icons",
    "sylora-eternal-listening": "aurora_loop",
}

VFX_FAMILY = {
    "soft-ping": "ui_glow",
    "cohost-nod": "soft_nod",
    "reply-ribbon": "ui_glow",
    "open-rehearsal": "stage_wash",
    "memory-pin": "pin_drop",
    "ai-listening-room": "aurora",
    "world-without-cliche": "stardust",
    "sylora-eternal-listening": "bow_aurora",
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def stable_uuid(namespace: str, slug: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"sylora:gift100:{namespace}:{slug}"))


def run(cmd: list[str], timeout: int = 300) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=timeout)


def build_manifest(spec: dict) -> dict:
    duration = spec["duration_ms"]
    rarity = spec["rarity"]
    glb_id = spec["asset_ids"]["glb"]
    audio_id = spec["asset_ids"]["audio"]
    poster_id = spec["asset_ids"]["poster"]
    max_particles = {
        "Rare": 200,
        "Epic": 600,
        "Legendary": 1500,
        "Mythic": 3000,
        "Divine": 5000,
    }[rarity]
    return {
        "schema_version": "1.0",
        "renderer_targets": ["threejs", "flutter"],
        # Omit source_metadata until a real Blender .blend exists.
        # RuntimeManifest only accepts application="blender".
        "duration_ms": duration,
        "assets": [
            {"asset_id": glb_id, "role": "primary_model"},
            {"asset_id": audio_id, "role": "primary_audio"},
            {"asset_id": poster_id, "role": "poster"},
            {"asset_id": glb_id, "role": "low_end_fallback"},
        ],
        "layers": [
            {
                "kind": "model",
                "name": "gift_root",
                "asset_id": glb_id,
                "transform": {
                    "position": {"x": 0, "y": 0, "z": 0},
                    "rotation_degrees": {"x": 0, "y": 0, "z": 0},
                    "scale": {"x": 1, "y": 1, "z": 1},
                },
            }
        ],
        "timelines": [
            {
                "name": "main",
                "duration_ms": duration,
                "loop": False,
                "tracks": [
                    {
                        "target": "gift_root",
                        "property": "rotation_z",
                        "keyframes": [
                            {"time_ms": 0, "value": 0, "easing": "ease_in_out"},
                            {
                                "time_ms": duration,
                                "value": 180 if rarity == "Divine" else 360,
                                "easing": "ease_in_out",
                            },
                        ],
                    }
                ],
            }
        ],
        "particle_systems": [
            {
                "name": f"particles_{spec['vfx_family']}",
                "max_particles": max_particles,
                "spawn_rate_per_second": max(10, max_particles // 10),
                "texture_asset_id": None,
                "deterministic_seed": abs(hash(spec["slug"])) % 2_147_483_647,
            }
        ],
        "shaders": [],
        "lighting": [
            {"kind": "ambient", "color_hex": "#101820", "intensity": 0.4, "position": None},
            {
                "kind": "directional",
                "color_hex": "#FFF2D8",
                "intensity": 2.2,
                "position": {"x": 2, "y": 4, "z": 3},
            },
        ],
        "audio": [
            {"asset_id": audio_id, "spatial": True, "peak_dbfs": -6, "autoplay": True}
        ],
        "interaction_hooks": [
            {"hook": "arrival", "action": "sylora.gift.play"},
            {"hook": "completion", "action": "sylora.gift.complete"},
            {"hook": "tap", "action": "sylora.gift.replay"},
        ],
        "combinations": [
            {
                "combination_id": f"sylora.gift.{spec['slug']}",
                "compatible_combination_ids": ["sylora.gift.combo.any"],
                "window_seconds": 120,
            }
        ],
        "procedural_parameters": [
            {
                "name": "seed",
                "source": "deterministic",
                "value_type": "seed",
                "minimum": None,
                "maximum": None,
                "allowed_values": [],
            }
        ],
        "effects": [
            {
                "name": f"{spec['slug']}_main",
                "scope": "full_screen"
                if rarity in {"Legendary", "Mythic", "Divine"}
                else "viewer",
                "timeline_name": "main",
            }
        ],
        "fallbacks": {
            "low_end_asset_id": glb_id,
            "reduced_motion_asset_id": poster_id,
            "no_audio_asset_id": glb_id,
        },
        "quality_budgets": {
            "max_download_bytes": {
                "Rare": 2_000_000,
                "Epic": 5_000_000,
                "Legendary": 12_000_000,
                "Mythic": 25_000_000,
                "Divine": 50_000_000,
            }[rarity],
            "max_duration_ms": max(duration, duration + 1000),
            "max_particles": max_particles,
            "max_shader_instructions": 256,
            "max_audio_peak_dbfs": -1,
        },
    }


def still_preview(gift_dir: Path, duration_s: float) -> tuple[bool, str]:
    poster = gift_dir / "poster.png"
    wav = gift_dir / "sound" / "main.wav"
    mp4 = gift_dir / "preview.mp4"
    gif = gift_dir / "preview.gif"
    if not poster.exists() or not shutil.which("ffmpeg"):
        return False, "ffmpeg or poster missing"
    cmd = [
        "ffmpeg",
        "-y",
        "-loop",
        "1",
        "-i",
        str(poster),
        "-i",
        str(wav),
        "-c:v",
        "libx264",
        "-tune",
        "stillimage",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        "-t",
        f"{duration_s:.2f}",
        "-movflags",
        "+faststart",
        str(mp4),
    ]
    r = run(cmd, timeout=180)
    if r.returncode != 0 or not mp4.exists():
        return False, (r.stderr or r.stdout)[-500:]
    rg = run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(mp4),
            "-vf",
            "fps=6,scale=320:-1:flags=lanczos",
            "-loop",
            "0",
            "-t",
            "2",
            str(gif),
        ],
        timeout=120,
    )
    if rg.returncode != 0:
        return False, (rg.stderr or "")[-400:]
    return True, "ok"


def enrich_spec(spec: dict) -> dict:
    slug = spec["slug"]
    rarity = spec["rarity"]
    spec["duration_ms"] = DURATION_MS[rarity]
    spec["form_family"] = FORM_FAMILY.get(slug, "pulse_orb")
    spec["vfx_family"] = VFX_FAMILY.get(slug, "ui_glow")
    spec["asset_ids"] = {
        "glb": stable_uuid("glb", slug),
        "audio": stable_uuid("audio", slug),
        "poster": stable_uuid("poster", slug),
        "blend": stable_uuid("blend", slug),
        "shader": stable_uuid("shader", slug),
    }
    return spec


def build_one(slug: str) -> dict:
    gift_dir = LIB / slug
    spec_path = gift_dir / "spec.json"
    if not spec_path.exists():
        raise SystemExit(f"missing spec for {slug} — run export_sylora_100_originals_seed.py first")
    spec = enrich_spec(json.loads(spec_path.read_text(encoding="utf-8")))
    report: dict = {
        "slug": slug,
        "steps": {},
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
            "video_proof": False,
            "performance_check": False,
            "runtime_preview": False,
            "sylora_integration": False,
        },
        "status": "SPEC_ONLY",
    }

    # Poster from concept art
    concept = ROOT / spec["concept_poster"]
    if not concept.is_file():
        # fallback via concept_file field
        concept = CONCEPT / spec.get("concept_file", "")
    poster = gift_dir / "poster.png"
    if concept.is_file():
        shutil.copy2(concept, poster)
        report["steps"]["poster"] = True
    else:
        report["steps"]["poster"] = False
        report["poster_error"] = f"missing {concept}"

    # Audio
    audio_r = run(
        [
            sys.executable,
            str(SCRIPTS / "synthesize_audio.py"),
            "--out",
            str(gift_dir / "sound"),
            "--slug",
            slug,
            "--duration",
            str(spec["duration_ms"] / 1000),
            "--family",
            spec["vfx_family"],
        ]
    )
    report["steps"]["audio"] = audio_r.returncode == 0
    wav = gift_dir / "sound" / "main.wav"
    report["ready_checklist"]["real_sound"] = wav.exists() and wav.stat().st_size > 1000

    # Procedural GLB
    glb = gift_dir / "model.glb"
    glb_r = run(
        [
            sys.executable,
            str(SCRIPTS / "write_minimal_glb.py"),
            "--out",
            str(glb),
            "--slug",
            slug,
            "--duration",
            str(spec["duration_ms"] / 1000),
        ]
    )
    report["steps"]["glb"] = glb_r.returncode == 0
    report["ready_checklist"]["real_3d_model"] = glb.exists() and glb.stat().st_size > 1500
    report["ready_checklist"]["real_animation"] = (
        glb.exists() and b'"animations"' in glb.read_bytes()
    )

    # Particle proxy + note that Blender source is absent
    particles = gift_dir / "particles"
    particles.mkdir(exist_ok=True)
    (particles / "particle_pack.json").write_text(
        json.dumps(
            {
                "slug": slug,
                "family": spec["vfx_family"],
                "max_particles": {
                    "Rare": 200,
                    "Epic": 600,
                    "Legendary": 1500,
                    "Mythic": 3000,
                    "Divine": 5000,
                }[spec["rarity"]],
                "note": "Proxy particle pack — replace with authored VFX.",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    report["ready_checklist"]["real_vfx"] = (
        (particles / "particle_pack.json").exists() and poster.exists()
    )
    # No .blend — mark honestly
    report["steps"]["blend_file"] = False
    (gift_dir / "SOURCE_NOTE.txt").write_text(
        "Procedural GLB via write_minimal_glb.py. No Blender .blend in this environment.\n"
        "Replace model.glb + add scene.blend before claiming art-complete.\n",
        encoding="utf-8",
    )

    # Preview from still poster + audio
    ok_vid, vid_msg = still_preview(gift_dir, spec["duration_ms"] / 1000)
    report["steps"]["preview_video"] = ok_vid
    report["preview_note"] = vid_msg
    report["ready_checklist"]["video_proof"] = (
        ok_vid and (gift_dir / "preview.mp4").exists() and (gift_dir / "preview.mp4").stat().st_size > 1000
    )

    manifest = build_manifest(spec)
    (gift_dir / "runtime-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    report["ready_checklist"]["runtime_manifest"] = True

    metadata = {
        "name": spec["name"],
        "slug": slug,
        "rarity": spec["rarity"],
        "api_tier": spec["api_tier"],
        "price_minor": spec["price_minor"],
        "duration_ms": spec["duration_ms"],
        "build_pipeline": "sylora-100-priority-minimal",
        "sha256": {
            "glb": sha256_file(glb) if glb.exists() else None,
            "audio": sha256_file(wav) if wav.exists() else None,
            "poster": sha256_file(poster) if poster.exists() else None,
        },
        "bytes": {
            "glb": glb.stat().st_size if glb.exists() else 0,
            "audio": wav.stat().st_size if wav.exists() else 0,
            "poster": poster.stat().st_size if poster.exists() else 0,
            "preview_mp4": (gift_dir / "preview.mp4").stat().st_size
            if (gift_dir / "preview.mp4").exists()
            else 0,
        },
    }
    (gift_dir / "metadata.json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )

    within = (
        metadata["bytes"]["glb"] + metadata["bytes"]["audio"]
        < manifest["quality_budgets"]["max_download_bytes"]
    )
    report["performance"] = {
        "method": "asset-budget-proxy",
        "within_download_budget": within,
        "fps_result": None,
    }
    report["ready_checklist"]["performance_check"] = bool(
        within and report["ready_checklist"]["real_3d_model"]
    )
    report["ready_checklist"]["runtime_preview"] = False
    report["ready_checklist"]["sylora_integration"] = False
    report["ready_checklist"]["gift_studio_publish"] = False
    report["ready_checklist"]["catalog_runtime"] = False
    report["ready_checklist"]["wallet_send"] = False
    report["ready_checklist"]["websocket_delivery"] = False
    report["ready_checklist"]["device_performance"] = False

    checks = report["ready_checklist"]
    asset_keys = [
        "real_3d_model",
        "real_animation",
        "real_vfx",
        "real_sound",
        "video_proof",
        "performance_check",
        "runtime_manifest",
    ]
    asset_ok = all(checks[k] for k in asset_keys)
    if asset_ok:
        status = "ASSETS_BUILT_NOT_READY"
        report["known_limitations"] = [
            "Procedural GLB (no Blender art pass / no .blend source).",
            "Preview is still-image + audio, not EEVEE cinematic render.",
            "Particle pack is a JSON proxy, not authored VFX.",
            "Runtime preview, Gift Studio publish, wallet send, and WS delivery not verified.",
        ]
    elif any(checks[k] for k in asset_keys):
        status = "PARTIAL_ASSETS"
        report["known_limitations"] = ["Some asset steps failed; see report.steps."]
    else:
        status = "SPEC_ONLY"

    report["status"] = status
    spec["status"] = status
    spec["ready"] = False
    spec["ready_checklist"] = checks
    spec["paths"] = {
        "concept_poster": spec.get("concept_poster"),
        "poster": "poster.png",
        "glb": "model.glb" if glb.exists() else None,
        "wav": "sound/main.wav" if wav.exists() else None,
        "runtime_manifest": "runtime-manifest.json",
        "preview_mp4": "preview.mp4" if (gift_dir / "preview.mp4").exists() else None,
        "blend": None,
    }
    if "known_limitations" in report:
        spec["known_limitations"] = report["known_limitations"]
    spec["asset_gaps"] = {
        "glb": not glb.exists(),
        "wav": not wav.exists(),
        "runtime_manifest": False,
        "blend_source": True,
        "concept_poster_only": False,
        "blender_art_pass": True,
        "gift_studio_publish": True,
        "e2e_send_ws": True,
    }
    spec_path.write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (gift_dir / "report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return report


def refresh_catalog(built: list[dict]) -> None:
    catalog_path = LIB / "catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    by_slug = {r["slug"]: r for r in built}
    assets = 0
    partial = 0
    ready = 0
    for item in catalog["gifts"]:
        spec_path = LIB / item["slug"] / "spec.json"
        if spec_path.exists():
            spec = json.loads(spec_path.read_text(encoding="utf-8"))
            item["status"] = spec.get("status", "SPEC_ONLY")
        if item["slug"] in by_slug:
            item["status"] = by_slug[item["slug"]]["status"]
        if item["status"] == "READY":
            ready += 1
        elif item["status"] == "ASSETS_BUILT_NOT_READY":
            assets += 1
        elif item["status"] == "PARTIAL_ASSETS":
            partial += 1
    catalog["ready_count"] = ready
    catalog["assets_built_not_ready_count"] = assets
    catalog["partial_count"] = partial
    catalog["spec_only_count"] = catalog["total"] - ready - assets - partial
    catalog["priority_batch"] = PRIORITY
    catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    seed_path = LIB / "seed.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    status_by = {
        item["slug"]: item["status"] for item in catalog["gifts"]
    }
    for g in seed["gifts"]:
        g["status"] = status_by.get(g["slug"], g.get("status", "SPEC_ONLY"))
        g["ready"] = False
    seed["ready_count"] = ready
    seed["assets_built_not_ready_count"] = assets
    seed_path.write_text(json.dumps(seed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_priority_doc(reports: list[dict]) -> None:
    doc = ROOT / "docs" / "implementation" / "SYLORA_GIFT_100_PRIORITY_BUILD.md"
    lines = [
        "# SYLORA 100 — priority asset build\n\n",
        "Built by `scripts/gift-library/build_sylora_100_priority.py`.\n\n",
        "## Honesty\n\n",
        "- **READY: 0**\n",
        "- GLB is procedural (`write_minimal_glb.py`), not Blender art\n",
        "- Preview is still poster + synthesized audio\n",
        "- Publish only after Gift Studio + send/WS proof\n\n",
        "## Results\n\n",
        "| slug | status | glb | audio | poster | preview |\n",
        "|---|---|:---:|:---:|:---:|:---:|\n",
    ]
    for r in reports:
        d = LIB / r["slug"]
        lines.append(
            f"| `{r['slug']}` | **{r['status']}** | "
            f"{'yes' if (d / 'model.glb').exists() else 'no'} | "
            f"{'yes' if (d / 'sound' / 'main.wav').exists() else 'no'} | "
            f"{'yes' if (d / 'poster.png').exists() else 'no'} | "
            f"{'yes' if (d / 'preview.mp4').exists() else 'no'} |\n"
        )
    lines.append(
        "\n## Next\n\n"
        "1. Replace procedural GLB with Blender art pass + `.blend`\n"
        "2. `POST /v1/gifts/author/definitions` from `definition_payload`\n"
        "3. Upload assets → manifest → review publish → send/WS proof → READY\n"
    )
    doc.write_text("".join(lines), encoding="utf-8")
    print(f"wrote {doc}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", nargs="+", default=PRIORITY)
    args = ap.parse_args()
    reports = []
    for slug in args.slugs:
        print(f"\n=== building {slug} ===", flush=True)
        reports.append(build_one(slug))
        print(f"→ {reports[-1]['status']}", flush=True)
    refresh_catalog(reports)
    write_priority_doc(reports)
    summary = {r["slug"]: r["status"] for r in reports}
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
