"""
Before/after comparison builder.

Stacks matching crops from two capture directories into one labelled sheet.
Retunes on a bright ground are small in absolute terms — a step of ink, a
tint instead of a fill — so they are only judgeable side by side at full size.

Usage:
    python3 scripts/compare.py <before-dir> <after-dir> <out.png> \
        --row "achievements__desktop__light:290,310,850,100:Achievement medals"
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CANVAS_BG = (18, 18, 22)
LABEL_FG = (232, 232, 236)
CAPTION_FG = (150, 150, 158)
GUTTER = 26
TITLE_H = 34
CAPTION_H = 26


def font(size: int) -> ImageFont.FreeTypeFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("before")
    parser.add_argument("after")
    parser.add_argument("out")
    parser.add_argument("--row", action="append", required=True)
    parser.add_argument("--width", type=int, default=1300)
    parser.add_argument("--max-height", type=int, default=380)
    args = parser.parse_args()

    title_font, caption_font = font(21), font(16)
    rows = []
    for spec in args.row:
        name, box, title = spec.split(":", 2)
        x, y, w, h = (int(v) for v in box.split(","))
        pair = []
        for root in (args.before, args.after):
            im = Image.open(Path(root) / f"{name}.png").convert("RGB").crop((x, y, x + w, y + h))
            # Fit to the sheet width but cap the height, so a tall crop cannot
            # push the rows below it off the end of a readable image.
            scale = min(args.width / im.width, args.max_height / im.height)
            pair.append(
                im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
            )
        rows.append((title, pair))

    # A near-square crop stacked vertically wastes most of the sheet, so those
    # pairs sit side by side instead.
    def is_wide(pair) -> bool:
        return pair[0].width > pair[0].height * 1.6

    height = GUTTER
    for _title, pair in rows:
        body = sum(p.height for p in pair) if is_wide(pair) else pair[0].height
        height += TITLE_H + CAPTION_H * (2 if is_wide(pair) else 1) + body + GUTTER
    sheet = Image.new("RGB", (args.width + GUTTER * 2, height), CANVAS_BG)
    draw = ImageDraw.Draw(sheet)

    y = GUTTER
    for title, pair in rows:
        draw.text((GUTTER, y), title, font=title_font, fill=LABEL_FG)
        y += TITLE_H
        if is_wide(pair):
            for label, tile in zip(("Before", "After"), pair):
                draw.text((GUTTER, y), label, font=caption_font, fill=CAPTION_FG)
                y += CAPTION_H
                sheet.paste(tile, (GUTTER, y))
                y += tile.height
        else:
            draw.text((GUTTER, y), "Before", font=caption_font, fill=CAPTION_FG)
            draw.text(
                (GUTTER + pair[0].width + GUTTER, y), "After", font=caption_font, fill=CAPTION_FG
            )
            y += CAPTION_H
            sheet.paste(pair[0], (GUTTER, y))
            sheet.paste(pair[1], (GUTTER + pair[0].width + GUTTER, y))
            y += pair[0].height
        y += GUTTER

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out, optimize=True)
    print(f"{args.out}  {sheet.width}x{sheet.height}")


if __name__ == "__main__":
    main()
