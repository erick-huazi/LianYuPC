"""Regenerate app icon: remove dark fringe, apply clean squircle mask."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "logo.png"
OUT_PNG = ROOT / "public" / "logo.png"
OUT_ICO = ROOT / "build" / "icon.ico"


def squircle_mask(size: int, radius_ratio: float = 0.28) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    margin = int(size * 0.015)
    radius = int(size * radius_ratio)
    draw.rounded_rectangle(
        (margin, margin, size - margin - 1, size - margin - 1),
        radius=radius,
        fill=255,
    )
    return mask


def remove_dark_fringe(img: Image.Image, threshold: int = 36) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            if r <= threshold and g <= threshold and b <= threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba


def apply_mask(img: Image.Image, mask: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    out = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    out.paste(rgba, (0, 0), mask)
    return out


def build_icon(src: Path) -> Image.Image:
    base = Image.open(src).convert("RGBA")
    size = min(base.size)
    if base.size != (size, size):
        left = (base.width - size) // 2
        top = (base.height - size) // 2
        base = base.crop((left, top, left + size, top + size))

    cleaned = remove_dark_fringe(base)
    mask = squircle_mask(size)
    return apply_mask(cleaned, mask)


def save_ico(img: Image.Image, dest: Path) -> None:
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = []
    for s in sizes:
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        frames.append(resized)
    dest.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        dest,
        format="ICO",
        sizes=[(s, s) for s in sizes],
        append_images=frames[1:],
    )


def main() -> None:
    icon = build_icon(SRC)
    icon.save(OUT_PNG, format="PNG")
    save_ico(icon, OUT_ICO)
    print(f"Wrote {OUT_PNG} and {OUT_ICO}")


if __name__ == "__main__":
    main()
