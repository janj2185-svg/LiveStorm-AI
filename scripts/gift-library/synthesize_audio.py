#!/usr/bin/env python3
"""Synthesize original short audio packs for SYLORA gifts (no third-party samples)."""

from __future__ import annotations

import argparse
import math
import struct
import wave
from pathlib import Path


def write_wav(path: Path, samples: list[float], rate: int = 44100) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        frames = bytearray()
        for i, s in enumerate(samples):
            # mild stereo: left/right phase offset
            l = max(-1.0, min(1.0, s))
            r = max(-1.0, min(1.0, s * (0.85 + 0.15 * math.sin(i * 0.001))))
            frames += struct.pack("<hh", int(l * 30000), int(r * 30000))
        wf.writeframes(frames)


def synth(slug: str, duration_s: float, family: str) -> list[float]:
    rate = 44100
    n = int(rate * duration_s)
    seed = sum(ord(c) for c in slug) % 97
    samples: list[float] = []
    base = 110 + (seed % 24) * 8
    for i in range(n):
        t = i / rate
        env = min(1.0, t * 4) * max(0.0, 1.0 - (t / duration_s) ** 1.4)
        if family in {"water_ripple", "biolume_water", "wave_foam", "rain_letters", "chat_ocean"}:
            tone = 0.35 * math.sin(2 * math.pi * (base * 0.5) * t)
            tone += 0.15 * math.sin(2 * math.pi * (base * 2.1) * t + 0.2)
            noise = ((i * 1103515245 + seed) % 1000) / 1000.0 - 0.5
            s = env * (tone + 0.08 * noise)
        elif family in {"forge_fire", "glory_fire", "beacon_network", "safe_hearth", "kiln_glow"}:
            tone = 0.25 * math.sin(2 * math.pi * (base * 0.7) * t)
            rumble = 0.2 * math.sin(2 * math.pi * 40 * t)
            crackle = 0.05 * (((i * 7919 + seed) % 200) / 200.0 - 0.5)
            s = env * (tone + rumble + crackle)
        elif family in {"aurora", "bow_aurora", "global_aurora", "star_draw", "corona"}:
            tone = 0.3 * math.sin(2 * math.pi * (base * 1.5) * t)
            tone += 0.2 * math.sin(2 * math.pi * (base * 1.51) * t)
            tone += 0.1 * math.sin(2 * math.pi * (base * 3.0) * t)
            s = env * tone
        elif family in {"mech_sparks", "gear_bloom", "orbital_align", "time_freeze"}:
            tick = 1.0 if int(t * (6 + seed % 5)) != int((t - 1 / rate) * (6 + seed % 5)) else 0.0
            tone = 0.2 * math.sin(2 * math.pi * base * t)
            s = env * (tone + 0.35 * tick * math.sin(2 * math.pi * 1200 * t))
        else:
            tone = 0.35 * math.sin(2 * math.pi * base * t)
            tone += 0.18 * math.sin(2 * math.pi * (base * 1.25) * t)
            tone += 0.1 * math.sin(2 * math.pi * (base * 2.0) * t + seed)
            s = env * tone
        # peak target ~ -6 dBFS soft
        samples.append(s * 0.45)
    return samples


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--slug", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--family", required=True)
    args = ap.parse_args()
    out = Path(args.out)
    samples = synth(args.slug, args.duration, args.family)
    write_wav(out / "main.wav", samples)
    # spatial bed: quieter longer pad
    pad = [s * 0.35 for s in samples]
    write_wav(out / "spatial_bed.wav", pad)
    meta = out / "sound_pack.json"
    meta.write_text(
        '{\n  "slug": "%s",\n  "format": "wav",\n  "channels": 2,\n  "original": true,\n  "license": "SYLORA-original-synthesis"\n}\n'
        % args.slug,
        encoding="utf-8",
    )
    print(f"wrote sound pack to {out}")


if __name__ == "__main__":
    main()
