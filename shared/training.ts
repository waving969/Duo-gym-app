// Lógica de entreno sin dependencias: pesos estándar, memoria de pesos y estadísticas.
import { addDays, startOfWeek } from "./stats";
import type { CardioEntry, Equipment, Routine, Workout } from "./types";

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

const PLATES = [...range(2.5, 20, 2.5), ...range(25, 200, 5)];
const DUMBBELLS = [...range(1, 10, 1), ...range(12, 60, 2)];
const KETTLEBELLS = range(4, 48, 2);
const BARBELL = [...range(5, 200, 2.5)];
const BODY = [0, ...range(2.5, 60, 2.5)];

/** Pesos que existen de verdad en el gym para cada material: el selector solo se mueve por ellos. */
export function weightOptions(equipment: Equipment): number[] {
  switch (equipment) {
    case "mancuernas":
      return DUMBBELLS;
    case "kettlebell":
      return KETTLEBELLS;
    case "barra":
      return BARBELL;
    case "corporal":
    case "fitball":
    case "rodillo":
      return BODY;
    default:
      return PLATES;
  }
}

/** Peso con el que empezar si nunca has hecho ese ejercicio: ligero. */
export function startingWeight(equipment: Equipment): number {
  switch (equipment) {
    case "mancuernas":
      return 4;
    case "kettlebell":
      return 8;
    case "barra":
      return 20;
    case "corporal":
    case "fitball":
    case "rodillo":
      return 0;
    default:
      return 10;
  }
}

/** Siguiente peso disponible hacia arriba (+1) o hacia abajo (-1). */
export function stepWeight(equipment: Equipment, kg: number, direction: 1 | -1): number {
  const options = weightOptions(equipment);
  if (direction > 0) return options.find((o) => o > kg) ?? options[options.length - 1]!;
  for (let i = options.length - 1; i >= 0; i--) if (options[i]! < kg) return options[i]!;
  return options[0]!;
}

export interface LastLift {
  kg: number;
  date: string;
}

/** Último peso usado en cada ejercicio, de los entrenos ya hechos. */
export function lastWeights(workouts: readonly Workout[], excludeWorkoutId?: string): Map<string, LastLift> {
  const last = new Map<string, LastLift>();
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt - b.startedAt)) {
    if (w.id === excludeWorkoutId) continue;
    for (const e of w.entries) if (e.done && e.kg !== null) last.set(e.exerciseId, { kg: e.kg, date: w.date });
  }
  return last;
}

export interface LiftPoint {
  date: string;
  kg: number;
}

/** Evolución del peso en un ejercicio. Si un día hay dos registros, se queda el mayor. */
export function exerciseHistory(workouts: readonly Workout[], exerciseId: string): LiftPoint[] {
  const byDate = new Map<string, number>();
  for (const w of workouts) {
    for (const e of w.entries) {
      if (e.exerciseId === exerciseId && e.done && e.kg !== null) byDate.set(w.date, Math.max(byDate.get(w.date) ?? 0, e.kg));
    }
  }
  return [...byDate].map(([date, kg]) => ({ date, kg })).sort((a, b) => a.date.localeCompare(b.date));
}

export interface TrackedExercise {
  exerciseId: string;
  name: string;
  times: number;
  bestKg: number;
  lastKg: number;
  lastDate: string;
}

export function trackedExercises(workouts: readonly Workout[]): TrackedExercise[] {
  const map = new Map<string, TrackedExercise>();
  for (const w of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const e of w.entries) {
      if (!e.done || e.kg === null) continue;
      const t = map.get(e.exerciseId);
      map.set(e.exerciseId, {
        exerciseId: e.exerciseId,
        name: e.name,
        times: (t?.times ?? 0) + 1,
        bestKg: Math.max(t?.bestKg ?? 0, e.kg),
        lastKg: e.kg,
        lastDate: w.date,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.times - a.times);
}

/** Kilos totales movidos en un entreno (peso × series × repeticiones). */
export function workoutVolume(w: Workout): number {
  return w.entries.reduce((sum, e) => sum + (e.done && e.kg ? e.kg * e.sets * e.reps : 0), 0);
}

export const doneCount = (w: Workout) => w.entries.filter((e) => e.done).length;

/** Un entreno cuenta si se ha hecho al menos un ejercicio. */
export const countedWorkouts = (workouts: readonly Workout[]) => workouts.filter((w) => doneCount(w) > 0);

const inMonth = (date: string, today: string) => date.slice(0, 7) === today.slice(0, 7);

export interface Totals {
  workouts: number;
  workoutsThisMonth: number;
  volumeThisMonth: number;
  cardioMinutes: number;
  cardioThisMonth: number;
}

export function trainingTotals(workouts: readonly Workout[], cardio: readonly CardioEntry[], today: string): Totals {
  const counted = countedWorkouts(workouts);
  const month = counted.filter((w) => inMonth(w.date, today));
  return {
    workouts: counted.length,
    workoutsThisMonth: month.length,
    volumeThisMonth: Math.round(month.reduce((s, w) => s + workoutVolume(w), 0)),
    cardioMinutes: cardio.reduce((s, c) => s + c.minutes, 0),
    cardioThisMonth: cardio.filter((c) => inMonth(c.date, today)).reduce((s, c) => s + c.minutes, 0),
  };
}

export interface WeekBucket {
  week: string; // lunes
  days: number;
}

/** Días de gym por semana, de la más antigua a la actual. */
export function weeklyVisits(visits: Iterable<string>, today: string, weeks = 8): WeekBucket[] {
  const current = startOfWeek(today);
  const buckets: WeekBucket[] = Array.from({ length: weeks }, (_, i) => ({
    week: addDays(current, (i - weeks + 1) * 7),
    days: 0,
  }));
  const index = new Map(buckets.map((b, i) => [b.week, i]));
  for (const v of visits) {
    const i = index.get(startOfWeek(v));
    if (i !== undefined) buckets[i]!.days++;
  }
  return buckets;
}

/** Rutina que toca: la siguiente a la última que hiciste, en orden. */
export function nextRoutine(routines: readonly Routine[], workouts: readonly Workout[]): Routine | null {
  if (routines.length === 0) return null;
  const sorted = [...routines].sort((a, b) => a.position - b.position);
  const last = [...countedWorkouts(workouts)].sort((a, b) => b.date.localeCompare(a.date) || b.startedAt - a.startedAt)
    .find((w) => w.routineId && sorted.some((r) => r.id === w.routineId));
  if (!last) return sorted[0]!;
  const index = sorted.findIndex((r) => r.id === last.routineId);
  return sorted[(index + 1) % sorted.length]!;
}
