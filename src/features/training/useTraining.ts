import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { CardioEntry, CatalogExercise, CustomExercise, Routine, Workout } from "../../../shared/types";
import { api } from "../../lib/api";
import { enqueue } from "../../lib/outbox";
import { fetchAfterSync, QK, queryClient } from "../../lib/queryClient";
import { addVisitLocally } from "../calendar/useVisits";

export function useRoutines() {
  return useQuery({ queryKey: QK.routines, queryFn: fetchAfterSync(() => api<Routine[]>("GET", "/routines")) });
}

export function useWorkouts() {
  return useQuery({ queryKey: QK.workouts, queryFn: fetchAfterSync(() => api<Workout[]>("GET", "/workouts")) });
}

export function useCardio() {
  return useQuery({ queryKey: QK.cardio, queryFn: fetchAfterSync(() => api<CardioEntry[]>("GET", "/cardio")) });
}

export function useCustomExercises() {
  return useQuery({ queryKey: QK.customExercises, queryFn: () => api<CustomExercise[]>("GET", "/routines/custom-exercises/all") });
}

export function saveRoutine(routine: Routine) {
  queryClient.setQueryData<Routine[]>(QK.routines, (list = []) =>
    [...list.filter((r) => r.id !== routine.id), routine].sort((a, b) => a.position - b.position)
  );
  enqueue({ key: `routine:${routine.id}`, method: "PUT", path: `/routines/${routine.id}`, body: routine });
}

export function deleteRoutine(id: string) {
  queryClient.setQueryData<Routine[]>(QK.routines, (list = []) => list.filter((r) => r.id !== id));
  enqueue({ key: `routine:${id}`, method: "DELETE", path: `/routines/${id}` });
}

export function useRestoreDefaults() {
  return useMutation({
    mutationFn: () => api<Routine[]>("POST", "/routines/restore-defaults"),
    onSuccess: (list) => queryClient.setQueryData(QK.routines, list),
  });
}

export function saveCustomExercise(exercise: CustomExercise) {
  queryClient.setQueryData<CustomExercise[]>(QK.customExercises, (list = []) => [...list.filter((e) => e.id !== exercise.id), exercise]);
  enqueue({ key: `custom:${exercise.id}`, method: "PUT", path: `/routines/custom-exercises/${exercise.id}`, body: exercise });
}

export function saveCardio(entry: CardioEntry) {
  queryClient.setQueryData<CardioEntry[]>(QK.cardio, (list = []) => [entry, ...list.filter((c) => c.id !== entry.id)]);
  addVisitLocally(entry.date);
  enqueue({ key: `cardio:${entry.id}`, method: "PUT", path: `/cardio/${entry.id}`, body: entry });
}

export function deleteCardio(id: string) {
  queryClient.setQueryData<CardioEntry[]>(QK.cardio, (list = []) => list.filter((c) => c.id !== id));
  enqueue({ key: `cardio:${id}`, method: "DELETE", path: `/cardio/${id}` });
}

export function deleteWorkout(id: string) {
  queryClient.setQueryData<Workout[]>(QK.workouts, (list = []) => list.filter((w) => w.id !== id));
  enqueue({ key: `workout:${id}`, method: "DELETE", path: `/workouts/${id}` });
}

// ---------- Catálogo de ejercicios (archivo estático: funciona sin cobertura) ----------

let catalogPromise: Promise<CatalogExercise[]> | null = null;

function loadCatalog() {
  catalogPromise ??= fetch("/exercises.json")
    .then((r) => {
      if (!r.ok) throw new Error("catálogo");
      return r.json() as Promise<CatalogExercise[]>;
    })
    .catch((error) => {
      catalogPromise = null;
      throw error;
    });
  return catalogPromise;
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogExercise[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadCatalog().then(
      (list) => alive && setCatalog(list),
      () => alive && setFailed(true)
    );
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => ({ catalog, failed }), [catalog, failed]);
}

const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export const exerciseImage = (id: string, frame = 0) =>
  id.startsWith("custom-") ? null : `${IMAGE_BASE}/${encodeURIComponent(id)}/${frame}.jpg`;
