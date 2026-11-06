# Genera public/exercises.json a partir de free-exercise-db (Unlicense) y los nombres en español.
#   python scripts/build_exercises.py RUTA/exercises.json RUTA/names.txt
# names.txt es la lista "id<TAB>nombre" en el orden en que se tradujo data/exercise_names_es.txt.
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
order = [line.split("\t") for line in Path(sys.argv[2]).read_text(encoding="utf-8").splitlines() if line]

spanish = {}
for line in (ROOT / "data" / "exercise_names_es.txt").read_text(encoding="utf-8").splitlines():
    number, name = line.split("|", 1)
    spanish[int(number)] = name.strip()

assert len(order) == len(spanish), (len(order), len(spanish))
es_by_id = {order[i][0]: spanish[i + 1] for i in range(len(order))}

MUSCLES = {
    "abdominals": "abs", "abductors": "gluteos", "adductors": "piernas", "biceps": "biceps",
    "calves": "gemelos", "chest": "pecho", "forearms": "antebrazos", "glutes": "gluteos",
    "hamstrings": "piernas", "lats": "espalda", "lower back": "espalda", "middle back": "espalda",
    "neck": "cuello", "quadriceps": "piernas", "shoulders": "hombros", "traps": "espalda", "triceps": "triceps",
}
EQUIPMENT = {
    "barbell": "barra", "dumbbell": "mancuernas", "cable": "polea", "machine": "maquina", "body only": "corporal",
    "kettlebells": "kettlebell", "bands": "bandas", "medicine ball": "balon", "exercise ball": "fitball",
    "foam roll": "rodillo", "e-z curl bar": "barra", "other": "otro", None: "corporal",
}
CATEGORY = {
    "strength": "fuerza", "powerlifting": "fuerza", "olympic weightlifting": "olimpico",
    "stretching": "estiramiento", "plyometrics": "pliometria", "cardio": "cardio",
}

out = []
for e in source:
    if e["category"] not in CATEGORY:
        continue
    out.append({
        "id": e["id"],
        "name": es_by_id[e["id"]],
        "en": e["name"],
        "muscle": MUSCLES[e["primaryMuscles"][0]],
        "equipment": EQUIPMENT[e["equipment"]],
        "category": CATEGORY[e["category"]],
        "level": {"beginner": 1, "intermediate": 2, "expert": 3}[e["level"]],
        "images": len(e["images"]),
    })
out.sort(key=lambda x: x["name"])
(ROOT / "public" / "exercises.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(len(out), "ejercicios,", (ROOT / "public" / "exercises.json").stat().st_size // 1024, "KB")
