import { Hono } from "hono";
import type { AppEnv } from "../env";
import { requireAuth } from "../lib/session";
import { parseDate } from "../lib/validate";

export const visits = new Hono<AppEnv>();
visits.use("*", requireAuth);

visits.get("/", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT date FROM gym_visits WHERE user_id = ? ORDER BY date")
    .bind(c.get("user").id)
    .all<{ date: string }>();
  return c.json(results.map((r) => r.date));
});

visits.put("/:date", async (c) => {
  await c.env.DB.prepare("INSERT OR IGNORE INTO gym_visits (user_id, date, created_at) VALUES (?, ?, ?)")
    .bind(c.get("user").id, parseDate(c.req.param("date")), Date.now())
    .run();
  return c.json({ ok: true });
});

visits.delete("/:date", async (c) => {
  await c.env.DB.prepare("DELETE FROM gym_visits WHERE user_id = ? AND date = ?")
    .bind(c.get("user").id, parseDate(c.req.param("date")))
    .run();
  return c.json({ ok: true });
});
