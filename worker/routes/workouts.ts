import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { CARDIO_KINDS, LIMITS } from "../../shared/types";
import type { AppEnv } from "../env";
import { getPartner, notify } from "../lib/partner";
import { requireAuth } from "../lib/session";
import { loadCardio, loadWorkouts, markVisit } from "../lib/training";
import { badRequest, parseDate, parseId, parseInteger, parseRoutineExercise, parseText, readJson } from "../lib/validate";

export const workouts = new Hono<AppEnv>();
workouts.use("*", requireAuth);

function parseLift(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > LIMITS.liftKgMax) throw badRequest("Peso no válido");
  return Math.round(value * 1000);
}

workouts.get("/", async (c) => c.json(await loadWorkouts(c.env.DB, c.get("user").id)));

// El móvil envía el entreno completo cada vez: repetir el envío tras un corte da el mismo resultado.
workouts.put("/:id", async (c) => {
  const user = c.get("user");
  const db = c.env.DB;
  const id = parseId(c.req.param("id"));
  const body = await readJson(c.req);
  const date = parseDate(body.date);
  const routineName = parseText(body.routineName, 60, "Nombre");
  const startedAt = parseInteger(body.startedAt, 0, Number.MAX_SAFE_INTEGER, "Inicio");
  const finishedAt = body.finishedAt === null || body.finishedAt === undefined ? null : parseInteger(body.finishedAt, 0, Number.MAX_SAFE_INTEGER, "Fin");
  const routineId = body.routineId === null || body.routineId === undefined ? null : parseId(body.routineId);
  if (!Array.isArray(body.entries) || body.entries.length > LIMITS.routineExercisesMax) throw badRequest("Lista de ejercicios no válida");
  const entries = body.entries.map((raw) => {
    const e = raw as Record<string, unknown>;
    return { ...parseRoutineExercise(e), grams: parseLift(e.kg), done: e.done === true };
  });

  const existing = await db.prepare("SELECT user_id, finished_at FROM workouts WHERE id = ?").bind(id).first<{ user_id: string; finished_at: number | null }>();
  if (existing && existing.user_id !== user.id) throw new HTTPException(404, { message: "Entreno no encontrado" });

  const statements = [
    db
      .prepare(
        `INSERT INTO workouts (id, user_id, date, routine_id, routine_name, started_at, finished_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET date = excluded.date, routine_id = excluded.routine_id, routine_name = excluded.routine_name,
           started_at = excluded.started_at, finished_at = excluded.finished_at, updated_at = excluded.updated_at`
      )
      .bind(id, user.id, date, routineId, routineName, startedAt, finishedAt, Date.now()),
    db.prepare("DELETE FROM workout_entries WHERE workout_id = ?").bind(id),
    ...entries.map((e, i) =>
      db
        .prepare(
          "INSERT INTO workout_entries (workout_id, position, exercise_id, name, muscle, equipment, grams, sets, reps, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(id, i, e.exerciseId, e.name, e.muscle, e.equipment, e.grams, e.sets, e.reps, e.done ? 1 : 0)
    ),
  ];
  // Hacer un ejercicio ya marca el día en el calendario.
  const doneCount = entries.filter((e) => e.done).length;
  if (doneCount > 0) statements.push(markVisit(db, user.id, date));

  const justFinished = finishedAt !== null && !existing?.finished_at && doneCount > 0;
  const other = justFinished && user.share_workouts ? await getPartner(c) : null;
  if (other) {
    const text = `${user.display_name} ha terminado ${routineName}: ${doneCount} ${doneCount === 1 ? "ejercicio" : "ejercicios"} 💪`;
    statements.push(
      db
        .prepare("INSERT OR IGNORE INTO messages (id, sender_id, recipient_id, kind, body, created_at) VALUES (?, ?, ?, 'event', ?, ?)")
        .bind(`evt-${id}`.slice(0, 64), user.id, other.id, text, Date.now())
    );
  }
  await db.batch(statements);
  if (other) notify(c, other.id, { title: "Entreno terminado", body: `${user.display_name} ha terminado ${routineName} 💪`, url: "/duo", tag: "entreno" });
  return c.json({ ok: true });
});

workouts.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM workouts WHERE id = ? AND user_id = ?").bind(parseId(c.req.param("id")), c.get("user").id).run();
  return c.json({ ok: true });
});

export const cardio = new Hono<AppEnv>();
cardio.use("*", requireAuth);

cardio.get("/", async (c) => c.json(await loadCardio(c.env.DB, c.get("user").id)));

cardio.put("/:id", async (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  const body = await readJson(c.req);
  const date = parseDate(body.date);
  if (typeof body.kind !== "string" || !(body.kind in CARDIO_KINDS)) throw badRequest("Tipo de cardio no válido");
  const minutes = parseInteger(body.minutes, 1, LIMITS.cardioMinutesMax, "Minutos");
  const [write] = await c.env.DB.batch([
    c.env.DB
      .prepare(
        `INSERT INTO cardio (id, user_id, date, kind, minutes, created_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET date = excluded.date, kind = excluded.kind, minutes = excluded.minutes
         WHERE cardio.user_id = excluded.user_id`
      )
      .bind(id, user.id, date, body.kind, minutes, Date.now()),
    markVisit(c.env.DB, user.id, date),
  ]);
  if (!write!.meta.changes) throw new HTTPException(404, { message: "Registro no encontrado" });
  return c.json({ ok: true });
});

cardio.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM cardio WHERE id = ? AND user_id = ?").bind(parseId(c.req.param("id")), c.get("user").id).run();
  return c.json({ ok: true });
});
