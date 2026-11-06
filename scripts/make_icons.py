# Genera los iconos PNG de la app: python scripts/make_icons.py
from pathlib import Path
from PIL import Image, ImageDraw

BG, LIME, CORAL = (18, 17, 15, 255), (198, 241, 53, 255), (255, 138, 102, 255)
OUT = Path(__file__).resolve().parent.parent / "public"
SS = 4  # sobremuestreo para bordes suaves


def ring(draw, cx, cy, r, width, color):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)


def icon(size, scale=1.0):
    s = size * SS
    img = Image.new("RGBA", (s, s), BG)
    d = ImageDraw.Draw(img)
    r, w, gap = s * 0.205 * scale, int(s * 0.094 * scale), s * 0.11 * scale
    ring(d, s / 2 - gap, s / 2, r, w, LIME)
    ring(d, s / 2 + gap, s / 2, r, w, CORAL)
    return img.resize((size, size), Image.LANCZOS)


icon(180).convert("RGB").save(OUT / "apple-touch-icon.png")
icon(192).save(OUT / "icon-192.png")
icon(512).save(OUT / "icon-512.png")
icon(512, scale=0.78).save(OUT / "icon-maskable-512.png")
