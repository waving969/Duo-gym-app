import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { LIMITS } from "../../../shared/types";
import type { Routine, RoutineExercise } from "../../../shared/types";
import { Button } from "../../ui/Button";
import { Stepper } from "../../ui/controls";
import { Field } from "../../ui/Field";
import { ChevronLeft, PlusIcon, TrashIcon } from "../../ui/icons";
import { useToast } from "../../ui/Toast";
import { ExerciseImage } from "./ExerciseImage";
import { ExercisePicker } from "./ExercisePicker";
import { deleteRoutine, saveRoutine, useRoutines } from "./useTraining";

export function RoutineEditorPage() {
  const { id = "nueva" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: routines = [] } = useRoutines();
  const existing = routines.find((r) => r.id === id);
  const isNew = id === "nueva";

  const [draft, setDraft] = useState<Routine | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (draft) return;
    if (isNew) {
      setDraft({
        id: crypto.randomUUID(),
        name: "",
        note: "",
        position: routines.reduce((max, r) => Math.max(max, r.position + 1), 0),
        cardioMinutes: 10,
        isDefault: false,
        exercises: [],
      });
    } else if (existing) {
      setDraft(existing);
    }
  }, [draft, existing, isNew, routines]);

  if (!draft) return <div className="card skeleton" style={{ height: 300 }} />;

  const patchExercise = (index: number, patch: Partial<RoutineExercise>) =>
    setDraft({ ...draft, exercises: draft.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)) });

  const move = (index: number, delta: number) => {
    const exercises = [...draft.exercises];
    const [item] = exercises.splice(index, 1);
    exercises.splice(index + delta, 0, item!);
    setDraft({ ...draft, exercises });
  };

  const valid = draft.name.trim().length > 0 && draft.exercises.length > 0;

  return (
    <>
      <header className="session__bar session__bar--page">
        <Link to="/entrenar" className="icon-btn" aria-label="Volver sin guardar">
          <ChevronLeft />
        </Link>
        <div className="session__title">
          <h1>{isNew ? "Nueva rutina" : "Editar rutina"}</h1>
        </div>
      </header>

      <section className="card form">
        <Field label="Nombre" placeholder="Ej.: Pecho y tríceps" maxLength={60} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <div className="setting-row setting-row--flush">
          <div>
            <p className="setting-row__label">Cardio incluido</p>
            <p className="field__hint">0 si no quieres cardio en esta rutina.</p>
          </div>
          <Stepper
            label="5 minutos"
            value={`${draft.cardioMinutes} min`}
            minusDisabled={draft.cardioMinutes <= 0}
            plusDisabled={draft.cardioMinutes >= LIMITS.cardioMinutesMax}
            onMinus={() => setDraft({ ...draft, cardioMinutes: draft.cardioMinutes - 5 })}
            onPlus={() => setDraft({ ...draft, cardioMinutes: draft.cardioMinutes + 5 })}
          />
        </div>
      </section>

      <section aria-label="Ejercicios">
        <h2 className="section-title">Ejercicios</h2>
        <ul className="editor-list">
          <AnimatePresence initial={false}>
            {draft.exercises.map((e, i) => (
              <motion.li
                key={`${e.exerciseId}-${i}`}
                className="card editor-row"
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16 }}
              >
                <div className="editor-row__head">
                  <ExerciseImage id={e.exerciseId} muscle={e.muscle} />
                  <strong>{e.name}</strong>
                  <button
                    type="button"
                    className="icon-btn icon-btn--quiet"
                    aria-label={`Quitar ${e.name}`}
                    onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((_, j) => j !== i) })}
                  >
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
                <div className="editor-row__controls">
                  <div className="editor-row__field">
                    <span>Series</span>
                    <Stepper
                      label="series"
                      value={e.sets}
                      minusDisabled={e.sets <= 1}
                      plusDisabled={e.sets >= LIMITS.setsMax}
                      onMinus={() => patchExercise(i, { sets: e.sets - 1 })}
                      onPlus={() => patchExercise(i, { sets: e.sets + 1 })}
                    />
                  </div>
                  <div className="editor-row__field">
                    <span>Repeticiones</span>
                    <Stepper
                      label="repeticiones"
                      value={e.reps}
                      minusDisabled={e.reps <= 1}
                      plusDisabled={e.reps >= LIMITS.repsMax}
                      onMinus={() => patchExercise(i, { reps: e.reps - 1 })}
                      onPlus={() => patchExercise(i, { reps: e.reps + 1 })}
                    />
                  </div>
                </div>
                <div className="editor-row__order">
                  <button type="button" className="chip" disabled={i === 0} onClick={() => move(i, -1)}>
                    Subir
                  </button>
                  <button type="button" className="chip" disabled={i === draft.exercises.length - 1} onClick={() => move(i, 1)}>
                    Bajar
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <Button variant="secondary" className="full" disabled={draft.exercises.length >= LIMITS.routineExercisesMax} onClick={() => setPicking(true)}>
          <PlusIcon width={18} height={18} aria-hidden /> Añadir ejercicio
        </Button>
      </section>

      <div className="stack stack--actions">
        <Button
          size="large"
          disabled={!valid}
          onClick={() => {
            saveRoutine({ ...draft, name: draft.name.trim() });
            toast({ message: "Rutina guardada" });
            navigate("/entrenar");
          }}
        >
          Guardar rutina
        </Button>
        {!isNew && (
          <Button
            variant="danger"
            onClick={() => {
              if (confirm(`¿Borrar la rutina «${draft.name}»? Tus entrenos ya hechos se conservan.`)) {
                deleteRoutine(draft.id);
                toast({ message: "Rutina borrada" });
                navigate("/entrenar");
              }
            }}
          >
            Borrar rutina
          </Button>
        )}
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(exercise) => setDraft({ ...draft, exercises: [...draft.exercises, { ...exercise, sets: 2, reps: 12 }] })}
      />
    </>
  );
}
