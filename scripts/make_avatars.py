# Descarga los avatares de Fluent Emoji (Microsoft, licencia MIT) y los deja en public/avatares/ en formato WebP.
#   python scripts/make_avatars.py
# Los identificadores y los nombres que ve la persona están en shared/avatars.ts.
import io
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image

BASE = "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets"
OUT = Path(__file__).resolve().parent.parent / "public" / "avatares"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 160

# identificador -> carpeta en el repositorio de Fluent Emoji
SIMPLE = {
    "oso": "Bear",
    "gato": "Cat face",
    "perro": "Dog face",
    "panda": "Panda",
    "mono": "Monkey face",
    "rana": "Frog",
    "tigre": "Tiger face",
    "leon": "Lion",
    "zorro": "Fox",
    "koala": "Koala",
    "pinguino": "Penguin",
    "conejo": "Rabbit face",
    "gallo": "Rooster",
    "buho": "Owl",
    "unicornio": "Unicorn",
    "dragon": "Dragon face",
    "tortuga": "Turtle",
    "cerdo": "Pig face",
    "vaca": "Cow face",
    "hamster": "Hamster",
    "llama": "Llama",
    "perezoso": "Sloth",
    "pulpo": "Octopus",
    "trex": "T-rex",
    "gorila": "Gorilla",
    "robot": "Robot",
    "fuego": "Fire",
    "trofeo": "Trophy",
    "medalla": "Sports medal",
    "rayo": "High voltage",
}
# Estos tienen variantes de tono de piel: se usa la predeterminada.
WITH_TONES = {"biceps": "Flexed biceps", "levantador": "Person lifting weights"}


def url(folder, tones):
    slug = folder.lower().replace(" ", "_")
    path = f"{folder}/Default/3D/{slug}_3d_default.png" if tones else f"{folder}/3D/{slug}_3d.png"
    return f"{BASE}/{urllib.parse.quote(path)}"


failed = []
total = 0
for tones, table in ((False, SIMPLE), (True, WITH_TONES)):
    for key, folder in table.items():
        try:
            with urllib.request.urlopen(url(folder, tones), timeout=30) as response:
                image = Image.open(io.BytesIO(response.read())).convert("RGBA")
            image.thumbnail((SIZE, SIZE), Image.LANCZOS)
            target = OUT / f"{key}.webp"
            image.save(target, "WEBP", quality=88, method=6)
            total += target.stat().st_size
        except Exception as error:  # noqa: BLE001 - se informa de todos al final
            failed.append((key, folder, str(error)))

print(f"{len(SIMPLE) + len(WITH_TONES) - len(failed)} avatares, {total // 1024} KB")
for item in failed:
    print("FALLO", item)
