// Lecturas compartidas: las usa tanto la vista propia como la de la pareja.
import type { CardioEntry, CardioKind, Equipment, Muscle, Workout, WorkoutEntry } from "../../shared/types";

interface WorkoutRow {
  id: string;
  date: string;
  routine_id: string | null;
  routine_name: string;
  started_at: number;
  finished_at: number | null;
}

interface EntryRow {
  workout_id: string;
  exercise_id: string;
  name: string;
  muscle: string;
  equipment: string;
  grams: number | null;
  sets: number;
  reps: number;
  done: number;
}

export async function loadWorkouts(db: D1Database, userId: string): Promise<Workout[]> {
  const [workouts, entries] = await db.batch([
    db.prepare(
      "SELECT id, date, routine_id, routine_name, started_at, finished_at FROM workouts WHERE user_id = ? ORDER BY date DESC, started_at DESC"
    ).bind(userId),
    db.prepare(
      `SELECT e.* FROM workout_entries e JOIN workouts w ON w.id = e.workout_id
       WHERE w.user_id = ? ORDER BY e.workout_id, e.position`
    ).bind(userId),
  ]);

  const byWorkout = new Map<string, WorkoutEntry[]>();
  for (const e of entries!.results as unknown as EntryRow[]) {
    if (!byWorkout.has(e.workout_id)) byWorkout.set(e.workout_id, []);
    byWorkout.get(e.workout_id)!.push({
      exerciseId: e.exercise_id,
      name: e.name,
      muscle: e.muscle as Muscle,
      equipment: e.equipment as Equipment,
      kg: e.grams === null ? null : e.grams / 1000,
      sets: e.sets,
      reps: e.reps,
      done: !!e.done,
    });
  }

  return (workouts!.results as unknown as WorkoutRow[]).map((w) => ({
    id: w.id,
    date: w.date,
    routineId: w.routine_id,
    routineName: w.routine_name,
    startedAt: w.started_at,
    finishedAt: w.finished_at,
    entries: byWorkout.get(w.id) ?? [],
  }));
}

export async function loadCardio(db: D1Database, userId: string): Promise<CardioEntry[]> {
  const { results } = await db
    .prepare("SELECT id, date, kind, minutes FROM cardio WHERE user_id = ? ORDER BY date DESC, created_at DESC")
    .bind(userId)
    .all<{ id: string; date: string; kind: string; minutes: number }>();
  return results.map((r) => ({ ...r, kind: r.kind as CardioKind }));
}

export async function loadVisits(db: D1Database, userId: string): Promise<string[]> {
  const { results } = await db.prepare("SELECT date FROM gym_visits WHERE user_id = ? ORDER BY date").bind(userId).all<{ date: string }>();
  return results.map((r) => r.date);
}

export const markVisit = (db: D1Database, userId: string, date: string) =>
  db.prepare("INSERT OR IGNORE INTO gym_visits (user_id, date, created_at) VALUES (?, ?, ?)").bind(userId, date, Date.now());
