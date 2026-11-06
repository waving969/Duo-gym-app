import type { AppContext, UserRow } from "../env";
import { sendPush } from "./push";
import type { PushPayload } from "./push";

export async function getPartner(c: AppContext): Promise<UserRow | null> {
  return c.env.DB.prepare(
    "SELECT u.* FROM partners p JOIN users u ON u.id = p.partner_id WHERE p.user_id = ?"
  )
    .bind(c.get("user").id)
    .first<UserRow>();
}

/** Las invitaciones son de un solo uso: si queda una única cuenta sin pareja, es la tuya. */
export async function linkNewUser(db: D1Database, userId: string) {
  const { results } = await db
    .prepare("SELECT id FROM users WHERE id <> ? AND id NOT IN (SELECT user_id FROM partners)")
    .bind(userId)
    .all<{ id: string }>();
  if (results.length !== 1) return;
  const other = results[0]!.id;
  const now = Date.now();
  const insert = db.prepare("INSERT OR IGNORE INTO partners (user_id, partner_id, created_at) VALUES (?, ?, ?)");
  await db.batch([insert.bind(userId, other, now), insert.bind(other, userId, now)]);
}

/** Avisa en segundo plano: que falle una notificación nunca debe romper lo que estabas haciendo. */
export function notify(c: AppContext, userId: string, payload: PushPayload) {
  const origin = new URL(c.req.url).origin;
  c.executionCtx.waitUntil(sendPush(c.env, userId, payload, origin).catch((e) => console.error("push", e)));
}
