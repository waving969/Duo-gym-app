// El entreno en curso vive en el móvil: cada toque se guarda al instante, aunque no haya cobertura,
// y sobrevive si se cierra la app a mitad.
import { useSyncExternalStore } from "react";
import { lastWeights, startingWeight } from "../../../shared/training";
import type { CardioKind, Routine, RoutineExercise, Workout, WorkoutEntry } from "../../../shared/types";
import { enqueue } from "../../lib/outbox";
import { QK, queryClient } from "../../lib/queryClient";
import { addVisitLocally } from "../calendar/useVisits";
import { deleteCardio, saveCardio } from "./useTraining";

const STORAGE_KEY = "duo.active.v1";

export interface ActiveCardio {
  id: string;
  kind: CardioKind;
  minutes: number;
  done: boolean;
}

export interface ActiveSession {
  workout: Workout;
  cardio: ActiveCardio | null;
  synced: boolean;
}

function load(): ActiveSession | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as ActiveSession | null;
  } catch {
    return null;
  }
}

let session = load();
const listeners = new Set<() => void>();

function set(next: ActiveSession | null) {
  session = next;
  try {
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento el entreno sigue en memoria mientras la app esté abierta.
  }
  listeners.forEach((l) => l());
}

export function useActiveSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session
  );
}

function storeWorkout(workout: Workout) {
  queryClient.setQueryData<Workout[]>(QK.workouts, (list = []) => [workout, ...list.filter((w) => w.id !== workout.id)]);
  enqueue({ key: `workout:${workout.id}`, method: "PUT", path: `/workouts/${workout.id}`, body: workout });
}

function initialKg(e: RoutineExercise, last: ReturnType<typeof lastWeights>) {
  return last.get(e.exerciseId)?.kg ?? startingWeight(e.equipment);
}

export function startSession(routine: Routine, date: string) {
  const last = lastWeights(queryClient.getQueryData<Workout[]>(QK.workouts) ?? []);
  set({
    synced: false,
    cardio: routine.cardioMinutes > 0 ? { id: crypto.randomUUID(), kind: "cinta", minutes: routine.cardioMinutes, done: false } : null,
    workout: {
      id: crypto.randomUUID(),
      date,
      routineId: routine.id,
      routineName: routine.name,
      startedAt: Date.now(),
      finishedAt: null,
      entries: routine.exercises.map((e) => ({ ...e, kg: initialKg(e, last), done: false })),
    },
  });
}

/** El entreno se envía al hacer el primer ejercicio: empezar y descartar no deja rastro. */
function updateWorkout(change: (w: Workout) => Workout) {
  if (!session) return;
  const workout = change(session.workout);
  const hasProgress = workout.entries.some((e) => e.done);
  const synced = session.synced || hasProgress;
  set({ ...session, workout, synced });
  if (synced) storeWorkout(workout);
  if (hasProgress) addVisitLocally(workout.date);
}

export function updateEntry(index: number, patch: Partial<WorkoutEntry>) {
  updateWorkout((w) => ({ ...w, entries: w.entries.map((e, i) => (i === index ? { ...e, ...patch } : e)) }));
}

export function swapExercise(index: number, exercise: Pick<RoutineExercise, "exerciseId" | "name" | "muscle" | "equipment">) {
  const last = lastWeights(queryClient.getQueryData<Workout[]>(QK.workouts) ?? []);
  updateEntry(index, { ...exercise, kg: last.get(exercise.exerciseId)?.kg ?? startingWeight(exercise.equipment), done: false });
}

export function updateCardio(patch: Partial<ActiveCardio>) {
  if (!session?.cardio) return;
  const previous = session.cardio;
  const cardio = { ...previous, ...patch };
  set({ ...session, cardio });
  if (cardio.done) saveCardio({ id: cardio.id, date: session.workout.date, kind: cardio.kind, minutes: cardio.minutes });
  else if (previous.done) deleteCardio(cardio.id);
}

export function addCardioToSession() {
  if (!session || session.cardio) return;
  set({ ...session, cardio: { id: crypto.randomUUID(), kind: "cinta", minutes: 10, done: false } });
}

export function finishSession(): Workout | null {
  if (!session) return null;
  const workout = { ...session.workout, finishedAt: Date.now() };
  if (workout.entries.some((e) => e.done)) storeWorkout(workout);
  else if (session.synced) enqueue({ key: `workout:${workout.id}`, method: "DELETE", path: `/workouts/${workout.id}` });
  set(null);
  return workout;
}

export function discardSession() {
  if (!session) return;
  const { workout, synced, cardio } = session;
  if (synced) {
    queryClient.setQueryData<Workout[]>(QK.workouts, (list = []) => list.filter((w) => w.id !== workout.id));
    enqueue({ key: `workout:${workout.id}`, method: "DELETE", path: `/workouts/${workout.id}` });
  }
  if (cardio?.done) deleteCardio(cardio.id);
  set(null);
}
