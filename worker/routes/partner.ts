import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { LIMITS } from "../../shared/types";
import type { Message, MessageKind, Partner, PartnerData, WeightEntry } from "../../shared/types";
import type { AppContext, AppEnv, UserRow } from "../env";
import { getPartner, notify } from "../lib/partner";
import { requireAuth } from "../lib/session";
import { loadCardio, loadVisits, loadWorkouts } from "../lib/training";
import { parseId, parseText, readJson } from "../lib/validate";

export const partner = new Hono<AppEnv>();
partner.use("*", requireAuth);

const toPartner = (row: UserRow): Partner => ({
  id: row.id,
  displayName: row.display_name,
  accent: row.accent as Partner["accent"],
  weeklyGoal: row.weekly_goal,
});

async function requirePartner(c: AppContext): Promise<UserRow> {
  const other = await getPartner(c);
  if (!other) throw new HTTPException(404, { message: "Todavía no hay otra cuenta vinculada" });
  return other;
}

// Lo que ve tu pareja de ti: solo lo que tienes activado en Privacidad. Se comprueba aquí, en el servidor.
partner.get("/partner", async (c) => {
  const other = await getPartner(c);
  if (!other) return c.json<PartnerData | null>(null);
  const db = c.env.DB;
  const [visits, workouts, cardio, weights] = await Promise.all([
    other.share_calendar ? loadVisits(db, other.id) : null,
    other.share_workouts ? loadWorkouts(db, other.id) : null,
    other.share_workouts ? loadCardio(db, other.id) : null,
    other.share_weight
      ? db
          .prepare("SELECT date, grams FROM weights WHERE user_id = ? ORDER BY date")
          .bind(other.id)
          .all<{ date: string; grams: number }>()
          .then((r): WeightEntry[] => r.results.map((w) => ({ date: w.date, kg: w.grams / 1000 })))
      : null,
  ]);
  return c.json<PartnerData>({ partner: toPartner(other), visits, workouts, cardio, weights });
});

partner.get("/messages", async (c) => {
  const me = c.get("user").id;
  const other = await requirePartner(c);
  const before = Number(c.req.query("before")) || Number.MAX_SAFE_INTEGER;
  const { results } = await c.env.DB.prepare(
    `SELECT id, sender_id, kind, body, created_at, read_at FROM messages
     WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)) AND created_at < ?
     ORDER BY created_at DESC LIMIT 100`
  )
    .bind(me, other.id, other.id, me, before)
    .all<{ id: string; sender_id: string; kind: string; body: string; created_at: number; read_at: number | null }>();

  return c.json<Message[]>(
    results.reverse().map((m) => ({
      id: m.id,
      fromMe: m.sender_id === me,
      kind: m.kind as MessageKind,
      body: m.body,
      createdAt: m.created_at,
      readAt: m.read_at,
    }))
  );
});

partner.get("/messages/unread", async (c) => {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE recipient_id = ? AND read_at IS NULL")
    .bind(c.get("user").id)
    .first<{ n: number }>();
  return c.json({ count: row?.n ?? 0 });
});

partner.post("/messages/read", async (c) => {
  await c.env.DB.prepare("UPDATE messages SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL")
    .bind(Date.now(), c.get("user").id)
    .run();
  return c.json({ ok: true });
});

partner.post("/messages", async (c) => {
  const user = c.get("user");
  const other = await requirePartner(c);
  const data = await readJson(c.req);
  const id = parseId(data.id);
  const kind = data.kind === "nudge" ? "nudge" : "text";
  const body = parseText(data.body, LIMITS.messageMax, "Mensaje");
  const now = Date.now();

  const recent = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE sender_id = ? AND kind = ? AND created_at > ?")
    .bind(user.id, kind, now - 60_000)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= (kind === "nudge" ? 5 : 40)) {
    throw new HTTPException(429, { message: kind === "nudge" ? "Demasiados toques. Dale un respiro 😅" : "Demasiados mensajes seguidos" });
  }

  // El id lo pone el móvil: reenviar el mismo mensaje tras un corte no lo duplica.
  const insert = await c.env.DB.prepare(
    "INSERT OR IGNORE INTO messages (id, sender_id, recipient_id, kind, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(id, user.id, other.id, kind, body, now)
    .run();

  if (insert.meta.changes) {
    notify(c, other.id, {
      title: kind === "nudge" ? `👉 ${user.display_name} te da un toque` : user.display_name,
      body,
      url: "/duo",
      tag: kind === "nudge" ? "toque" : "mensaje",
    });
  }
  return c.json({ ok: true });
});
