import { describe, expect, it } from "vitest";
import { exerciseHistory, lastWeights, nextRoutine, stepWeight, trainingTotals, weeklyVisits, weightOptions, workoutVolume } from "./training";
import type { Routine, Workout, WorkoutEntry } from "./types";

const entry = (exerciseId: string, kg: number | null, done = true): WorkoutEntry => ({
  exerciseId,
  name: exerciseId,
  muscle: "pecho",
  equipment: "maquina",
  sets: 2,
  reps: 10,
  kg,
  done,
});

const workout = (id: string, date: string, entries: WorkoutEntry[], routineId: string | null = null): Workout => ({
  id,
  date,
  routineId,
  routineName: "R",
  startedAt: 0,
  finishedAt: 1,
  entries,
});

describe("selector de pesos", () => {
  it("se mueve solo por pesos estándar de cada material", () => {
    expect(stepWeight("mancuernas", 10, 1)).toBe(12);
    expect(stepWeight("mancuernas", 12, -1)).toBe(10);
    expect(stepWeight("maquina", 20, 1)).toBe(25);
    expect(stepWeight("maquina", 10, 1)).toBe(12.5);
    expect(stepWeight("barra", 20, 1)).toBe(22.5);
  });

  it("no se sale de los límites", () => {
    expect(stepWeight("mancuernas", 1, -1)).toBe(1);
    expect(stepWeight("mancuernas", 60, 1)).toBe(60);
    expect(stepWeight("corporal", 0, -1)).toBe(0);
  });

  it("un peso guardado fuera de la lista salta al siguiente real", () => {
    expect(stepWeight("mancuernas", 11, 1)).toBe(12);
    expect(stepWeight("mancuernas", 11, -1)).toBe(10);
    expect(weightOptions("corporal")[0]).toBe(0);
  });
});

describe("memoria de pesos", () => {
  const list = [
    workout("a", "2026-11-02", [entry("press", 20), entry("remo", 30)]),
    workout("b", "2026-11-09", [entry("press", 25), entry("remo", 35, false)]),
  ];

  it("recuerda el último peso hecho, sin contar lo no marcado", () => {
    const last = lastWeights(list);
    expect(last.get("press")).toEqual({ kg: 25, date: "2026-11-09" });
    expect(last.get("remo")).toEqual({ kg: 30, date: "2026-11-02" });
  });

  it("puede ignorar el entreno en curso", () => {
    expect(lastWeights(list, "b").get("press")?.kg).toBe(20);
  });

  it("da la evolución por fecha", () => {
    expect(exerciseHistory(list, "press")).toEqual([
      { date: "2026-11-02", kg: 20 },
      { date: "2026-11-09", kg: 25 },
    ]);
  });
});

describe("estadísticas", () => {
  it("el volumen solo cuenta lo hecho", () => {
    expect(workoutVolume(workout("a", "2026-11-02", [entry("x", 20), entry("y", 50, false), entry("z", null)]))).toBe(400);
  });

  it("los totales ignoran entrenos vacíos y separan el mes", () => {
    const t = trainingTotals(
      [workout("a", "2026-11-02", [entry("x", 10)]), workout("b", "2026-10-02", [entry("x", 10)]), workout("c", "2026-11-03", [entry("x", 10, false)])],
      [
        { id: "1", date: "2026-11-02", kind: "cinta", minutes: 10 },
        { id: "2", date: "2026-10-02", kind: "bici", minutes: 20 },
      ],
      "2026-11-06"
    );
    expect(t).toEqual({ workouts: 2, workoutsThisMonth: 1, volumeThisMonth: 200, cardioMinutes: 30, cardioThisMonth: 10 });
  });

  it("agrupa los días por semana", () => {
    const w = weeklyVisits(["2026-11-02", "2026-11-04", "2026-10-26", "2020-01-01"], "2026-11-06", 2);
    expect(w).toEqual([
      { week: "2026-10-26", days: 1 },
      { week: "2026-11-02", days: 2 },
    ]);
  });
});

describe("rutina que toca", () => {
  const routine = (id: string, position: number): Routine => ({ id, name: id, note: "", position, cardioMinutes: 0, isDefault: false, exercises: [] });
  const routines = [routine("a", 0), routine("b", 1), routine("c", 2)];

  it("empieza por la primera y va rotando", () => {
    expect(nextRoutine(routines, [])?.id).toBe("a");
    expect(nextRoutine(routines, [workout("1", "2026-11-02", [entry("x", 1)], "a")])?.id).toBe("b");
    expect(nextRoutine(routines, [workout("1", "2026-11-02", [entry("x", 1)], "c")])?.id).toBe("a");
  });

  it("un entreno sin nada hecho no cuenta", () => {
    expect(nextRoutine(routines, [workout("1", "2026-11-02", [entry("x", 1, false)], "a")])?.id).toBe("a");
  });
});
