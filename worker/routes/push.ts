import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../env";
import { isAllowedEndpoint, sendPush } from "../lib/push";
import { requireAuth } from "../lib/session";
import { badRequest, parseText, readJson } from "../lib/validate";

export const push = new Hono<AppEnv>();
push.use("*", requireAuth);

push.get("/key", (c) => c.json({ publicKey: c.env.VAPID_PUBLIC_KEY ?? null }));

push.post("/subscribe", async (c) => {
  const body = await readJson(c.req);
  const endpoint = parseText(body.endpoint, 1000, "Dispositivo");
  if (!isAllowedEndpoint(endpoint)) throw badRequest("Servicio de notificaciones no reconocido");
  const keys = (body.keys ?? {}) as Record<string, unknown>;
  // Si el móvil cambia de cuenta, las notificaciones pasan a la cuenta nueva.
  await c.env.DB.prepare(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
  )
    .bind(endpoint, c.get("user").id, parseText(keys.p256dh, 200, "Clave"), parseText(keys.auth, 100, "Clave"), Date.now())
    .run();
  return c.json({ ok: true });
});

push.post("/unsubscribe", async (c) => {
  const body = await readJson(c.req);
  await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?")
    .bind(parseText(body.endpoint, 1000, "Dispositivo"), c.get("user").id)
    .run();
  return c.json({ ok: true });
});

// Notificación de prueba a tus propios dispositivos: sirve para saber si funcionan.
push.post("/test", async (c) => {
  const statuses = await sendPush(
    c.env,
    c.get("user").id,
    { title: "Dúo", body: "¡Las notificaciones funcionan! 💪", url: "/perfil", tag: "prueba" },
    new URL(c.req.url).origin
  );
  if (statuses.length === 0) throw new HTTPException(400, { message: "Este usuario no tiene ningún dispositivo activado" });
  const ok = statuses.filter((s) => s >= 200 && s < 300).length;
  if (ok === 0) throw new HTTPException(502, { message: `El servicio de notificaciones respondió ${statuses.join(", ")}` });
  return c.json({ sent: ok, total: statuses.length });
});
