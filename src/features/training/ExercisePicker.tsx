import { useMemo, useState } from "react";
import { EQUIPMENT, MUSCLES } from "../../../shared/types";
import type { Equipment, Muscle, RoutineExercise } from "../../../shared/types";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { ExerciseImage } from "./ExerciseImage";
import { saveCustomExercise, useCatalog, useCustomExercises } from "./useTraining";

type Picked = Pick<RoutineExercise, "exerciseId" | "name" | "muscle" | "equipment">;

const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PAGE = 40;
const MAIN_MUSCLES = ["pecho", "espalda", "hombros", "biceps", "triceps", "piernas", "gluteos", "gemelos", "abs"] as const;

export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (exercise: Picked) => void }) {
  const { catalog, failed } = useCatalog();
  const { data: custom = [] } = useCustomExercises();
  const [text, setText] = useState("");
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [creating, setCreating] = useState(false);
  const [newEquipment, setNewEquipment] = useState<Equipment>("maquina");

  const results = useMemo(() => {
    const words = normalize(text).split(/\s+/).filter(Boolean);
    const match = (name: string) => words.every((w) => normalize(name).includes(w));
    const own = custom
      .filter((e) => (!muscle || e.muscle === muscle) && match(e.name))
      .map((e) => ({ exerciseId: e.id, name: e.name, muscle: e.muscle, equipment: e.equipment, level: 0 }));
    const fromCatalog = catalog
      // Sin buscar nada, se ocultan estiramientos y ejercicios de competición para que la lista sea útil.
      .filter((e) => words.length > 0 || e.category === "fuerza")
      .filter((e) => (!muscle || e.muscle === muscle) && (match(e.name) || match(e.en)))
      .map((e) => ({ exerciseId: e.id, name: e.name, muscle: e.muscle, equipment: e.equipment, level: e.level }))
      .sort((a, b) => a.level - b.level);
    return [...own, ...fromCatalog];
  }, [catalog, custom, text, muscle]);

  const pick = (exercise: Picked) => {
    onPick(exercise);
    setText("");
    setCreating(false);
    setLimit(PAGE);
    onClose();
  };

  const createCustom = () => {
    const id = `custom-${crypto.randomUUID()}`;
    const exercise = { id, name: text.trim(), muscle: muscle ?? "pecho", equipment: newEquipment };
    saveCustomExercise(exercise);
    pick({ exerciseId: id, name: exercise.name, muscle: exercise.muscle, equipment: exercise.equipment });
  };

  return (
    <Sheet open={open} tall title="Elegir ejercicio" onClose={onClose}>
      <div className="picker">
        <input
          className="picker__search"
          type="search"
          placeholder="Buscar: press, remo, sentadilla…"
          aria-label="Buscar ejercicio"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setLimit(PAGE);
          }}
        />
        <div className="chips" role="group" aria-label="Filtrar por músculo">
          {MAIN_MUSCLES.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={muscle === m}
              onClick={() => {
                setMuscle(muscle === m ? null : m);
                setLimit(PAGE);
              }}
            >
              {MUSCLES[m]}
            </button>
          ))}
        </div>

        {failed && <p className="form__error">No se ha podido cargar la lista de ejercicios.</p>}

        <ul className="picker__list">
          {results.slice(0, limit).map((e) => (
            <li key={e.exerciseId}>
              <button type="button" className="picker__row" onClick={() => pick(e)}>
                <ExerciseImage id={e.exerciseId} muscle={e.muscle} />
                <span className="picker__text">
                  <strong>{e.name}</strong>
                  <span>
                    {MUSCLES[e.muscle]} · {EQUIPMENT[e.equipment]}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {results.length > limit && (
          <Button variant="secondary" onClick={() => setLimit(limit + PAGE)}>
            Ver más ({results.length - limit})
          </Button>
        )}

        {text.trim().length >= 3 && (
          <div className="picker__create">
            {!creating ? (
              <Button variant="ghost" onClick={() => setCreating(true)}>
                ¿No está? Crear «{text.trim()}»
              </Button>
            ) : (
              <>
                <p className="field__hint">Elige el músculo arriba y el material:</p>
                <div className="chips">
                  {(["maquina", "polea", "mancuernas", "barra", "corporal"] as const).map((eq) => (
                    <button key={eq} type="button" className="chip" aria-pressed={newEquipment === eq} onClick={() => setNewEquipment(eq)}>
                      {EQUIPMENT[eq]}
                    </button>
                  ))}
                </div>
                <Button onClick={createCustom}>Crear ejercicio</Button>
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
