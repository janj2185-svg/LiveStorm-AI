#!/usr/bin/env python3
"""Orchestrate Celestial Phoenix production assets for SYLORA."""

from __future__ import annotations

import hashlib
import json
import math
import struct
import subprocess
import sys
import uuid
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "gift-library" / "celestial-phoenix"
SCRIPT = Path(__file__).resolve().parent / "build_celestial_phoenix.py"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_wav(path: Path, samples: list[float], rate: int = 44100) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        frames = bytearray()
        for i, s in enumerate(samples):
            l = max(-1.0, min(1.0, s))
            r = max(-1.0, min(1.0, s * (0.8 + 0.2 * math.sin(i * 0.0007))))
            frames += struct.pack("<hh", int(l * 28000), int(r * 28000))
        wf.writeframes(frames)


def synth_phoenix_score(duration_s: float = 15.0) -> list[float]:
    """Original cinematic bed: low drone, portal tear, wing whoosh, choir-ish pad, finale hit."""
    rate = 44100
    n = int(rate * duration_s)
    out: list[float] = []
    for i in range(n):
        t = i / rate
        env = min(1.0, t * 2.0) * max(0.0, 1.0 - max(0.0, (t - 13.0) / 2.0))
        # cosmic drone
        drone = 0.22 * math.sin(2 * math.pi * 55 * t)
        drone += 0.12 * math.sin(2 * math.pi * 82.5 * t + 0.3)
        # portal shimmer
        shimmer = 0.08 * math.sin(2 * math.pi * 660 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.4 * t))
        if 0.5 < t < 2.5:
            shimmer += 0.15 * math.sin(2 * math.pi * (400 + (t - 0.5) * 200) * t)
        # wing whoosh clusters
        whoosh = 0.0
        for center in (3.0, 5.5, 8.0, 10.5):
            d = abs(t - center)
            if d < 0.45:
                whoosh += (1 - d / 0.45) * 0.18 * math.sin(2 * math.pi * 180 * t)
                noise = ((i * 1103515245) % 1000) / 1000.0 - 0.5
                whoosh += (1 - d / 0.45) * 0.06 * noise
        # choir pad (detuned)
        pad = 0.1 * math.sin(2 * math.pi * 220 * t)
        pad += 0.08 * math.sin(2 * math.pi * 277.2 * t)
        pad += 0.07 * math.sin(2 * math.pi * 329.6 * t)
        if t > 11.5:
            pad *= 1.6
        # finale star burst
        finale = 0.0
        if t > 13.2:
            finale = 0.25 * math.sin(2 * math.pi * 110 * t) * math.exp(-(t - 13.2) * 2.5)
            finale += 0.12 * (((i * 7919) % 200) / 200.0 - 0.5)
        # soft phoenix cry (formant-ish)
        cry = 0.0
        if 7.2 < t < 8.0:
            cry = 0.14 * math.sin(2 * math.pi * 880 * t) * math.sin(math.pi * (t - 7.2) / 0.8)
        s = env * (drone + shimmer + whoosh + pad * 0.7 + finale + cry) * 0.55
        out.append(s)
    return out


