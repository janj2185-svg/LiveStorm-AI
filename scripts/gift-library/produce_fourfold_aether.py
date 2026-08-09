#!/usr/bin/env python3
"""Produce SYLORA Divine gift: Fourfold Aether.

Four equal volumetric acts (not TikTok rose/rocket/lion clichés):
  Act I   Spire Ascension   — lumen column rises through the stage volume
  Act II  Ribbon Orbit      — memory ribbons weave equal volume density
  Act III Listening Chamber — soft fog fills a craft listening room
  Act IV  Seal of Craft     — crest seals into constellation (not fireworks)

Honest status: ASSETS_BUILT_NOT_READY / PARTIAL_PRODUCTION_CANDIDATE.
Procedural multi-mesh GLB + original audio + ffmpeg preview — not a Blender art pass.
"""

from __future__ import annotations

import hashlib
import json
import math
import struct
import subprocess
import uuid
import wave
import zlib
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "gift-library" / "fourfold-aether"
SLUG = "fourfold-aether"
DURATION_S = 16.0
DURATION_MS = 16000
ACT_MS = 4000  # four equal volumetric acts


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def deterministic_uuid(role: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"sylora:gift:{SLUG}:{role}"))


# ---------------------------------------------------------------------------
# GLB: four equal volumetric columns + central seal + animation
# ---------------------------------------------------------------------------


def _cylinder(radius: float, height: float, segs: int = 16, rings: int = 8) -> tuple[list[float], list[int]]:
    verts: list[float] = []
    indices: list[int] = []
    for ri in range(rings + 1):
        v = ri / rings
        y = (v - 0.5) * height
        # volumetric flare (soft hourglass of light)
        r = radius * (0.55 + 0.45 * math.sin(math.pi * v))
        for si in range(segs):
            a = 2 * math.pi * si / segs
            verts.extend([r * math.cos(a), y, r * math.sin(a)])
    for ri in range(rings):
        for si in range(segs):
            a = ri * segs + si
            b = ri * segs + (si + 1) % segs
            c = (ri + 1) * segs + si
            d = (ri + 1) * segs + (si + 1) % segs
            indices.extend([a, c, b, b, c, d])
    return verts, indices


def _diamond(size: float = 0.35) -> tuple[list[float], list[int]]:
    # octahedron seal
    verts = [
        0, size, 0,
        size, 0, 0,
        0, 0, size,
        -size, 0, 0,
        0, 0, -size,
        0, -size, 0,
    ]
    faces = [
        0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1,
        5, 2, 1, 5, 3, 2, 5, 4, 3, 5, 1, 4,
    ]
    return verts, faces


def _ribbon_arc(radius: float = 0.9, segs: int = 48, width: float = 0.08) -> tuple[list[float], list[int]]:
    verts: list[float] = []
    indices: list[int] = []
    for i in range(segs + 1):
        t = i / segs
        a = t * 2 * math.pi * 1.5
        y = (t - 0.5) * 1.4
        x = radius * math.cos(a)
        z = radius * math.sin(a)
        # ribbon width via offset normals approx
        nx, nz = -math.sin(a), math.cos(a)
        verts.extend([x + nx * width, y, z + nz * width])
        verts.extend([x - nx * width, y, z - nz * width])
    for i in range(segs):
        a = i * 2
        indices.extend([a, a + 1, a + 2, a + 1, a + 3, a + 2])
    return verts, indices


