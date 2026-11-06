import { motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { addDays } from "../../../shared/stats";
import { DEFAULT_ROUTINES } from "../../../shared/defaultRoutines";
import { countedWorkouts, doneCount, nextRoutine, workoutVolume } from "../../../shared/training";
import { MUSCLES } from "../../../shared/types";
import type { Routine } from "../../../shared/types";
import { formatShortDate, formatShortDateYear, plural } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { Button } from "../../ui/Button";
import { TrashIcon } from "../../ui/icons";
import { useToast } from "../../ui/Toast";
import { discardSession, startSession, useActiveSession } from "./activeSession";
import { CardioSheet } from "./CardioSheet";
import { deleteWorkout, useRestoreDefaults, useRoutines, useWorkouts } from "./useTraining";

const DAY = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric" });

const musclesOf = (r: Routine) => [...new Set(r.exercises.map((e) => MUSCLES[e.muscle]))].slice(0, 4).join(" · ");

export function dayLabel(date: string, today: string) {
  if (date === today) return "Hoy";
  if (date === addDays(today, -1)) return "Ayer";
  const [y, m, d] = date.split("-").map(Number);
  return DAY.format(new Date(y!, m! - 1, d!)).replace(",", "");
}

export function TrainPage() {
  const today = useToday();
  const navigate = useNavigate();
  const active = useActiveSession();
  const toast = useToast();
  const routines = useRoutines();
  const { data: workouts = [] } = useWorkouts();
  const restore = useRestoreDefaults();
  const [date, setDate] = useState(today);
  const [cardioOpen, setCardioOpen] = useState(false);

  const list = routines.data ?? [];
  const next = nextRoutine(list, workouts);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const recent = countedWorkouts(workouts).filter((w) => w.finishedAt).slice(0, 6);
  const missingDefaults = routines.isSuccess && list.filter((r) => r.isDefault).length < DEFAULT_ROUTINES.length;

  const start = (routine: Routine) => {
    if (active) return;
    startSession(routine, date);
    navigate("/entrenar/sesion");
  };

  return (
    <>
      <header className="page__header page__header--row">
        <h1 className="page__title">Entrenar</h1>
        <Button variant="secondary" onClick={() => setCardioOpen(true)}>
          Solo cardio
        </Button>
      </header>

      {active && (
        <section className="card resume">
          <div>
            <p className="resume__label">Entreno en curso</p>
            <h2 className="resume__title">{active.workout.routineName}</h2>
            <p className="field__hint">
              {doneCount(active.workout)} de {active.workout.entries.length} ejercicios hechos
            </p>
          </div>
          <div className="resume__actions">
            <Button onClick={() => navigate("/entrenar/sesion")}>Continuar</Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("¿Descartar el entreno en curso?")) discardSession();
              }}
            >
              Descartar
            </Button>
          </div>
        </section>
      )}

      {!active && (
        <section aria-label="Día del entreno">
          <h2 className="section-title">¿Qué día?</h2>
          <div className="chips chips--scroll" role="group" aria-label="Día del entreno">
            {days.map((d) => (
              <button key={d} type="button" className="chip chip--day" aria-pressed={date === d} onClick={() => setDate(d)}>
                {dayLabel(d, today)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section aria-label="Rutinas">
        <h2 className="section-title">Rutina</h2>
        {routines.isPending && <div className="card skeleton" style={{ height: 220 }} />}
        {routines.isError && list.length === 0 && (
          <div className="card empty">
            <p>No se han podido cargar las rutinas. Comprueba la conexión.</p>
            <Button variant="secondary" onClick={() => routines.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        <ul className="routine-list">
          {list.map((routine) => {
            const isNext = routine.id === next?.id;
            return (
              <motion.li key={routine.id} layout="position" className={`card routine ${isNext ? "routine--next" : ""}`}>
                <div className="routine__body">
                  {isNext && <span className="routine__badge">Te toca</span>}
                  <h3 className="routine__name">{routine.name}</h3>
                  <p className="routine__meta">
                    {routine.exercises.length} {plural(routine.exercises.length, "ejercicio", "ejercicios")}
                    {routine.cardioMinutes > 0 && ` · ${routine.cardioMinutes} min de cardio`}
                  </p>
                  <p className="routine__muscles">{musclesOf(routine)}</p>
                </div>
                <div className="routine__actions">
                  <Button variant={isNext ? "primary" : "secondary"} disabled={!!active || routine.exercises.length === 0} onClick={() => start(routine)}>
                    Empezar
                  </Button>
                  <Link to={`/entrenar/rutina/${routine.id}`} className="routine__edit">
                    Editar
                  </Link>
                </div>
              </motion.li>
            );
          })}
        </ul>
        <div className="routine-tools">
          <Link to="/entrenar/rutina/nueva" className="btn btn--secondary btn--medium">
            <span className="btn__label">Nueva rutina</span>
          </Link>
          {missingDefaults && (
            <Button variant="ghost" busy={restore.isPending} onClick={() => restore.mutate()}>
              Recuperar las de aclimatación
            </Button>
          )}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="card card--list" aria-labelledby="recent-title">
          <h2 className="card__title" id="recent-title">
            Últimos entrenos
          </h2>
          <ul className="history">
            {recent.map((w) => (
              <li key={w.id} className="activity-row activity-row--action">
                <span className="history__date" title={formatShortDateYear(w.date)}>
                  {formatShortDate(w.date)}
                </span>
                <span className="activity-row__title">{w.routineName}</span>
                <span className="history__delta tabular">{Math.round(workoutVolume(w)).toLocaleString("es-ES")} kg</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  aria-label={`Borrar el entreno ${w.routineName} del ${formatShortDate(w.date)}`}
                  onClick={() => {
                    if (confirm(`¿Borrar ${w.routineName} del ${formatShortDate(w.date)}?`)) {
                      deleteWorkout(w.id);
                      toast({ message: "Entreno borrado" });
                    }
                  }}
                >
                  <TrashIcon width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CardioSheet open={cardioOpen} onClose={() => setCardioOpen(false)} date={date} />
    </>
  );
}