def build_manifest(asset_ids: dict[str, str], duration_ms: int = 15000) -> dict:
    glb = asset_ids["glb"]
    audio = asset_ids["audio"]
    poster = asset_ids["poster"]
    return {
        "schema_version": "1.0",
        "renderer_targets": ["threejs", "flutter"],
        "source_metadata": {
            "application": "blender",
            "version": "4.0.2",
            "source_asset_id": asset_ids["blend"],
            "license_reference": "SYLORA-original-IP-celestial-phoenix",
        },
        "duration_ms": duration_ms,
        "assets": [
            {"asset_id": glb, "role": "primary_model"},
            {"asset_id": asset_ids["glb_mobile"], "role": "low_end_fallback"},
            {"asset_id": audio, "role": "primary_audio"},
            {"asset_id": poster, "role": "poster"},
        ],
        "layers": [
            {
                "kind": "model",
                "name": "celestial_phoenix",
                "asset_id": glb,
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
                "duration_ms": duration_ms,
                "loop": False,
                "tracks": [
                    {
                        "target": "celestial_phoenix",
                        "property": "visibility",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": duration_ms, "value": True, "easing": "step"},
                        ],
                    }
                ],
            }
        ],
        "particle_systems": [
            {
                "name": "solar_feathers",
                "max_particles": 5000,
                "spawn_rate_per_second": 220,
                "texture_asset_id": None,
                "deterministic_seed": 240801,
            },
            {
                "name": "star_burst",
                "max_particles": 3000,
                "spawn_rate_per_second": 180,
                "texture_asset_id": None,
                "deterministic_seed": 240802,
            },
        ],
        "shaders": [],
        "lighting": [
            {"kind": "ambient", "color_hex": "#0A0618", "intensity": 0.35, "position": None},
            {"kind": "directional", "color_hex": "#FFD89A", "intensity": 3.5, "position": {"x": 3, "y": 6, "z": 4}},
            {"kind": "point", "color_hex": "#7A3CFF", "intensity": 4.0, "position": {"x": 0, "y": 4, "z": 0}},
        ],
        "audio": [{"asset_id": audio, "spatial": True, "peak_dbfs": -6, "autoplay": True}],
        "interaction_hooks": [
            {"hook": "arrival", "action": "sylora.gift.celestial_phoenix.play"},
            {"hook": "completion", "action": "sylora.gift.celestial_phoenix.complete"},
            {"hook": "tap", "action": "sylora.gift.celestial_phoenix.replay"},
        ],
        "combinations": [
            {
                "combination_id": "sylora.gift.celestial-phoenix",
                "compatible_combination_ids": ["sylora.gift.combo.any", "sylora.gift.combo.divine"],
                "window_seconds": 180,
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
            {"name": "portal_tear", "scope": "full_screen", "timeline_name": "main"},
            {"name": "streamer_power_up", "scope": "streamer", "timeline_name": "main"},
            {"name": "avatar_wing_glow", "scope": "avatar", "timeline_name": "main"},
            {"name": "viewer_cosmic_rain", "scope": "viewer", "timeline_name": "main"},
        ],
        "fallbacks": {
            "low_end_asset_id": asset_ids["glb_mobile"],
            "reduced_motion_asset_id": poster,
            "no_audio_asset_id": glb,
        },
        "quality_budgets": {
            "max_download_bytes": 50_000_000,
            "max_duration_ms": 16000,
            "max_particles": 8000,
            "max_shader_instructions": 1024,
            "max_audio_peak_dbfs": -1,
        },
    }


def ffmpeg_preview(duration: float) -> tuple[bool, str]:
    frames = sorted((OUT / "_frames").glob("frame_*.png"))
    audio = OUT / "sound" / "main.wav"
    mp4 = OUT / "preview.mp4"
    gif = OUT / "preview.gif"
    if not frames:
        return False, "no frames"
    list_file = OUT / "_frames" / "list.txt"
    per = max(0.08, duration / len(frames))
    with list_file.open("w") as f:
        for fr in frames:
            f.write(f"file '{fr.name}'\n")
            f.write(f"duration {per:.4f}\n")
        f.write(f"file '{frames[-1].name}'\n")
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
        "-i", str(audio),
        "-map", "0:v:0", "-map", "1:a:0",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
        "-movflags", "+faststart", str(mp4),
    ]
    r = subprocess.run(cmd, cwd=str(OUT / "_frames"), capture_output=True, text=True)
    if r.returncode != 0:
        return False, r.stderr[-800:]
    rg = subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp4), "-vf", "fps=10,scale=480:-1:flags=lanczos", "-loop", "0", str(gif)],
        capture_output=True,
        text=True,
    )
    if rg.returncode != 0:
        return False, rg.stderr[-500:]
    return True, "ok"


