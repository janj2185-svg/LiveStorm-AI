"""
Contact sheet builder.

Tiles the captured screens into a single reviewable image per device and theme.
A grid of real screenshots is the fastest way to spot the things that only show
up in aggregate: a card that is heavier than its neighbours, a heading that
sits at a different height on one screen, a section that is quietly emptier
than the rest of the product.

Usage:
    python3 scripts/contact-sheet.py <captures-dir> <out.png> --match iphone__dark
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CANVAS_BG = (12, 12, 15)
LABEL_FG = (185, 186, 194)
GUTTER = 28
LABEL_HEIGHT = 30


def load_font(size: int) -> ImageFont.FreeTypeFont:
    """Prefer the project's own typeface so sheets look like the product."""
    candidates = [
        "apps/sylora/assets/fonts/InstrumentSans-Variable.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def build(captures: Path, out: Path, match: str, columns: int, tile_width: int) -> None:
    files = sorted(p for p in captures.glob(f"*{match}*.png"))
    if not files:
        sys.exit(f"No captures matching '{match}' in {captures}")

    font = load_font(15)

    tiles: list[tuple[str, Image.Image]] = []
    for path in files:
        image = Image.open(path).convert("RGB")
        scale = tile_width / image.width
        # Cap the height so one very tall screen cannot set the row height for
        # everything else on the sheet.
        tile = image.resize((tile_width, int(image.height * scale)), Image.LANCZOS)
        max_height = int(tile_width * 2.6)
        if tile.height > max_height:
            tile = tile.crop((0, 0, tile_width, max_height))
        tiles.append((path.name.split("__")[0], tile))

    rows = math.ceil(len(tiles) / columns)
    row_heights = [
        max(tile.height for _, tile in tiles[row * columns : (row + 1) * columns])
        for row in range(rows)
    ]

    width = columns * tile_width + (columns + 1) * GUTTER
    height = sum(row_heights) + rows * (LABEL_HEIGHT + GUTTER) + GUTTER

    sheet = Image.new("RGB", (width, height), CANVAS_BG)
    draw = ImageDraw.Draw(sheet)

    y = GUTTER
    for row in range(rows):
        x = GUTTER
        for name, tile in tiles[row * columns : (row + 1) * columns]:
            sheet.paste(tile, (x, y))
            draw.text((x + 2, y + tile.height + 7), name, font=font, fill=LABEL_FG)
            x += tile_width + GUTTER
        y += row_heights[row] + LABEL_HEIGHT + GUTTER

    out.parent.mkdir(parents=True, exist_ok=True)
    # Downscale very large sheets so they stay comfortably viewable.
    if sheet.width > 3400:
        ratio = 3400 / sheet.width
        sheet = sheet.resize((3400, int(sheet.height * ratio)), Image.LANCZOS)
    sheet.save(out, optimize=True)
    print(f"{out}  {sheet.width}x{sheet.height}  ({len(tiles)} screens)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("captures")
    parser.add_argument("out")
    parser.add_argument("--match", required=True)
    parser.add_argument("--columns", type=int, default=8)
    parser.add_argument("--tile-width", type=int, default=300)
    args = parser.parse_args()
    build(Path(args.captures), Path(args.out), args.match, args.columns, args.tile_width)
