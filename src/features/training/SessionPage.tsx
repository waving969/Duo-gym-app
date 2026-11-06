import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { doneCount, lastWeights, stepWeight, weightOptions, workoutVolume } from "../../../shared/training";
import { EQUIPMENT, MUSCLES } from "../../../shared/types";
import type { Workout, WorkoutEntry } from "../../../shared/types";
import { formatShortDate, plural } from "../../lib/format";
import { useOutboxCount } from "../../lib/outbox";
import { Button } from "../../ui/Button";
import { Stepper } from "../../ui/controls";
import { CheckIcon, ChevronLeft } from "../../ui/icons";
import { Sheet } from "../../ui/Sheet";
import { addCardioToSession, discardSession, finishSession, swapExercise, updateCardio, updateEntry, useActiveSession } from "./activeSession";
import { CardioKindChips } from "./CardioSheet";
import { ExerciseImage } from "./ExerciseImage";
import { ExercisePicker } from "./ExercisePicker";
import { useWorkouts } from "./useTraining";

const kgText = (kg: number) => `${kg.toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg`;
const weightText = (kg: number | null) => (kg ? kgText(kg) : "Sin peso");

function Tick({ done, label, onClick }: { done: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      className={`tick ${done ? "tick--done" : ""}`}
      aria-pressed={done}
      aria-label={label}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 600, damping: 26 }}
      onClick={onClick}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 560, damping: 22 }}>
            <CheckIcon width={30} height={30} aria-hidden />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function EntryCard({ entry, index, last, onDetails }: {
  entry: WorkoutEntry;
  index: number;
  last?: { kg: number; date: string };
  onDetails: () => void;
}) {
  const kg = entry.kg ?? 0;
  const options = weightOptions(entry.equipment);
  const up = stepWeight(entry.equipment, last?.kg ?? kg, 1);
  const showRaise = last && kg === last.kg && up !== kg;
  const isTime = entry.exerciseId === "Plank";

  return (
    <motion.li layout="position" className={`card entry ${entry.done ? "entry--done" : ""}`}>
      <div className="entry__head">
        <button type="button" className="entry__thumb" aria-label={`Ver ${entry.name}`} onClick={onDetails}>
          <ExerciseImage id={entry.exerciseId} muscle={entry.muscle} />
        </button>
        <button type="button" className="entry__text" onClick={onDetails}>
          <strong>{entry.name}</strong>
          <span className="tabular">
            {entry.sets} × {entry.reps}
            {isTime ? " s" : ""}
            {entry.done && ` · ${weightText(entry.kg)}`}
          </span>
        </button>
        <Tick done={entry.done} label={`${entry.name} hecho`} onClick={() => updateEntry(index, { done: !entry.done })} />
      </div>

      <AnimatePresence initial={false}>
        {!entry.done && (
          <motion.div
            className="entry__weight"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Stepper
              big
              label="peso"
              value={weightText(entry.kg)}
              minusDisabled={kg <= options[0]!}
              plusDisabled={kg >= options[options.length - 1]!}
              onMinus={() => updateEntry(index, { kg: stepWeight(entry.equipment, kg, -1) })}
              onPlus={() => updateEntry(index, { kg: stepWeight(entry.equipment, kg, 1) })}
            />
            <div className="entry__memory">
              {last ? (
                <span>
                  Última vez: <strong className="tabular">{weightText(last.kg)}</strong> ({formatShortDate(last.date)})
                </span>
              ) : (
                <span>Primera vez: empieza ligero.</span>
              )}
              {showRaise && (
                <button type="button" className="chip chip--raise" onClick={() => updateEntry(index, { kg: up })}>
                  Subir a {kgText(up)}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function FinishScreen({ workout, raised }: { workout: Workout; raised: number }) {
  const volume = Math.round(workoutVolume(workout));
  return (
    <motion.div className="finish" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
      <motion.span className="finish__mark" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.1 }}>
        <CheckIcon width={44} height={44} aria-hidden />
      </motion.span>
      <h1 className="finish__title">¡Hecho!</h1>
      <p className="finish__subtitle">{workout.routineName}</p>
      <dl className="finish__stats">
        <div>
          <dt>Ejercicios</dt>
          <dd className="tabular">{doneCount(workout)}</dd>
        </div>
        <div>
          <dt>Kilos movidos</dt>
          <dd className="tabular">{volume.toLocaleString("es-ES")}</dd>
        </div>
        <div>
          <dt>{plural(raised, "Subida", "Subidas")} de peso</dt>
          <dd className="tabular">{raised}</dd>
        </div>
      </dl>
      <Link to="/" className="btn btn--primary btn--large">
        <span className="btn__label">Volver</span>
      </Link>
    </motion.div>
  );
}

export function SessionPage() {
  const active = useActiveSession();
  const navigate = useNavigate();
  const { data: workouts = [] } = useWorkouts();
  const pending = useOutboxCount();
  const [details, setDetails] = useState<number | null>(null);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [finished, setFinished] = useState<{ workout: Workout; raised: number } | null>(null);

  const last = useMemo(() => lastWeights(workouts, active?.workout.id), [workouts, active?.workout.id]);

  if (finished) return <FinishScreen workout={finished.workout} raised={finished.raised} />;
  if (!active) return <Navigate to="/entrenar" replace />;

  const { workout, cardio } = active;
  const done = doneCount(workout);
  const total = workout.entries.length;
  const detailEntry = details === null ? null : workout.entries[details];

  const finish = () => {
    if (done === 0 && !cardio?.done) {
      if (confirm("No has marcado nada. ¿Salir sin guardar este entreno?")) {
        discardSession();
        navigate("/entrenar");
      }
      return;
    }
    const raised = workout.entries.filter((e) => {
      const before = last.get(e.exerciseId);
      return e.done && e.kg !== null && before && e.kg > before.kg;
    }).length;
    const result = finishSession();
    if (result) setFinished({ workout: result, raised });
  };

  return (
    <div className="session">
      <header className="session__bar">
        <Link to="/entrenar" className="icon-btn" aria-label="Volver a Entrenar (el entreno sigue guardado)">
          <ChevronLeft />
        </Link>
        <div className="session__title">
          <h1>{workout.routineName}</h1>
          <p className="tabular">
            {done} de {total} · {pending > 0 && !navigator.onLine ? "se enviará al tener cobertura" : "guardado"}
          </p>
        </div>
      </header>
      <div className="session__progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Progreso del entreno">
        <motion.span animate={{ width: `${total ? (done / total) * 100 : 0}%` }} transition={{ type: "spring", stiffness: 200, damping: 28 }} />
      </div>

      <ul className="session__list">
        {cardio && (
          <motion.li layout="position" className={`card entry ${cardio.done ? "entry--done" : ""}`}>
            <div className="entry__head">
              <div className="entry__text entry__text--static">
                <strong>Cardio</strong>
                <span className="tabular">{cardio.done ? `${cardio.minutes} min hechos` : "Calentamiento suave"}</span>
              </div>
              <Tick done={cardio.done} label="Cardio hecho" onClick={() => updateCardio({ done: !cardio.done })} />
            </div>
            {!cardio.done && (
              <div className="entry__weight">
                <CardioKindChips value={cardio.kind} onChange={(kind) => updateCardio({ kind })} />
                <Stepper
                  big
                  label="5 minutos"
                  value={`${cardio.minutes} min`}
                  minusDisabled={cardio.minutes <= 5}
                  onMinus={() => updateCardio({ minutes: cardio.minutes - 5 })}
                  onPlus={() => updateCardio({ minutes: cardio.minutes + 5 })}
                />
              </div>
            )}
          </motion.li>
        )}

        {workout.entries.map((entry, i) => (
          <EntryCard key={`${entry.exerciseId}-${i}`} entry={entry} index={i} last={last.get(entry.exerciseId)} onDetails={() => setDetails(i)} />
        ))}
      </ul>

      {!cardio && (
        <Button variant="ghost" onClick={addCardioToSession}>
          Añadir cardio
        </Button>
      )}

      <div className="session__footer">
        <Button size="large" variant={done === total && total > 0 ? "primary" : "secondary"} onClick={finish}>
          Terminar entreno
        </Button>
      </div>

      <Sheet open={detailEntry != null} title={detailEntry?.name ?? ""} onClose={() => setDetails(null)}>
        {detailEntry && (
          <div className="form">
            <div className="ex-frames">
              <ExerciseImage id={detailEntry.exerciseId} muscle={detailEntry.muscle} frame={0} />
              <ExerciseImage id={detailEntry.exerciseId} muscle={detailEntry.muscle} frame={1} />
            </div>
            <p className="field__hint">
              {MUSCLES[detailEntry.muscle]} · {EQUIPMENT[detailEntry.equipment]} · {detailEntry.sets} series de {detailEntry.reps}
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setSwapping(details);
                setDetails(null);
              }}
            >
              Cambiar por otro ejercicio
            </Button>
          </div>
        )}
      </Sheet>

      <ExercisePicker
        open={swapping !== null}
        onClose={() => setSwapping(null)}
        onPick={(exercise) => {
          if (swapping !== null) swapExercise(swapping, exercise);
        }}
      />
    </div>
  );
}
