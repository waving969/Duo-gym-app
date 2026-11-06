import { Hono } from "hono";
import type { WeightEntry } from "../../shared/types";
import type { AppEnv } from "../env";
import { requireAuth } from "../lib/session";
import { parseDate, parseKg, readJson } from "../lib/validate";

export const weights = new Hono<AppEnv>();
weights.use("*", requireAuth);

weights.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT date, grams FROM weights WHERE user_id = ? ORDER BY date")
    .bind(c.get("user").id)
    .all<{ date: string; grams: number }>();
  return c.json<WeightEntry[]>(results.map((r) => ({ date: r.date, kg: r.grams / 1000 })));
});

weights.put("/:date", async (c) => {
  const date = parseDate(c.req.param("date"));
  const kg = parseKg((await readJson(c.req)).kg);
  await c.env.DB.prepare(
    `INSERT INTO weights (user_id, date, grams, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, date) DO UPDATE SET grams = excluded.grams, updated_at = excluded.updated_at`
  )
    .bind(c.get("user").id, date, Math.round(kg * 1000), Date.now())
    .run();
  return c.json<WeightEntry>({ date, kg });
});

weights.delete("/:date", async (c) => {
  await c.env.DB.prepare("DELETE FROM weights WHERE user_id = ? AND date = ?")
    .bind(c.get("user").id, parseDate(c.req.param("date")))
    .run();
  return c.json({ ok: true });
});
