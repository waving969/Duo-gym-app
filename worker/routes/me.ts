import { Hono } from "hono";
import { ACCENTS, LIMITS } from "../../shared/types";
import type { AppEnv, UserRow } from "../env";
import { requireAuth } from "../lib/session";
import { loadCardio, loadWorkouts } from "../lib/training";
import { badRequest, parseKg, readJson, toPublicUser } from "../lib/validate";

export const me = new Hono<AppEnv>();
me.use("*", requireAuth);

me.get("/", (c) => c.json(toPublicUser(c.get("user"))));

me.patch("/", async (c) => {
  const body = await readJson(c.req);
  const user = c.get("user");
  const next = { ...user };

  if (body.displayName !== undefined) {
    const name = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (name.length < 1 || name.length > 40) throw badRequest("Escribe tu nombre");
    next.display_name = name;
  }
  if (body.accent !== undefined) {
    if (!ACCENTS.includes(body.accent as (typeof ACCENTS)[number])) throw badRequest("Color no válido");
    next.accent = body.accent as string;
  }
  if (body.heightCm !== undefined) {
    const h = body.heightCm;
    if (h !== null && (!Number.isInteger(h) || (h as number) < LIMITS.heightMin || (h as number) > LIMITS.heightMax)) {
      throw badRequest(`La altura debe estar entre ${LIMITS.heightMin} y ${LIMITS.heightMax} cm`);
    }
    next.height_cm = h as number | null;
  }
  if (body.goalKg !== undefined) {
    next.goal_grams = body.goalKg === null ? null : Math.round(parseKg(body.goalKg) * 1000);
  }
  if (body.weeklyGoal !== undefined) {
    const g = body.weeklyGoal;
    if (!Number.isInteger(g) || (g as number) < LIMITS.weeklyGoalMin || (g as number) > LIMITS.weeklyGoalMax) {
      throw badRequest(`El objetivo debe estar entre ${LIMITS.weeklyGoalMin} y ${LIMITS.weeklyGoalMax} días`);
    }
    next.weekly_goal = g as number;
  }

  if (typeof body.shareCalendar === "boolean") next.share_calendar = body.shareCalendar ? 1 : 0;
  if (typeof body.shareWorkouts === "boolean") next.share_workouts = body.shareWorkouts ? 1 : 0;
  if (typeof body.shareWeight === "boolean") next.share_weight = body.shareWeight ? 1 : 0;

  await c.env.DB.prepare(
    `UPDATE users SET display_name = ?, accent = ?, height_cm = ?, goal_grams = ?, weekly_goal = ?,
       share_calendar = ?, share_workouts = ?, share_weight = ? WHERE id = ?`
  )
    .bind(
      next.display_name,
      next.accent,
      next.height_cm,
      next.goal_grams,
      next.weekly_goal,
      next.share_calendar,
      next.share_workouts,
      next.share_weight,
      user.id
    )
    .run();
  return c.json(toPublicUser(next as UserRow));
});

// Copia de seguridad: todo lo que la app guarda de ti, sin credenciales.
me.get("/export", async (c) => {
  const user = c.get("user");
  const [weights, visits] = await c.env.DB.batch([
    c.env.DB.prepare("SELECT date, grams FROM weights WHERE user_id = ? ORDER BY date").bind(user.id),
    c.env.DB.prepare("SELECT date FROM gym_visits WHERE user_id = ? ORDER BY date").bind(user.id),
  ]);
  return c.json({
    exportedAt: new Date().toISOString(),
    profile: toPublicUser(user),
    weights: (weights!.results as { date: string; grams: number }[]).map((w) => ({ date: w.date, kg: w.grams / 1000 })),
    gymVisits: (visits!.results as { date: string }[]).map((v) => v.date),
    workouts: await loadWorkouts(c.env.DB, user.id),
    cardio: await loadCardio(c.env.DB, user.id),
  });
});
