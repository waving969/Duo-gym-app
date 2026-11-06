import { useMemo, useState } from "react";
import { visitsInWeek, weekStreak } from "../../../shared/stats";
import { countedWorkouts, doneCount, exerciseHistory, trackedExercises, trainingTotals, weeklyVisits, workoutVolume } from "../../../shared/training";
import { CARDIO_KINDS } from "../../../shared/types";
import type { CardioEntry, Workout } from "../../../shared/types";
import { formatShortDate, formatShortDateYear, plural } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { CheckIcon, ChevronRight } from "../../ui/icons";
import { WeightChart } from "../weight/WeightChart";
import { WeeklyBars } from "./WeeklyBars";

const kg = (n: number) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} kg`;

/** Resumen: lo usan tu vista y la de tu pareja, con los datos de cada uno. */
export function SummaryView({ visits, workouts, cardio, weeklyGoal }: {
  visits: ReadonlySet<string>;
  workouts: Workout[];
  cardio: CardioEntry[];
  weeklyGoal: number;
}) {
  const today = useToday();
  const totals = trainingTotals(workouts, cardio, today);
  const streak = weekStreak(visits, weeklyGoal, today);
  const buckets = weeklyVisits(visits, today);

  return (
    <>
      <section className="stats" aria-label="Resumen">
        <div className="stat">
          <span className="stat__value tabular">
            {visitsInWeek(visits, today)}
            <small>/{weeklyGoal}</small>
          </span>
          <span className="stat__label">días esta semana</span>
        </div>
        <div className="stat">
          <span className="stat__value tabular">{streak}</span>
          <span className="stat__label">{plural(streak, "semana", "semanas")} de racha</span>
        </div>
        <div className="stat">
          <span className="stat__value tabular">{totals.workoutsThisMonth}</span>
          <span className="stat__label">{plural(totals.workoutsThisMonth, "entreno", "entrenos")} este mes</span>
        </div>
        <div className="stat stat--wide">
          <span className="stat__value tabular">{totals.volumeThisMonth.toLocaleString("es-ES")}</span>
          <span className="stat__label">kilos movidos este mes</span>
        </div>
        <div className="stat stat--wide">
          <span className="stat__value tabular">{totals.cardioThisMonth}</span>
          <span className="stat__label">minutos de cardio este mes</span>
        </div>
      </section>

      <section className="card" aria-labelledby="weeks-title">
        <h2 className="card__title" id="weeks-title">
          Días de gym por semana
        </h2>
        <WeeklyBars series={[{ label: "Días", buckets, className: "bars__bar--a" }]} goal={weeklyGoal} />
      </section>
    </>
  );
}

export function ActivityList({ workouts, cardio, limit = 12 }: { workouts: Workout[]; cardio: CardioEntry[]; limit?: number }) {
  const items = [
    ...countedWorkouts(workouts).map((w) => ({
      key: w.id,
      date: w.date,
      order: w.startedAt,
      workout: w,
      title: w.routineName,
      detail: `${doneCount(w)} ejerc. · ${Math.round(workoutVolume(w)).toLocaleString("es-ES")} kg`,
    })),
    ...cardio.map((c) => ({ key: c.id, date: c.date, order: 0, workout: null, title: CARDIO_KINDS[c.kind], detail: `${c.minutes} min de cardio` })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date) || b.order - a.order)
    .slice(0, limit);

  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) return <p className="chart-empty">Todavía no hay actividad.</p>;

  return (
    <ul className="history">
      {items.map((item) => (
        <li key={item.key} className="activity">
          <button
            type="button"
            className="activity__row"
            disabled={!item.workout}
            aria-expanded={item.workout ? open === item.key : undefined}
            onClick={() => setOpen(open === item.key ? null : item.key)}
          >
            <span className="history__date">{formatShortDate(item.date)}</span>
            <span className="activity-row__title">
              {item.title}
              {item.workout && !item.workout.finishedAt && <span className="live-dot">en curso</span>}
            </span>
            <span className="history__delta tabular">{item.detail}</span>
          </button>
          {item.workout && open === item.key && (
            <ul className="activity__detail">
              {item.workout.entries.filter((e) => e.done).map((e) => (
                <li key={e.exerciseId}>
                  <span>{e.name}</span>
                  <strong className="tabular">{e.kg ? kg(e.kg) : "Sin peso"}</strong>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Cada ejercicio con su evolución: de semana en semana se ve cuánto has subido. */
export function ExercisesView({ workouts, emptyText }: { workouts: Workout[]; emptyText: string }) {
  const tracked = useMemo(() => trackedExercises(workouts), [workouts]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = tracked.find((t) => t.exerciseId === selected) ?? null;
  const points = useMemo(() => (selected ? exerciseHistory(workouts, selected) : []), [workouts, selected]);

  if (tracked.length === 0) {
    return (
      <section className="card empty">
        <h2>Sin ejercicios todavía</h2>
        <p>{emptyText}</p>
      </section>
    );
  }

  return (
    <>
      {current && (
        <section className="card">
          <h2 className="card__title">{current.name}</h2>
          <p className="hero-number__meta">
            Último: <strong className="tabular">{kg(current.lastKg)}</strong> · Máximo: <strong className="tabular">{kg(current.bestKg)}</strong> · {current.times}{" "}
            {plural(current.times, "vez", "veces")}
          </p>
          {points.length >= 2 ? (
            <WeightChart entries={points} goalKg={null} label={`Evolución de ${current.name}`} />
          ) : (
            <p className="chart-empty">Con dos días registrados ya verás la línea.</p>
          )}
        </section>
      )}
      <section className="card card--list" aria-label="Ejercicios registrados">
        <ul className="history">
          {tracked.map((t) => (
            <li key={t.exerciseId}>
              <button type="button" className={`tracked ${selected === t.exerciseId ? "tracked--on" : ""}`} aria-pressed={selected === t.exerciseId} onClick={() => setSelected(t.exerciseId)}>
                <span className="tracked__name">
                  <strong>{t.name}</strong>
                  <span>{formatShortDateYear(t.lastDate)}</span>
                </span>
                <strong className="tabular">{t.lastKg ? kg(t.lastKg) : "Sin peso"}</strong>
                {selected === t.exerciseId ? <CheckIcon width={18} height={18} aria-hidden /> : <ChevronRight width={18} height={18} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