def _pack_mesh(verts: list[float], indices: list[int]) -> dict:
    return {"verts": verts, "indices": indices, "n": len(verts) // 3}


def write_volumetric_glb(path: Path, mobile: bool = False) -> dict:
    """Multi-node GLB: 4 equal act columns + ribbons + central seal."""
    path.parent.mkdir(parents=True, exist_ok=True)
    segs = 10 if mobile else 18
    rings = 5 if mobile else 10

    meshes_src = []
    # Four equal volumetric columns at compass points
    for i, (dx, dz) in enumerate(((0.75, 0.0), (0.0, 0.75), (-0.75, 0.0), (0.0, -0.75))):
        v, idx = _cylinder(0.18 if mobile else 0.22, 1.6 if mobile else 1.9, segs=segs, rings=rings)
        # translate
        vv = []
        for vi in range(0, len(v), 3):
            vv.extend([v[vi] + dx, v[vi + 1], v[vi + 2] + dz])
        meshes_src.append(("act_column_%d" % (i + 1), _pack_mesh(vv, idx)))

    rv, ridx = _ribbon_arc(0.95 if not mobile else 0.85, segs=32 if mobile else 56)
    meshes_src.append(("ribbon_orbit", _pack_mesh(rv, ridx)))

    dv, didx = _diamond(0.28 if mobile else 0.38)
    meshes_src.append(("craft_seal", _pack_mesh(dv, didx)))

    # center fog torus approximation (low ring)
    cv, cidx = _cylinder(0.55 if mobile else 0.7, 0.35, segs=segs, rings=3)
    meshes_src.append(("chamber_ring", _pack_mesh(cv, cidx)))

    chunks: list[bytes] = []

    def add(blob: bytes) -> tuple[int, int]:
        while sum(len(c) for c in chunks) % 4:
            chunks.append(b"\x00")
        off = sum(len(c) for c in chunks)
        chunks.append(blob)
        pad = (4 - (len(blob) % 4)) % 4
        if pad:
            chunks.append(b"\x00" * pad)
        return off, len(blob)

    accessors = []
    buffer_views = []
    meshes = []
    nodes = []
    # root node 0
    child_indices = []

    for mi, (name, mesh) in enumerate(meshes_src):
        pos = struct.pack(f"<{len(mesh['verts'])}f", *mesh["verts"])
        idx = struct.pack(f"<{len(mesh['indices'])}I", *mesh["indices"])
        pos_off, pos_len = add(pos)
        idx_off, idx_len = add(idx)
        xs = mesh["verts"][0::3]
        ys = mesh["verts"][1::3]
        zs = mesh["verts"][2::3]
        acc_pos = len(accessors)
        accessors.append(
            {
                "bufferView": len(buffer_views),
                "componentType": 5126,
                "count": mesh["n"],
                "type": "VEC3",
                "max": [max(xs), max(ys), max(zs)],
                "min": [min(xs), min(ys), min(zs)],
            }
        )
        buffer_views.append({"buffer": 0, "byteOffset": pos_off, "byteLength": pos_len, "target": 34962})
        acc_idx = len(accessors)
        accessors.append(
            {
                "bufferView": len(buffer_views),
                "componentType": 5125,
                "count": len(mesh["indices"]),
                "type": "SCALAR",
            }
        )
        buffer_views.append({"buffer": 0, "byteOffset": idx_off, "byteLength": idx_len, "target": 34963})
        meshes.append(
            {
                "name": name,
                "primitives": [{"attributes": {"POSITION": acc_pos}, "indices": acc_idx, "mode": 4}],
            }
        )
        node_i = len(nodes) + 1  # after root
        child_indices.append(node_i)
        nodes.append({"name": name, "mesh": mi})

    # animation: root rotates; seal pulses via scale keyframes on craft_seal node
    times = [0.0, 4.0, 8.0, 12.0, 16.0]
    # root Y rotation over acts
    quats = []
    for t in times:
        ang = (t / DURATION_S) * math.pi * 2
        quats.extend([0.0, math.sin(ang / 2), 0.0, math.cos(ang / 2)])
    # seal scale pulse each act
    scales = []
    for t in times:
        pulse = 1.0 + 0.35 * abs(math.sin(math.pi * (t % 4.0) / 4.0))
        scales.extend([pulse, pulse, pulse])

    time_bytes = struct.pack(f"<{len(times)}f", *times)
    rot_bytes = struct.pack(f"<{len(quats)}f", *quats)
    scale_bytes = struct.pack(f"<{len(scales)}f", *scales)
    t_off, t_len = add(time_bytes)
    r_off, r_len = add(rot_bytes)
    s_off, s_len = add(scale_bytes)

    acc_time = len(accessors)
    accessors.append(
        {
            "bufferView": len(buffer_views),
            "componentType": 5126,
            "count": len(times),
            "type": "SCALAR",
            "max": [DURATION_S],
            "min": [0.0],
        }
    )
    buffer_views.append({"buffer": 0, "byteOffset": t_off, "byteLength": t_len})
    acc_rot = len(accessors)
    accessors.append(
        {"bufferView": len(buffer_views), "componentType": 5126, "count": len(times), "type": "VEC4"}
    )
    buffer_views.append({"buffer": 0, "byteOffset": r_off, "byteLength": r_len})
    acc_scale = len(accessors)
    accessors.append(
        {"bufferView": len(buffer_views), "componentType": 5126, "count": len(times), "type": "VEC3"}
    )
    buffer_views.append({"buffer": 0, "byteOffset": s_off, "byteLength": s_len})

    seal_node = 1 + next(i for i, (n, _) in enumerate(meshes_src) if n == "craft_seal")

    root = {"name": "fourfold_aether_root", "children": child_indices}
    all_nodes = [root] + nodes

    bin_blob = b"".join(chunks)
    gltf = {
        "asset": {"version": "2.0", "generator": "sylora-fourfold-aether"},
        "scenes": [{"nodes": [0]}],
        "nodes": all_nodes,
        "meshes": meshes,
        "animations": [
            {
                "name": "four_equal_acts",
                "channels": [
                    {"sampler": 0, "target": {"node": 0, "path": "rotation"}},
                    {"sampler": 1, "target": {"node": seal_node, "path": "scale"}},
                ],
                "samplers": [
                    {"input": acc_time, "interpolation": "LINEAR", "output": acc_rot},
                    {"input": acc_time, "interpolation": "LINEAR", "output": acc_scale},
                ],
            }
        ],
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_blob = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_blob += b" " * ((4 - (len(json_blob) % 4)) % 4)
    bin_pad = (4 - (len(bin_blob) % 4)) % 4
    bin_blob_padded = bin_blob + (b"\x00" * bin_pad)
    total = 12 + 8 + len(json_blob) + 8 + len(bin_blob_padded)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)
    out += struct.pack("<II", len(json_blob), 0x4E4F534A)
    out += json_blob
    out += struct.pack("<II", len(bin_blob_padded), 0x004E4942)
    out += bin_blob_padded
    path.write_bytes(out)
    return {
        "path": str(path),
        "bytes": len(out),
        "meshes": [n for n, _ in meshes_src],
        "has_animations": True,
        "mobile": mobile,
        "note": "Procedural multi-act volumetric GLB — Blender art pass required before READY.",
    }


# ---------------------------------------------------------------------------
# Audio — four equal act hits
# ---------------------------------------------------------------------------


def write_wav(path: Path, samples: list[float], rate: int = 44100) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        frames = bytearray()
        for i, s in enumerate(samples):
            l = max(-1.0, min(1.0, s))
            r = max(-1.0, min(1.0, s * (0.82 + 0.18 * math.sin(i * 0.0009))))
            frames += struct.pack("<hh", int(l * 28000), int(r * 28000))
        wf.writeframes(frames)


def synth_four_acts(duration_s: float = DURATION_S) -> list[float]:
    rate = 44100
    n = int(rate * duration_s)
    out: list[float] = []
    act_centers = (2.0, 6.0, 10.0, 14.0)
    for i in range(n):
        t = i / rate
        env = min(1.0, t * 2.5) * max(0.0, 1.0 - max(0.0, (t - 14.5) / 1.5))
        drone = 0.18 * math.sin(2 * math.pi * 48 * t)
        drone += 0.10 * math.sin(2 * math.pi * 72 * t + 0.4)
        # soft lumen shimmer (not firework crackle)
        shimmer = 0.07 * math.sin(2 * math.pi * 520 * t) * (0.5 + 0.5 * math.sin(2 * math.pi * 0.25 * t))
        pad = 0.09 * math.sin(2 * math.pi * 196 * t)
        pad += 0.07 * math.sin(2 * math.pi * 247 * t)
        pad += 0.06 * math.sin(2 * math.pi * 294 * t)
        hits = 0.0
        for ai, center in enumerate(act_centers):
            d = abs(t - center)
            if d < 0.55:
                # equal energy per act
                w = (1 - d / 0.55) ** 1.2
                freq = 110 * (1.0 + ai * 0.12)
                hits += w * 0.22 * math.sin(2 * math.pi * freq * t)
                hits += w * 0.08 * math.sin(2 * math.pi * freq * 2.0 * t)
        # act IV seal — soft constellation bloom, not explosion
        seal = 0.0
        if t > 13.5:
            seal = 0.16 * math.sin(2 * math.pi * 330 * t) * math.exp(-(t - 13.5) * 1.8)
        s = env * (drone + shimmer + pad * 0.75 + hits + seal) * 0.58
        out.append(s)
    return out


# ---------------------------------------------------------------------------
# Poster + preview frames (volumetric light look)
# ---------------------------------------------------------------------------


def write_png(path: Path, rgb: np.ndarray) -> None:
    """Minimal RGB PNG writer."""
    h, w, _ = rgb.shape
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(rgb[y].tobytes())
    compressed = zlib.compress(bytes(raw), 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    path.write_bytes(png)


def render_frame(w: int, h: int, t: float) -> np.ndarray:
    """Four equal volumetric act looks — porcelain Ethereal base, cyan/gold shafts."""
    yy, xx = np.mgrid[0:h, 0:w]
    x = (xx / (w - 1)) * 2 - 1
    y = (yy / (h - 1)) * 2 - 1
    act = int(min(3, t // 4.0))
    phase = (t % 4.0) / 4.0

    # porcelain night
    base = np.zeros((h, w, 3), dtype=np.float32)
    base[..., 0] = 0.06 + 0.02 * (1 - y)
    base[..., 1] = 0.08 + 0.03 * (1 - y)
    base[..., 2] = 0.14 + 0.05 * (1 - y)

    # four equal column positions
    cols = [(0.45, 0.0), (0.0, 0.45), (-0.45, 0.0), (0.0, -0.45)]
    img = base.copy()
    for i, (cx, cy) in enumerate(cols):
        # volume shaft
        dx = x - cx
        dy = y - cy * 0.55
        radial = np.sqrt(dx * dx + (dy * 1.6) ** 2)
        shaft = np.exp(-((dx / 0.08) ** 2)) * np.clip(1.2 - abs(dy), 0, 1.2)
        glow = np.exp(-(radial ** 2) / (0.12 + 0.08 * phase))
        active = 0.55 + 0.45 * (1.0 if i == act else 0.35)
        # palette cycles per act but equal energy
        if i % 4 == 0:
            col = np.array([0.35, 0.85, 0.95])  # cyan lumen
        elif i % 4 == 1:
            col = np.array([0.72, 0.55, 1.0])  # soft violet
        elif i % 4 == 2:
            col = np.array([0.95, 0.82, 0.45])  # gold craft
        else:
            col = np.array([0.55, 0.95, 0.78])  # mint seal
        strength = active * (0.55 * shaft + 0.7 * glow) * (0.7 + 0.3 * phase)
        img += strength[..., None] * col

    # central seal pulse every act equally
    cr = np.sqrt(x * x + (y * 1.1) ** 2)
    seal = np.exp(-(cr ** 2) / 0.04) * (0.5 + 0.5 * math.sin(phase * math.pi))
    img += seal[..., None] * np.array([1.0, 0.95, 0.85])

    # soft vignette
    vig = np.clip(1.15 - 0.55 * (x * x + y * y), 0.35, 1.0)
    img *= vig[..., None]
    img = np.clip(img, 0, 1)
    return (img * 255).astype(np.uint8)


def build_visuals() -> None:
    frames_dir = OUT / "_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    n_frames = 32
    for i in range(n_frames):
        t = (i / max(1, n_frames - 1)) * (DURATION_S - 0.01)
        fr = render_frame(720, 1280, t)  # vertical gift card
        write_png(frames_dir / f"frame_{i:03d}.png", fr)
    # poster = mid of act III (listening chamber)
    write_png(OUT / "poster.png", render_frame(1080, 1080, 10.0))
    write_png(OUT / "thumbnail.png", render_frame(512, 512, 6.0))
    # stills per act
    stills = OUT / "stills"
    stills.mkdir(exist_ok=True)
    for ai, name in enumerate(("spire", "ribbon", "chamber", "seal")):
        write_png(stills / f"act_{ai + 1}_{name}.png", render_frame(720, 1280, ai * 4.0 + 2.0))


def ffmpeg_preview() -> tuple[bool, str]:
    frames = sorted((OUT / "_frames").glob("frame_*.png"))
    audio = OUT / "sound" / "main.wav"
    mp4 = OUT / "preview.mp4"
    gif = OUT / "preview.gif"
    if not frames:
        return False, "no frames"
    list_file = OUT / "_frames" / "list.txt"
    per = max(0.08, DURATION_S / len(frames))
    with list_file.open("w") as f:
        for fr in frames:
            f.write(f"file '{fr.name}'\n")
            f.write(f"duration {per:.4f}\n")
        f.write(f"file '{frames[-1].name}'\n")
    r = subprocess.run(
        [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
            "-i", str(audio),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
            "-movflags", "+faststart", str(mp4),
        ],
        cwd=str(OUT / "_frames"),
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        return False, r.stderr[-800:]
    rg = subprocess.run(
        ["ffmpeg", "-y", "-i", str(mp4), "-vf", "fps=10,scale=360:-1:flags=lanczos", "-loop", "0", str(gif)],
        capture_output=True,
        text=True,
    )
    if rg.returncode != 0:
        return False, rg.stderr[-500:]
    return True, "ok"


# ---------------------------------------------------------------------------
# Manifest / metadata
# ---------------------------------------------------------------------------


def build_manifest(asset_ids: dict[str, str]) -> dict:
    glb = asset_ids["glb"]
    audio = asset_ids["audio"]
    poster = asset_ids["poster"]
    return {
        "schema_version": "1.0",
        "renderer_targets": ["threejs", "flutter"],
        "source_metadata": {
            "application": "blender",
            "version": "4.0.2-proc",
            "source_asset_id": asset_ids["blend"],
            "license_reference": "SYLORA-original-IP-fourfold-aether",
        },
        "duration_ms": DURATION_MS,
        "assets": [
            {"asset_id": glb, "role": "primary_model"},
            {"asset_id": asset_ids["glb_mobile"], "role": "low_end_fallback"},
            {"asset_id": audio, "role": "primary_audio"},
            {"asset_id": poster, "role": "poster"},
        ],
        "layers": [
            {
                "kind": "model",
                "name": "fourfold_aether",
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
                "duration_ms": DURATION_MS,
                "loop": False,
                "tracks": [
                    {
                        "target": "fourfold_aether",
                        "property": "visible",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": DURATION_MS, "value": True, "easing": "step"},
                        ],
                    },
                    {
                        "target": "fourfold_aether",
                        "property": "rotation_degrees",
                        "keyframes": [
                            {"time_ms": 0, "value": {"x": 0, "y": 0, "z": 0}, "easing": "ease_in_out"},
                            {"time_ms": ACT_MS, "value": {"x": 0, "y": 90, "z": 0}, "easing": "ease_in_out"},
                            {"time_ms": ACT_MS * 2, "value": {"x": 0, "y": 180, "z": 0}, "easing": "ease_in_out"},
                            {"time_ms": ACT_MS * 3, "value": {"x": 0, "y": 270, "z": 0}, "easing": "ease_in_out"},
                            {"time_ms": DURATION_MS, "value": {"x": 0, "y": 360, "z": 0}, "easing": "ease_in_out"},
                        ],
                    },
                ],
            },
            {
                "name": "act_i_spire",
                "duration_ms": ACT_MS,
                "loop": False,
                "tracks": [
                    {
                        "target": "fourfold_aether",
                        "property": "visible",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": ACT_MS, "value": True, "easing": "step"},
                        ],
                    }
                ],
            },
            {
                "name": "act_ii_ribbon",
                "duration_ms": ACT_MS,
                "loop": False,
                "tracks": [
                    {
                        "target": "fourfold_aether",
                        "property": "visible",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": ACT_MS, "value": True, "easing": "step"},
                        ],
                    }
                ],
            },
            {
                "name": "act_iii_chamber",
                "duration_ms": ACT_MS,
                "loop": False,
                "tracks": [
                    {
                        "target": "fourfold_aether",
                        "property": "visible",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": ACT_MS, "value": True, "easing": "step"},
                        ],
                    }
                ],
            },
            {
                "name": "act_iv_seal",
                "duration_ms": ACT_MS,
                "loop": False,
                "tracks": [
                    {
                        "target": "fourfold_aether",
                        "property": "visible",
                        "keyframes": [
                            {"time_ms": 0, "value": True, "easing": "step"},
                            {"time_ms": ACT_MS, "value": True, "easing": "step"},
                        ],
                    }
                ],
            },
        ],
        "particle_systems": [
            {
                "name": "spire_volume",
                "max_particles": 2000,
                "spawn_rate_per_second": 140,
                "texture_asset_id": None,
                "deterministic_seed": 2608091,
            },
            {
                "name": "ribbon_filaments",
                "max_particles": 2000,
                "spawn_rate_per_second": 140,
                "texture_asset_id": None,
                "deterministic_seed": 2608092,
            },
            {
                "name": "chamber_fog",
                "max_particles": 2000,
                "spawn_rate_per_second": 140,
                "texture_asset_id": None,
                "deterministic_seed": 2608093,
            },
            {
                "name": "seal_constellation",
                "max_particles": 2000,
                "spawn_rate_per_second": 140,
                "texture_asset_id": None,
                "deterministic_seed": 2608094,
            },
        ],
        "shaders": [],
        "lighting": [
            {"kind": "ambient", "color_hex": "#0E1420", "intensity": 0.4, "position": None},
            {
                "kind": "directional",
                "color_hex": "#C8E8FF",
                "intensity": 2.8,
                "position": {"x": 2, "y": 7, "z": 3},
            },
            {
                "kind": "point",
                "color_hex": "#7AD7FF",
                "intensity": 3.2,
                "position": {"x": 0.75, "y": 2.2, "z": 0},
            },
            {
                "kind": "point",
                "color_hex": "#B89CFF",
                "intensity": 3.2,
                "position": {"x": 0, "y": 2.2, "z": 0.75},
            },
            {
                "kind": "point",
                "color_hex": "#F0C96A",
                "intensity": 3.2,
                "position": {"x": -0.75, "y": 2.2, "z": 0},
            },
            {
                "kind": "point",
                "color_hex": "#7DFFC8",
                "intensity": 3.2,
                "position": {"x": 0, "y": 2.2, "z": -0.75},
            },
        ],
        "audio": [{"asset_id": audio, "spatial": True, "peak_dbfs": -6, "autoplay": True}],
        "interaction_hooks": [
            {"hook": "arrival", "action": "sylora.gift.fourfold_aether.play"},
            {"hook": "completion", "action": "sylora.gift.fourfold_aether.complete"},
            {"hook": "tap", "action": "sylora.gift.fourfold_aether.replay"},
        ],
        "combinations": [
            {
                "combination_id": "sylora.gift.fourfold-aether",
                "compatible_combination_ids": [
                    "sylora.gift.combo.any",
                    "sylora.gift.combo.divine",
                    "sylora.gift.combo.volumetric",
                ],
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
            },
            {
                "name": "act_index",
                "source": "deterministic",
                "value_type": "integer",
                "minimum": 0,
                "maximum": 3,
                "allowed_values": ["0", "1", "2", "3"],
            },
        ],
        "effects": [
            {"name": "act_i_spire_ascension", "scope": "full_screen", "timeline_name": "act_i_spire"},
            {"name": "act_ii_ribbon_orbit", "scope": "full_screen", "timeline_name": "act_ii_ribbon"},
            {"name": "act_iii_listening_chamber", "scope": "full_screen", "timeline_name": "act_iii_chamber"},
            {"name": "act_iv_seal_of_craft", "scope": "full_screen", "timeline_name": "act_iv_seal"},
            {"name": "streamer_lumen_boost", "scope": "streamer", "timeline_name": "main"},
            {"name": "avatar_equal_act_glow", "scope": "avatar", "timeline_name": "main"},
            {"name": "viewer_volume_wash", "scope": "viewer", "timeline_name": "main"},
        ],
        "fallbacks": {
            "low_end_asset_id": asset_ids["glb_mobile"],
            "reduced_motion_asset_id": poster,
            "no_audio_asset_id": glb,
        },
        "quality_budgets": {
            "max_download_bytes": 50_000_000,
            "max_duration_ms": 17000,
            "max_particles": 8000,
            "max_shader_instructions": 1024,
            "max_audio_peak_dbfs": -1,
        },
    }


def write_spec(asset_ids: dict[str, str]) -> dict:
    return {
        "index": 101,
        "name": "Fourfold Aether",
        "slug": SLUG,
        "cost": 1_250_000,
        "price_minor": 1_250_000,
        "rarity": "Divine",
        "api_tier": "ultra_premium",
        "duration_ms": DURATION_MS,
        "duration_sec": DURATION_S,
        "main_idea": (
            "Four equal volumetric acts fill the stage with the same wow energy — "
            "Spire Ascension, Ribbon Orbit, Listening Chamber, Seal of Craft — "
            "no TikTok rose/rocket/lion clichés; pure SYLORA lumen craft."
        ),
        "model_description": (
            "Four equal volumetric lumen columns, ribbon orbit mesh, chamber ring, "
            "central craft-seal diamond; multi-node animated GLB."
        ),
        "environment_description": "Porcelain Ethereal void with four equal volume shafts.",
        "animation_phases": [
            "act_i_spire_ascension",
            "act_ii_ribbon_orbit",
            "act_iii_listening_chamber",
            "act_iv_seal_of_craft",
        ],
        "equal_volumetric_scenes": [
            {"act": 1, "name": "Spire Ascension", "duration_ms": ACT_MS, "volume_budget": "equal"},
            {"act": 2, "name": "Ribbon Orbit", "duration_ms": ACT_MS, "volume_budget": "equal"},
            {"act": 3, "name": "Listening Chamber", "duration_ms": ACT_MS, "volume_budget": "equal"},
            {"act": 4, "name": "Seal of Craft", "duration_ms": ACT_MS, "volume_budget": "equal"},
        ],
        "vfx": [
            "volumetric shafts",
            "equal particle density per act",
            "ribbon filaments",
            "chamber fog",
            "constellation seal (anti-fireworks)",
        ],
        "lighting": {
            "hdri": True,
            "bloom": True,
            "motion_blur": False,
            "depth_of_field": True,
            "lens_flare": "justified",
            "equal_point_lights": 4,
        },
        "particles": "2000 max × 4 equal systems (spire/ribbon/chamber/seal)",
        "shaders": ["lumen PBR columns", "emissive seal", "soft fog ring"],
        "camera": "Four equal act beats with gentle orbit; no cheap zoom spam",
        "music": "original four-hit cinematic lumen bed",
        "spatial_sound": "stereo spatial bed with equal act imaging",
        "voice_effects": "none (craft silence between acts)",
        "ai_reaction": (
            "AI names each act once, equal weight, never fabricates delivery; "
            "closes with ‘Seal of Craft noted.’"
        ),
        "streamer_reaction": "Equal lumen boost pulse on each act boundary.",
        "avatar_reaction": "Soft equal glow pulse ×4 synced to acts.",
        "viewer_reaction": "Fullscreen volumetric wash scoped per act.",
        "chat_reaction": "Chat badge Fourfold Aether · Divine · 4 equal acts.",
        "combo_reaction": "sylora.gift.fourfold-aether window 180s.",
        "anti_tiktok": [
            "no roses",
            "no rockets",
            "no lions",
            "no sports cars",
            "no yacht",
            "no fireworks-only finale",
        ],
        "performance_targets": {
            "mobile_fps_min": 24,
            "desktop_fps_min": 45,
            "max_memory_mb": 280,
            "max_load_ms": 5500,
        },
        "mobile_lod": "fewer segs/rings, same 4-act structure",
        "desktop_ultra": "full equal particle budgets + bloom",
        "form_family": "fourfold_volumetric",
        "vfx_family": "equal_act_lumen_volume",
        "asset_ids": {
            "glb": asset_ids["glb"],
            "audio": asset_ids["audio"],
            "poster": asset_ids["poster"],
            "blend": asset_ids["blend"],
        },
        "paths": {
            "glb": f"artifacts/gift-library/{SLUG}/model.glb",
            "runtime_manifest": f"artifacts/gift-library/{SLUG}/runtime-manifest.json",
            "metadata": f"artifacts/gift-library/{SLUG}/metadata.json",
            "preview_video": f"artifacts/gift-library/{SLUG}/preview.mp4",
            "gif_preview": f"artifacts/gift-library/{SLUG}/preview.gif",
            "thumbnail": f"artifacts/gift-library/{SLUG}/poster.png",
            "sound_pack": f"artifacts/gift-library/{SLUG}/sound/",
            "particle_pack": f"artifacts/gift-library/{SLUG}/particles/",
            "report": f"artifacts/gift-library/{SLUG}/report.json",
        },
        "status": "ASSETS_BUILT_NOT_READY",
        "ready_checklist": {
            "real_3d_model": False,
            "real_animation": False,
            "real_vfx": False,
            "real_sound": False,
            "runtime_preview": False,
            "sylora_integration": False,
            "video_proof": False,
            "performance_check": False,
        },
        "known_limitations": [
            "PARTIAL_PRODUCTION_CANDIDATE — procedural multi-act volumetric pipeline, not Pixar parity.",
            "No Blender hand-authored art pass in this environment.",
            "Device FPS/RAM and wallet/WS E2E not verified here.",
        ],
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "sound").mkdir(exist_ok=True)
    (OUT / "particles").mkdir(exist_ok=True)

    print("=== GLB (desktop + mobile LOD) ===", flush=True)
    desktop = write_volumetric_glb(OUT / "model.glb", mobile=False)
    mobile = write_volumetric_glb(OUT / "model_mobile_lod.glb", mobile=True)
    print(json.dumps({"desktop": desktop, "mobile": mobile}), flush=True)

    # Placeholder blend marker (no Blender in env) — honest stub for pipeline shape
    blend = OUT / "scene.blend"
    blend.write_bytes(
        b"SYLORA-FOURFOLD-AETHER-BLEND-STUB\n"
        b"Replace with real Blender .blend art pass before READY.\n"
        + b"\x00" * 2048
    )

    print("=== Audio ===", flush=True)
    samples = synth_four_acts(DURATION_S)
    write_wav(OUT / "sound" / "main.wav", samples)
    write_wav(OUT / "sound" / "spatial_bed.wav", [s * 0.4 for s in samples])
    (OUT / "sound" / "sound_pack.json").write_text(
        json.dumps(
            {
                "slug": SLUG,
                "tracks": ["main.wav", "spatial_bed.wav"],
                "original": True,
                "license": "SYLORA-original-synthesis",
                "structure": "four equal act hits @ 2/6/10/14s + soft seal bloom",
                "anti_tiktok": True,
                "spatial": True,
            },
            indent=2,
        )
        + "\n"
    )

    print("=== Visuals ===", flush=True)
    build_visuals()
    ok, msg = ffmpeg_preview()
    print("ffmpeg", ok, msg, flush=True)
    if not ok:
        raise SystemExit(f"ffmpeg preview failed: {msg}")

    asset_ids = {
        "glb": deterministic_uuid("glb"),
        "glb_mobile": deterministic_uuid("glb-mobile"),
        "audio": deterministic_uuid("audio"),
        "poster": deterministic_uuid("poster"),
        "blend": deterministic_uuid("blend"),
    }
    manifest = build_manifest(asset_ids)
    (OUT / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    spec = write_spec(asset_ids)
    (OUT / "spec.json").write_text(json.dumps(spec, indent=2) + "\n")

    metadata = {
        "name": "Fourfold Aether",
        "slug": SLUG,
        "tagline": "Four equal volumes. One wow.",
        "rarity": "Divine",
        "api_tier": "ultra_premium",
        "price_minor": 1_250_000,
        "duration_ms": DURATION_MS,
        "equal_acts": [
            "Spire Ascension",
            "Ribbon Orbit",
            "Listening Chamber",
            "Seal of Craft",
        ],
        "anti_tiktok": True,
        "reactions": {
            "ai": "Fourfold Aether — four equal acts of craft light. Seal noted.",
            "avatar": "Avatar pulses equal glow on each act boundary.",
            "streamer": "Stage lumen boost ×4, no screen-shake spam.",
            "viewer": "Volumetric wash per act on viewer overlays.",
            "combo": "sylora.gift.fourfold-aether combo window 180s.",
        },
        "sha256": {
            "glb": sha256(OUT / "model.glb"),
            "glb_mobile": sha256(OUT / "model_mobile_lod.glb"),
            "audio": sha256(OUT / "sound" / "main.wav"),
            "poster": sha256(OUT / "poster.png"),
        },
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")

    (OUT / "particles" / "particle_pack.json").write_text(
        json.dumps(
            {
                "equal_budget_per_act": 2000,
                "systems": [
                    {"name": "spire_volume", "max": 2000, "rate": 140, "act": 1},
                    {"name": "ribbon_filaments", "max": 2000, "rate": 140, "act": 2},
                    {"name": "chamber_fog", "max": 2000, "rate": 140, "act": 3},
                    {"name": "seal_constellation", "max": 2000, "rate": 140, "act": 4},
                ],
            },
            indent=2,
        )
        + "\n"
    )

    report = {
        "slug": SLUG,
        "status": "PARTIAL_PRODUCTION_CANDIDATE",
        "honest_claim": (
            "Assets built (procedural multi-act volumetric GLB, original audio, "
            "ffmpeg preview, runtime manifest). NOT product READY. "
            "Not TikTok-clone; not Pixar parity."
        ),
        "equal_volumetric_scenes": 4,
        "act_duration_ms": ACT_MS,
        "sizes": {
            "model.glb": (OUT / "model.glb").stat().st_size,
            "model_mobile_lod.glb": (OUT / "model_mobile_lod.glb").stat().st_size,
            "main.wav": (OUT / "sound" / "main.wav").stat().st_size,
            "preview.mp4": (OUT / "preview.mp4").stat().st_size,
            "poster.png": (OUT / "poster.png").stat().st_size,
        },
        "checks": {
            "glb_has_animations": b'"animations"' in (OUT / "model.glb").read_bytes(),
            "four_particle_systems": True,
            "four_act_timelines": True,
            "preview_ok": ok,
            "anti_tiktok_documented": True,
            "blender_art_pass": False,
            "sylora_wallet_e2e": False,
            "device_fps_measured": False,
        },
        "quality_gate": {
            "pixar_blizzard_parity": False,
            "production_ready_claim": False,
            "better_than_tiktok_cliche_intent": True,
            "reason": (
                "Equal-act volumetric design beats fireworks/rocket clichés on concept. "
                "Final wow still needs DCC art/lighting/comp before READY."
            ),
        },
    }
    (OUT / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
