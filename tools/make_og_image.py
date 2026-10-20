"""Generate the social-share image (public/og-default.png).

Run it by hand when the branding changes:

    python3 tools/make_og_image.py

It needs Pillow, which is only a design-time tool - the website itself has no
Python dependencies at all.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "og-default.png")

WIDTH, HEIGHT = 1200, 630

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]
REGULAR_CANDIDATES = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]

NAVY = (11, 18, 32)
BLUE = (47, 125, 246)
VIOLET = (124, 92, 255)
WHITE = (255, 255, 255)
MUTED = (185, 200, 224)


def first_existing(candidates: list[str]) -> str | None:
    for path in candidates:
        if os.path.exists(path):
            return path
    return None


def font(size: int, bold: bool = True):
    path = first_existing(FONT_CANDIDATES if bold else REGULAR_CANDIDATES)
    if path is None:
        return ImageFont.load_default()
    return ImageFont.truetype(path, size)


def radial_glow(
    size: tuple[int, int],
    colour: tuple[int, int, int],
    center: tuple[int, int],
    radius: int,
) -> Image.Image:
    """A soft round glow on a transparent background."""
    width, height = size
    small = (256, 256)
    mask = Image.new("L", small, 0)
    pixels = mask.load()
    # Work in a square space so the circle stays circular.
    span = max(width, height)
    for y in range(small[1]):
        for x in range(small[0]):
            px = x * span / small[0]
            py = y * span / small[1]
            distance = (
                ((px - center[0]) ** 2 + (py - center[1]) ** 2) ** 0.5 / radius
            )
            value = max(0.0, 1.0 - distance)
            pixels[x, y] = int(255 * value**2)
    mask = mask.resize(size, Image.LANCZOS)

    layer = Image.new("RGB", size, colour)
    layer.putalpha(mask)
    return layer


def main() -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), NAVY)

    # Soft colour glows.
    for center, radius, colour in (
        ((140, 60), 620, (42, 74, 143)),
        ((1060, 140), 520, (31, 111, 106)),
        ((760, 640), 480, (80, 60, 160)),
    ):
        glow = radial_glow((WIDTH, HEIGHT), colour, center, radius)
        image = Image.alpha_composite(image.convert("RGBA"), glow).convert("RGB")
    draw = ImageDraw.Draw(image)

    # Subtle grid.
    for x in range(0, WIDTH, 60):
        draw.line([(x, 0), (x, HEIGHT)], fill=(23, 33, 54), width=1)
    for y in range(0, HEIGHT, 60):
        draw.line([(0, y), (WIDTH, y)], fill=(23, 33, 54), width=1)

    # Brand mark.
    draw.rounded_rectangle((80, 70, 150, 140), radius=18, fill=BLUE)
    draw.ellipse((104, 96, 126, 118), outline=WHITE, width=4)
    draw.line((115, 90, 115, 124), fill=WHITE, width=4)
    draw.line((97, 104, 133, 104), fill=WHITE, width=4)

    draw.text((172, 88), "STEM Jobs", font=font(40), fill=WHITE)

    # Headline.
    draw.text((80, 210), "What does a STEM career", font=font(62), fill=WHITE)
    draw.text((80, 286), "actually look like", font=font(62), fill=WHITE)
    draw.text((80, 362), "where you live?", font=font(62), fill=BLUE)

    draw.text(
        (80, 480),
        "Real numbers on STEM jobs in New Jersey, New York and Pennsylvania",
        font=font(28, bold=False),
        fill=MUTED,
    )

    # Footer chips.
    chips = ["New Jersey", "New York", "Pennsylvania"]
    x = 80
    for chip in chips:
        width = draw.textlength(chip, font=font(24)) + 44
        draw.rounded_rectangle((x, 530, x + width, 578), radius=24, fill=(26, 38, 62))
        draw.text((x + 22, 542), chip, font=font(24), fill=MUTED)
        x += width + 16

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    image.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
