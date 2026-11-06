# Copia las capturas de .capturas/ a docs/capturas/ y compone la imagen de portada del README.
#   python scripts/make_portada.py   (después de: COLOR_SCHEME=dark npm run test:browser)
from pathlib import Path
from shutil import copyfile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / ".capturas"
OUT = ROOT / "docs" / "capturas"
OUT.mkdir(parents=True, exist_ok=True)

SHOTS = {
    "01-hoy": "hoy",
    "02-entrenar": "entrenar",
    "03-sesion": "sesion",
    "04-sesion-sin-cobertura": "sesion-sin-cobertura",
    "06-terminado": "terminado",
    "11-chat-alex": "mensajes",
    "09-comparar": "comparar",
    "13-ejercicios": "evolucion-ejercicio",
    "18-busqueda": "buscador-ejercicios",
    "15-peso": "peso",
    "22-avatares": "avatares",
}
for source, name in SHOTS.items():
    copyfile(SRC / f"{source}.png", OUT / f"{name}.png")

# Portada: cuatro pantallas sobre el color de fondo de la app.
BG = (18, 17, 15)
names = ["hoy", "sesion-sin-cobertura", "mensajes", "evolucion-ejercicio"]
images = [Image.open(OUT / f"{n}.png").convert("RGB") for n in names]
width, height = images[0].size
gap, margin, radius = 36, 48, 28
canvas = Image.new("RGB", (margin * 2 + width * 4 + gap * 3, margin * 2 + height), BG)
mask = Image.new("L", (width * 4, height * 4), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, width * 4 - 1, height * 4 - 1], radius * 4, fill=255)
mask = mask.resize((width, height), Image.LANCZOS)
border = (50, 46, 41)
for i, image in enumerate(images):
    x = margin + i * (width + gap)
    ImageDraw.Draw(canvas).rounded_rectangle([x - 1, margin - 1, x + width, margin + height], radius + 1, outline=border, width=1)
    canvas.paste(image, (x, margin), mask)
canvas.save(OUT / "portada.png", optimize=True)
print(canvas.size, sum(f.stat().st_size for f in OUT.iterdir()) // 1024, "KB")