def verify() -> dict:
    report = {"slug": "celestial-phoenix", "checks": {}, "sizes": {}, "issues": []}
    required = {
        "scene.blend": OUT / "scene.blend",
        "model.glb": OUT / "model.glb",
        "model_mobile_lod.glb": OUT / "model_mobile_lod.glb",
        "preview.mp4": OUT / "preview.mp4",
        "preview.gif": OUT / "preview.gif",
        "poster.png": OUT / "poster.png",
        "thumbnail.png": OUT / "thumbnail.png",
        "runtime-manifest.json": OUT / "runtime-manifest.json",
        "metadata.json": OUT / "metadata.json",
        "main.wav": OUT / "sound" / "main.wav",
    }
    for name, path in required.items():
        ok = path.exists() and path.stat().st_size > 500
        report["checks"][f"exists:{name}"] = ok
        if ok:
            report["sizes"][name] = path.stat().st_size
        else:
            report["issues"].append(f"missing or tiny: {name}")

    glb = OUT / "model.glb"
    if glb.exists():
        data = glb.read_bytes()
        report["checks"]["glb_has_animations"] = b'"animations"' in data
        report["checks"]["glb_not_tiny"] = len(data) > 50_000
        if not report["checks"]["glb_has_animations"]:
            report["issues"].append("GLB missing animations chunk")

    # Blender reopen
    if (OUT / "scene.blend").exists():
        r = subprocess.run(
            [
                "blender", "-b", str(OUT / "scene.blend"), "--python-expr",
                "import bpy; print('OBJS', len(bpy.data.objects)); print('ARMATURES', len(bpy.data.armatures)); print('ACTIONS', len(bpy.data.actions)); print('OK')",
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )
        report["checks"]["blender_reopen"] = r.returncode == 0 and "OK" in r.stdout
        report["blender_stdout"] = [ln for ln in r.stdout.splitlines() if ln.startswith(("OBJS", "ARMATURES", "ACTIONS", "OK"))]
        if not report["checks"]["blender_reopen"]:
            report["issues"].append("blender reopen failed")

    # ffprobe
    for media in ("preview.mp4", "preview.gif", "poster.png"):
        p = OUT / media
        if not p.exists():
            continue
        pr = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-of", "json", str(p)],
            capture_output=True,
            text=True,
        )
        report["checks"][f"ffprobe:{media}"] = pr.returncode == 0
        if pr.returncode == 0:
            report[f"probe:{media}"] = json.loads(pr.stdout)

    # Honest performance
    report["performance"] = {
        "fps_desktop": "NOT_MEASURED_ON_DEVICE",
        "fps_mobile": "NOT_MEASURED_ON_DEVICE",
        "memory_mb": "NOT_MEASURED_ON_DEVICE",
        "load_time_ms": "NOT_MEASURED_ON_DEVICE",
        "target_fps": 60,
        "target_memory_mb": 120,
        "glb_bytes": report["sizes"].get("model.glb"),
        "mobile_glb_bytes": report["sizes"].get("model_mobile_lod.glb"),
        "within_50mb_budget": (report["sizes"].get("model.glb", 10**12) + report["sizes"].get("main.wav", 0)) < 50_000_000,
    }

    # Reject placeholders: check object names for Cube leftovers? (smoke domain may use cube)
    report["quality_gate"] = {
        "pixar_blizzard_parity": False,
        "production_ready_claim": False,
        "reason": (
            "Agent-VM Blender EEVEE cinematic candidate with organic body, feather cards, rig, "
            "multi-shot camera, particles, and audio. True Pixar/Blizzard/Unreal trailer parity "
            "requires multi-week DCC art/sim/lighting/comp outside this environment."
        ),
    }

    critical = [
        "exists:scene.blend",
        "exists:model.glb",
        "exists:preview.mp4",
        "exists:main.wav",
        "glb_has_animations",
        "blender_reopen",
    ]
    report["asset_pipeline_ok"] = all(report["checks"].get(k) for k in critical)
    report["status"] = "PARTIAL_PRODUCTION_CANDIDATE" if report["asset_pipeline_ok"] else "FAILED"
    return report


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "sound").mkdir(exist_ok=True)
    (OUT / "particles").mkdir(exist_ok=True)

    print("=== Audio ===", flush=True)
    samples = synth_phoenix_score(15.0)
    write_wav(OUT / "sound" / "main.wav", samples)
    write_wav(OUT / "sound" / "spatial_bed.wav", [s * 0.4 for s in samples])
    (OUT / "sound" / "sound_pack.json").write_text(
        json.dumps(
            {
                "slug": "celestial-phoenix",
                "tracks": ["main.wav", "spatial_bed.wav"],
                "original": True,
                "license": "SYLORA-original-synthesis",
                "voice_effects": "phoenix cry formant burst @ ~7.5s",
                "dynamic_soundtrack": True,
                "spatial": True,
            },
            indent=2,
        )
        + "\n"
    )

    print("=== Blender build (this takes several minutes) ===", flush=True)
    cmd = [
        "blender", "-b", "-P", str(SCRIPT), "--",
        "--out", str(OUT),
        "--duration", "15",
        "--fps", "24",
        "--render-frames", "36",
        "--resolution", "800",
    ]
    r = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    (OUT / "blender_stdout.log").write_text((r.stdout or "")[-50000:])
    (OUT / "blender_stderr.log").write_text((r.stderr or "")[-20000:])
    print(r.stdout[-3000:] if r.stdout else "", flush=True)
    if r.returncode != 0 or "Traceback" in (r.stdout or "") or "Traceback" in (r.stderr or ""):
        raise SystemExit(f"Blender build failed: code={r.returncode}")
    if not (OUT / "model.glb").exists():
        raise SystemExit("Blender finished without model.glb")

    print("=== FFmpeg preview ===", flush=True)
    ok, msg = ffmpeg_preview(15.0)
    print("ffmpeg", ok, msg, flush=True)

    asset_ids = {
        "glb": str(uuid.uuid5(uuid.NAMESPACE_URL, "sylora:gift:celestial-phoenix:glb")),
        "glb_mobile": str(uuid.uuid5(uuid.NAMESPACE_URL, "sylora:gift:celestial-phoenix:glb-mobile")),
        "audio": str(uuid.uuid5(uuid.NAMESPACE_URL, "sylora:gift:celestial-phoenix:audio")),
        "poster": str(uuid.uuid5(uuid.NAMESPACE_URL, "sylora:gift:celestial-phoenix:poster")),
        "blend": str(uuid.uuid5(uuid.NAMESPACE_URL, "sylora:gift:celestial-phoenix:blend")),
    }
    manifest = build_manifest(asset_ids)
    (OUT / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")

    metadata = {
        "name": "Celestial Phoenix",
        "slug": "celestial-phoenix",
        "tagline": "Where light is reborn.",
        "rarity": "Divine",
        "api_tier": "ultra_premium",
        "price_minor": 1_000_000,
        "duration_ms": 15000,
        "scenes": [
            "cosmic portal tears open",
            "phoenix emerges",
            "wings ignite into galaxies",
            "solar feathers explode",
            "circles streamer",
            "background becomes cosmic temple",
            "lands behind avatar",
            "gigantic halo forms",
            "golden fire rain",
            "explodes into stars",
        ],
        "reactions": {
            "ai": "The Celestial Phoenix has blessed the stream! Unstoppable energy!",
            "avatar": "Avatar spreads luminous wing silhouette and solar glow.",
            "streamer": "Screen shake, lighting boost, phoenix cry SFX.",
            "viewer": "Cosmic particle rain on viewer overlays; chat celebration hooks.",
            "combo": "sylora.gift.celestial-phoenix combo window 180s.",
        },
        "sha256": {
            "glb": sha256(OUT / "model.glb") if (OUT / "model.glb").exists() else None,
            "glb_mobile": sha256(OUT / "model_mobile_lod.glb") if (OUT / "model_mobile_lod.glb").exists() else None,
            "audio": sha256(OUT / "sound" / "main.wav"),
            "poster": sha256(OUT / "poster.png") if (OUT / "poster.png").exists() else None,
        },
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")

    (OUT / "particles" / "particle_pack.json").write_text(
        json.dumps(
            {
                "systems": [
                    {"name": "solar_feathers", "max": 5000, "rate": 220},
                    {"name": "star_burst", "max": 3000, "rate": 180},
                    {"name": "embers", "max": 2000, "rate": 120},
                    {"name": "golden_fire_rain", "max": 4000, "rate": 200},
                ]
            },
            indent=2,
        )
        + "\n"
    )

    report = verify()
    (OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["asset_pipeline_ok"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
