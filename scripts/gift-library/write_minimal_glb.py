#!/usr/bin/env python3
"""Write a tiny original GLB (mesh + rotation animation) without Blender.

Procedural placeholder for Gift Studio drafts — not a hand-authored art pass.
Status honesty: use with ASSETS_BUILT_NOT_READY / PARTIAL_ASSETS, never READY alone.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path


def _seed(slug: str) -> int:
    return sum((i + 1) * ord(c) for i, c in enumerate(slug)) % 10_000


def _mesh(slug: str) -> tuple[list[float], list[int]]:
    """Deterministic low-poly form unique per slug (not shared geometry)."""
    s = _seed(slug)
    verts: list[float] = []
    indices: list[int] = []
    rings = 6 + (s % 4)
    segs = 8 + (s % 5)
    for ri in range(rings + 1):
        v = ri / rings
        y = (v - 0.5) * (1.1 + (s % 7) * 0.05)
        radius = 0.15 + 0.35 * math.sin(math.pi * v) * (0.7 + 0.3 * math.sin(s * 0.1 + v * 3))
        twist = (s % 5) * 0.15 * v
        for si in range(segs):
            a = 2 * math.pi * si / segs + twist
            x = radius * math.cos(a)
            z = radius * math.sin(a)
            # mild asymmetry so gifts don't look identical
            x *= 1.0 + 0.08 * math.sin(s * 0.21 + si)
            z *= 1.0 + 0.08 * math.cos(s * 0.17 + ri)
            verts.extend([x, y, z])
    for ri in range(rings):
        for si in range(segs):
            a = ri * segs + si
            b = ri * segs + (si + 1) % segs
            c = (ri + 1) * segs + si
            d = (ri + 1) * segs + (si + 1) % segs
            indices.extend([a, c, b, b, c, d])
    # caps
    top = len(verts) // 3
    verts.extend([0.0, 0.55 + (s % 3) * 0.02, 0.0])
    bot = top + 1
    verts.extend([0.0, -0.55 - (s % 3) * 0.02, 0.0])
    for si in range(segs):
        a = si
        b = (si + 1) % segs
        indices.extend([bot, b, a])
        a2 = rings * segs + si
        b2 = rings * segs + (si + 1) % segs
        indices.extend([top, a2, b2])
    return verts, indices


def write_glb(path: Path, slug: str, duration_s: float = 3.2) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    verts, indices = _mesh(slug)
    n_verts = len(verts) // 3
    pos_bytes = struct.pack(f"<{len(verts)}f", *verts)
    idx_bytes = struct.pack(f"<{len(indices)}I", *indices)

    # rotation animation: quaternion identity → 180° around Y
    # times: 0, duration
    times = struct.pack("<ff", 0.0, float(duration_s))
    # quat [x,y,z,w]
    q0 = struct.pack("<ffff", 0.0, 0.0, 0.0, 1.0)
    half = math.sqrt(0.5)
    q1 = struct.pack("<ffff", 0.0, half, 0.0, half)
    rot_bytes = q0 + q1

    # pack buffers with 4-byte alignment
    chunks: list[bytes] = []
    offsets: list[int] = []

    def add(blob: bytes) -> tuple[int, int]:
        while sum(len(c) for c in chunks) % 4:
            chunks.append(b"\x00")
        off = sum(len(c) for c in chunks)
        chunks.append(blob)
        pad = (4 - (len(blob) % 4)) % 4
        if pad:
            chunks.append(b"\x00" * pad)
        offsets.append(off)
        return off, len(blob)

    pos_off, pos_len = add(pos_bytes)
    idx_off, idx_len = add(idx_bytes)
    time_off, time_len = add(times)
    rot_off, rot_len = add(rot_bytes)
    bin_blob = b"".join(chunks)

    # accessors mins/maxs for positions
    xs = verts[0::3]
    ys = verts[1::3]
    zs = verts[2::3]

    gltf = {
        "asset": {"version": "2.0", "generator": "sylora-minimal-glb"},
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "gift_root"}],
        "meshes": [
            {
                "name": f"{slug}_mesh",
                "primitives": [
                    {
                        "attributes": {"POSITION": 0},
                        "indices": 1,
                        "mode": 4,
                    }
                ],
            }
        ],
        "animations": [
            {
                "name": "main",
                "channels": [{"sampler": 0, "target": {"node": 0, "path": "rotation"}}],
                "samplers": [{"input": 2, "interpolation": "LINEAR", "output": 3}],
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": n_verts,
                "type": "VEC3",
                "max": [max(xs), max(ys), max(zs)],
                "min": [min(xs), min(ys), min(zs)],
            },
            {
                "bufferView": 1,
                "componentType": 5125,
                "count": len(indices),
                "type": "SCALAR",
            },
            {
                "bufferView": 2,
                "componentType": 5126,
                "count": 2,
                "type": "SCALAR",
                "max": [float(duration_s)],
                "min": [0.0],
            },
            {
                "bufferView": 3,
                "componentType": 5126,
                "count": 2,
                "type": "VEC4",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": pos_off, "byteLength": pos_len, "target": 34962},
            {"buffer": 0, "byteOffset": idx_off, "byteLength": idx_len, "target": 34963},
            {"buffer": 0, "byteOffset": time_off, "byteLength": time_len},
            {"buffer": 0, "byteOffset": rot_off, "byteLength": rot_len},
        ],
        "buffers": [{"byteLength": len(bin_blob)}],
    }

    json_blob = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_pad = (4 - (len(json_blob) % 4)) % 4
    json_blob += b" " * json_pad
    bin_pad = (4 - (len(bin_blob) % 4)) % 4
    bin_blob_padded = bin_blob + (b"\x00" * bin_pad)

    total = 12 + 8 + len(json_blob) + 8 + len(bin_blob_padded)
    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total)  # glTF
    out += struct.pack("<II", len(json_blob), 0x4E4F534A)  # JSON
    out += json_blob
    out += struct.pack("<II", len(bin_blob_padded), 0x004E4942)  # BIN
    out += bin_blob_padded
    path.write_bytes(out)

    return {
        "path": str(path),
        "bytes": len(out),
        "vertices": n_verts,
        "triangles": len(indices) // 3,
        "has_animations": True,
        "generator": "sylora-minimal-glb",
        "note": "Procedural placeholder GLB — replace with Blender art pass before READY.",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="output model.glb path")
    ap.add_argument("--slug", required=True)
    ap.add_argument("--duration", type=float, default=3.2)
    args = ap.parse_args()
    meta = write_glb(Path(args.out), args.slug, args.duration)
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
