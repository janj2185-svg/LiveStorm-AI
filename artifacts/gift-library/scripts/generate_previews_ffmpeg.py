#!/usr/bin/env python3
"""Generate Ken-Burns preview MP4 + GIF for every gift from its thumbnail (fast).
For hero cinematic EEVEE videos, use generate_blender_assets.py without --skip-video.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "catalog" / "sylora-gifts-100.json"


def make_preview(thumb: Path, mp4: Path, gif: Path, duration: float) -> bool:
    if not thumb.exists():
        return False
    mp4.parent.mkdir(parents=True, exist_ok=True)
    gif.parent.mkdir(parents=True, exist_ok=True)
    # Zoom/pan + fade using ffmpeg
    vf = (
        f"scale=720:720:force_original_aspect_ratio=increase,"
        f"crop=720:720,"
        f"zoompan=z='min(zoom+0.0015,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int(duration*30)}:s=720x720:fps=30,"
        f"fade=t=in:st=0:d=0.4,fade=t=out:st={max(0.5, duration-0.5)}:d=0.45"
    )
    r1 = subprocess.run(
        [
            "ffmpeg", "-y", "-loop", "1", "-i", str(thumb),
            "-vf", vf, "-t", str(duration), "-pix_fmt", "yuv420p",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
            str(mp4),
        ],
        capture_output=True,
    )
    r2 = subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(mp4),
            "-vf", "fps=12,scale=320:-1:flags=lanczos",
            "-loop", "0", str(gif),
        ],
        capture_output=True,
    )
    return r1.returncode == 0 and mp4.exists() and gif.exists()


def main():
    cat = json.loads(CATALOG.read_text())
    ok = 0
    fail = 0
    for g in cat["gifts"]:
        thumb = ROOT / g["assets"]["thumbnail"]
        # Prefer poster if present
        poster = ROOT / g["assets"].get("poster", g["assets"]["thumbnail"])
        src = poster if poster.exists() else thumb
        mp4 = ROOT / g["assets"]["previewMp4"]
        gif = ROOT / g["assets"]["previewGif"]
        if make_preview(src, mp4, gif, min(6.0, float(g["durationSec"]))):
            g["status"]["preview"] = "ready"
            ok += 1
            print(f"[OK] preview {g['slug']}")
        else:
            fail += 1
            print(f"[FAIL] preview {g['slug']}")
    CATALOG.write_text(json.dumps(cat, indent=2, ensure_ascii=False) + "\n")
    print(f"Done previews ok={ok} fail={fail}")


if __name__ == "__main__":
    main()
