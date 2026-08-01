#!/usr/bin/env python3
"""Build READY-candidate gift assets for SYLORA and validate checklist honestly.

A gift is marked READY only when all ready_checklist items pass.
Partial successes are marked PARTIAL_ASSETS — never READY.
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
LIB = ROOT / "artifacts" / "gift-library"
SCRIPTS = Path(__file__).resolve().parent


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run(cmd: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True, timeout=timeout)


def build_manifest(spec: dict, glb_id: str, audio_id: str, poster_id: str) -> dict:
    duration = spec["duration_ms"]
    rarity = spec["rarity"]
    max_particles = {"Rare": 200, "Epic": 600, "Legendary": 1500, "Mythic": 3000, "Divine": 5000}[rarity]
    return {
        "schema_version": "1.0",
        "renderer_targets": ["threejs", "flutter"],
        "source_metadata": {
            "application": "blender",
            "version": "4.0.2",
            "source_asset_id": spec["asset_ids"]["blend"],
            "license_reference": "SYLORA-original-IP",
        },
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
                            {"time_ms": duration, "value": 360 if rarity != "Divine" else 90, "easing": "ease_in_out"},
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
            {
                "asset_id": audio_id,
                "spatial": True,
                "peak_dbfs": -6,
                "autoplay": True,
            }
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
                "scope": "full_screen" if rarity in {"Legendary", "Mythic", "Divine"} else "viewer",
                "timeline_name": "main",
            }
        ],
        "fallbacks": {
            "low_end_asset_id": glb_id,
            "reduced_motion_asset_id": poster_id,
            "no_audio_asset_id": glb_id,
        },
        "quality_budgets": {
            "max_download_bytes": {"Rare": 2_000_000, "Epic": 5_000_000, "Legendary": 12_000_000, "Mythic": 25_000_000, "Divine": 50_000_000}[rarity],
            "max_duration_ms": max(duration, duration + 1000),
            "max_particles": max_particles,
            "max_shader_instructions": 256,
            "max_audio_peak_dbfs": -1,
        },
    }


def ffmpeg_preview(gift_dir: Path, duration: float) -> tuple[bool, str]:
    frames = sorted((gift_dir / "_frames").glob("frame_*.png"))
    audio = gift_dir / "sound" / "main.wav"
    mp4 = gift_dir / "preview.mp4"
    gif = gift_dir / "preview.gif"
    if not frames:
        return False, "no preview frames"
    # image2 sequence
    list_file = gift_dir / "_frames" / "list.txt"
    # Use concat demuxer with file list and duration per frame
    per = max(0.08, duration / max(1, len(frames)))
    with list_file.open("w") as f:
        for fr in frames:
            f.write(f"file '{fr.name}'\n")
            f.write(f"duration {per:.4f}\n")
        f.write(f"file '{frames[-1].name}'\n")
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-i", str(audio) if audio.exists() else str(frames[0]),
        "-map", "0:v:0",
    ]
    if audio.exists():
        cmd += ["-map", "1:a:0", "-c:a", "aac", "-shortest"]
    cmd += ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4)]
    r = run(cmd, timeout=180)
    if r.returncode != 0:
        # retry video-only
        cmd2 = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", str(mp4),
        ]
        r = run(cmd2, timeout=180)
        if r.returncode != 0:
            return False, r.stderr[-500:]
    # gif from mp4
    rg = run([
        "ffmpeg", "-y", "-i", str(mp4),
        "-vf", "fps=8,scale=320:-1:flags=lanczos",
        "-loop", "0", str(gif),
    ], timeout=120)
    if rg.returncode != 0:
        return False, rg.stderr[-500:]
    return mp4.exists() and gif.exists(), "ok"


def validate_glb_has_animation(glb: Path) -> bool:
    # Minimal GLB parse: look for "animations" ASCII chunk
    data = glb.read_bytes()
    return b'"animations"' in data and len(data) > 1500


def build_one(slug: str, claim_ready: bool = False) -> dict:
    gift_dir = LIB / slug
    spec_path = gift_dir / "spec.json"
    if not spec_path.exists():
        raise SystemExit(f"missing spec for {slug}")
    spec = json.loads(spec_path.read_text())
    report = {
        "slug": slug,
        "steps": {},
        "ready_checklist": dict(spec.get("ready_checklist", {})),
        "status": "SPEC_ONLY",
    }

    # 1) Audio
    audio_r = run([
        sys.executable, str(SCRIPTS / "synthesize_audio.py"),
        "--out", str(gift_dir / "sound"),
        "--slug", slug,
        "--duration", str(spec["duration_ms"] / 1000),
        "--family", spec["vfx_family"],
    ])
    report["steps"]["audio"] = audio_r.returncode == 0
    wav = gift_dir / "sound" / "main.wav"
    report["ready_checklist"]["real_sound"] = wav.exists() and wav.stat().st_size > 1000

    # 2) Blender build
    br = run([
        "blender", "-b", "-P", str(SCRIPTS / "blender_build_gift.py"), "--",
        "--slug", slug,
        "--out", str(gift_dir),
        "--family", spec["form_family"],
        "--vfx", spec["vfx_family"],
        "--duration", str(spec["duration_ms"] / 1000),
        "--rarity", spec["rarity"],
        "--name", spec["name"],
    ], timeout=900)
    report["steps"]["blender"] = br.returncode == 0
    if br.returncode != 0:
        report["blender_stderr"] = (br.stderr or br.stdout)[-2000:]
    glb = gift_dir / "model.glb"
    blend = gift_dir / "scene.blend"
    poster = gift_dir / "poster.png"
    report["ready_checklist"]["real_3d_model"] = glb.exists() and glb.stat().st_size > 1500
    report["ready_checklist"]["real_animation"] = glb.exists() and validate_glb_has_animation(glb)
    report["ready_checklist"]["real_vfx"] = (gift_dir / "particles" / "particle_pack.json").exists() and poster.exists()
    report["steps"]["blend_file"] = blend.exists()

    # 3) Preview video
    ok_vid, vid_msg = ffmpeg_preview(gift_dir, spec["duration_ms"] / 1000)
    report["steps"]["preview_video"] = ok_vid
    report["preview_note"] = vid_msg
    report["ready_checklist"]["video_proof"] = ok_vid and (gift_dir / "preview.mp4").stat().st_size > 1000

    # 4) Manifest + metadata
    glb_id = spec["asset_ids"]["glb"]
    audio_id = spec["asset_ids"]["audio"]
    poster_id = spec["asset_ids"]["poster"]
    manifest = build_manifest(spec, glb_id, audio_id, poster_id)
    (gift_dir / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    metadata = {
        "name": spec["name"],
        "slug": slug,
        "rarity": spec["rarity"],
        "api_tier": spec["api_tier"],
        "price_minor": spec["price_minor"],
        "duration_ms": spec["duration_ms"],
        "sha256": {
            "glb": sha256_file(glb) if glb.exists() else None,
            "audio": sha256_file(wav) if wav.exists() else None,
            "poster": sha256_file(poster) if poster.exists() else None,
        },
        "bytes": {
            "glb": glb.stat().st_size if glb.exists() else 0,
            "audio": wav.stat().st_size if wav.exists() else 0,
            "poster": poster.stat().st_size if poster.exists() else 0,
            "preview_mp4": (gift_dir / "preview.mp4").stat().st_size if (gift_dir / "preview.mp4").exists() else 0,
        },
    }
    (gift_dir / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")

    # 5) Performance proxy (file sizes / duration budgets — not device FPS)
    perf = {
        "method": "asset-budget-proxy",
        "note": "Device FPS/memory require browser/runtime measurement; this records budget compliance only.",
        "glb_bytes": metadata["bytes"]["glb"],
        "audio_bytes": metadata["bytes"]["audio"],
        "within_download_budget": metadata["bytes"]["glb"] + metadata["bytes"]["audio"] < manifest["quality_budgets"]["max_download_bytes"],
        "fps_result": None,
        "memory_result_mb": None,
        "load_time_ms": None,
    }
    report["performance"] = perf
    report["ready_checklist"]["performance_check"] = bool(perf["within_download_budget"] and report["ready_checklist"]["real_3d_model"])

    # Runtime preview / SYLORA integration cannot be claimed without live stack
    report["ready_checklist"]["runtime_preview"] = False
    report["ready_checklist"]["sylora_integration"] = False

    checks = report["ready_checklist"]
    asset_ok = all(checks[k] for k in ["real_3d_model", "real_animation", "real_vfx", "real_sound", "video_proof", "performance_check"])
    if claim_ready and asset_ok and checks["runtime_preview"] and checks["sylora_integration"]:
        status = "READY"
    elif asset_ok:
        status = "ASSETS_BUILT_NOT_READY"
        report["known_limitations"] = [
            "Assets built (Blender/GLB/animation/VFX proxy/audio/preview) but runtime preview + SYLORA wallet/WS integration not verified in this environment.",
            "EEVEE short-frame preview is not a full cinematic art-pass.",
            "Procedural unique meshes are original but not hand-sculpted AAA character work.",
        ]
    elif any(checks.values()):
        status = "PARTIAL_ASSETS"
        report["known_limitations"] = ["Some assets failed; see steps."]
    else:
        status = "SPEC_ONLY"

    report["status"] = status
    spec["status"] = status
    spec["ready_checklist"] = checks
    if "known_limitations" in report:
        spec["known_limitations"] = report["known_limitations"]
    spec_path.write_text(json.dumps(spec, indent=2) + "\n")
    (gift_dir / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def refresh_catalog() -> None:
    catalog_path = LIB / "catalog.json"
    catalog = json.loads(catalog_path.read_text())
    ready = 0
    assets = 0
    partial = 0
    for item in catalog["gifts"]:
        spec = json.loads((LIB / item["slug"] / "spec.json").read_text())
        item["status"] = spec["status"]
        if spec["status"] == "READY":
            ready += 1
        elif spec["status"] == "ASSETS_BUILT_NOT_READY":
            assets += 1
        elif spec["status"] == "PARTIAL_ASSETS":
            partial += 1
    catalog["ready_count"] = ready
    catalog["assets_built_not_ready_count"] = assets
    catalog["partial_count"] = partial
    catalog["spec_only_count"] = 100 - ready - assets - partial
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n")
    mirror = ROOT / "src" / "screens" / "commerce" / "gift-library-catalog.json"
    mirror.write_text(json.dumps(catalog, indent=2) + "\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", nargs="+", help="gift slugs to build")
    ap.add_argument("--rarity", help="build first N of rarity")
    ap.add_argument("--limit", type=int, default=1)
    ap.add_argument("--all-rare-first", type=int, default=0, help="build N rare gifts")
    args = ap.parse_args()

    catalog = json.loads((LIB / "catalog.json").read_text())
    slugs: list[str] = []
    if args.slugs:
        slugs = args.slugs
    elif args.all_rare_first:
        slugs = [g["slug"] for g in catalog["gifts"] if g["rarity"] == "Rare"][: args.all_rare_first]
    elif args.rarity:
        slugs = [g["slug"] for g in catalog["gifts"] if g["rarity"] == args.rarity][: args.limit]
    else:
        # one per rarity by default
        for rarity in ["Rare", "Epic", "Legendary", "Mythic", "Divine"]:
            for g in catalog["gifts"]:
                if g["rarity"] == rarity:
                    slugs.append(g["slug"])
                    break
        slugs = slugs[: args.limit] if args.limit and args.limit < 5 else slugs

    results = []
    for slug in slugs:
        print(f"\n=== Building {slug} ===", flush=True)
        try:
            results.append(build_one(slug))
        except Exception as e:
            results.append({"slug": slug, "status": "ERROR", "error": str(e)})
    refresh_catalog()
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
