import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { DEFAULT_ROUTINES } from "../../shared/defaultRoutines";
import type { DefaultRoutine } from "../../shared/defaultRoutines";
import { LIMITS } from "../../shared/types";
import type { CustomExercise, Equipment, Muscle, Routine, RoutineExercise } from "../../shared/types";
import type { AppContext, AppEnv } from "../env";
import { requireAuth } from "../lib/session";
import { badRequest, parseEquipment, parseId, parseInteger, parseMuscle, parseRoutineExercise, parseText, readJson } from "../lib/validate";

export const routines = new Hono<AppEnv>();
routines.use("*", requireAuth);

function insertRoutineStatements(db: D1Database, userId: string, id: string, r: Omit<DefaultRoutine, "key">, position: number, key: string | null) {
  return [
    db
      .prepare(
        `INSERT INTO routines (id, user_id, name, note, position, cardio_minutes, default_key, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, note = excluded.note, position = excluded.position,
           cardio_minutes = excluded.cardio_minutes, updated_at = excluded.updated_at`
      )
      .bind(id, userId, r.name, r.note, position, r.cardioMinutes, key, Date.now()),
    db.prepare("DELETE FROM routine_exercises WHERE routine_id = ?").bind(id),
    ...r.exercises.map((e, i) =>
      db
        .prepare(
          "INSERT INTO routine_exercises (routine_id, position, exercise_id, name, muscle, equipment, sets, reps) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id, i, e.exerciseId, e.name, e.muscle, e.equipment, e.sets, e.reps)
    ),
  ];
}

async function addDefaults(c: AppContext, onlyMissing: boolean) {
  const db = c.env.DB;
  const userId = c.get("user").id;
  const { results } = await db
    .prepare("SELECT default_key, position FROM routines WHERE user_id = ?")
    .bind(userId)
    .all<{ default_key: string | null; position: number }>();
  const existing = new Set(results.map((r) => r.default_key));
  let position = results.reduce((max, r) => Math.max(max, r.position + 1), 0);
  const statements = DEFAULT_ROUTINES.filter((r) => !onlyMissing || !existing.has(r.key)).flatMap((r) =>
    insertRoutineStatements(db, userId, crypto.randomUUID(), r, position++, r.key)
  );
  statements.push(db.prepare("UPDATE users SET routines_seeded = 1 WHERE id = ?").bind(userId));
  await db.batch(statements);
}

async function listRoutines(c: AppContext): Promise<Routine[]> {
  const db = c.env.DB;
  const userId = c.get("user").id;
  const [rows, exercises] = await db.batch([
    db.prepare("SELECT id, name, note, position, cardio_minutes, default_key FROM routines WHERE user_id = ? ORDER BY position").bind(userId),
    db
      .prepare(
        `SELECT e.* FROM routine_exercises e JOIN routines r ON r.id = e.routine_id
         WHERE r.user_id = ? ORDER BY e.routine_id, e.position`
      )
      .bind(userId),
  ]);
  const byRoutine = new Map<string, RoutineExercise[]>();
  for (const e of exercises!.results as unknown as Record<string, unknown>[]) {
    const id = e.routine_id as string;
    if (!byRoutine.has(id)) byRoutine.set(id, []);
    byRoutine.get(id)!.push({
      exerciseId: e.exercise_id as string,
      name: e.name as string,
      muscle: e.muscle as Muscle,
      equipment: e.equipment as Equipment,
      sets: e.sets as number,
      reps: e.reps as number,
    });
  }
  return (rows!.results as unknown as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    note: r.note as string,
    position: r.position as number,
    cardioMinutes: r.cardio_minutes as number,
    isDefault: r.default_key !== null,
    exercises: byRoutine.get(r.id as string) ?? [],
  }));
}

routines.get("/", async (c) => {
  // La primera vez cada uno recibe su propia copia de la rutina de aclimatación, para cambiarla a su gusto.
  if (!c.get("user").routines_seeded) await addDefaults(c, true);
  return c.json(await listRoutines(c));
});

routines.post("/restore-defaults", async (c) => {
  await addDefaults(c, true);
  return c.json(await listRoutines(c));
});

routines.put("/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  const body = await readJson(c.req);
  const user = c.get("user");
  const owner = await c.env.DB.prepare("SELECT user_id, default_key FROM routines WHERE id = ?")
    .bind(id)
    .first<{ user_id: string; default_key: string | null }>();
  if (owner && owner.user_id !== user.id) throw new HTTPException(404, { message: "Rutina no encontrada" });

  if (!Array.isArray(body.exercises) || body.exercises.length > LIMITS.routineExercisesMax) throw badRequest("Lista de ejercicios no válida");
  const routine = {
    name: parseText(body.name, 60, "Nombre"),
    note: typeof body.note === "string" ? body.note.slice(0, 300) : "",
    cardioMinutes: parseInteger(body.cardioMinutes ?? 0, 0, LIMITS.cardioMinutesMax, "Cardio"),
    exercises: body.exercises.map(parseRoutineExercise),
  };
  const position = parseInteger(body.position ?? 0, 0, 10_000, "Posición");
  await c.env.DB.batch(insertRoutineStatements(c.env.DB, user.id, id, routine, position, owner?.default_key ?? null));
  return c.json({ ok: true });
});

routines.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM routines WHERE id = ? AND user_id = ?").bind(parseId(c.req.param("id")), c.get("user").id).run();
  return c.json({ ok: true });
});

// Ejercicios propios: los que no estén en el catálogo.
routines.get("/custom-exercises/all", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, name, muscle, equipment FROM custom_exercises WHERE user_id = ? ORDER BY name")
    .bind(c.get("user").id)
    .all<CustomExercise>();
  return c.json(results);
});

routines.put("/custom-exercises/:id", async (c) => {
  const body = await readJson(c.req);
  const id = parseId(c.req.param("id"));
  const write = await c.env.DB.prepare(
    `INSERT INTO custom_exercises (id, user_id, name, muscle, equipment, created_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, muscle = excluded.muscle, equipment = excluded.equipment
     WHERE custom_exercises.user_id = excluded.user_id`
  )
    .bind(id, c.get("user").id, parseText(body.name, 120, "Nombre"), parseMuscle(body.muscle), parseEquipment(body.equipment), Date.now())
    .run();
  if (!write.meta.changes) throw new HTTPException(404, { message: "Ejercicio no encontrado" });
  return c.json({ ok: true });
});
