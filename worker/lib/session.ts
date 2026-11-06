import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createMiddleware } from "hono/factory";
import type { AppContext, AppEnv, UserRow } from "../env";
import { randomToken, sha256Hex } from "./crypto";

// 400 días es el máximo que aceptan los navegadores. La sesión se renueva sola al usar la app,
// así que en la práctica no caduca nunca mientras la uséis.
const SESSION_SECONDS = 400 * 86_400;
const RENEW_AFTER_MS = 86_400_000;

const isHttps = (c: AppContext) => new URL(c.req.url).protocol === "https:";
const cookieName = (c: AppContext) => (isHttps(c) ? "__Host-sid" : "sid");

function writeCookie(c: AppContext, token: string) {
  setCookie(c, cookieName(c), token, {
    path: "/",
    httpOnly: true,
    secure: isHttps(c),
    sameSite: "Lax",
    maxAge: SESSION_SECONDS,
  });
}

export async function startSession(c: AppContext, userId: string) {
  const token = randomToken();
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(await sha256Hex(token), userId, now, now, now + SESSION_SECONDS * 1000)
    .run();
  writeCookie(c, token);
}

export async function endSession(c: AppContext) {
  await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(c.get("tokenHash")).run();
  deleteCookie(c, cookieName(c), { path: "/", secure: isHttps(c) });
}

/** Exige sesión válida. Todo lo que hay detrás solo ve los datos de `c.get("user")`. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, cookieName(c));
  if (!token) throw new HTTPException(401, { message: "Sesión no iniciada" });

  const tokenHash = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT u.*, s.last_seen_at, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
  )
    .bind(tokenHash)
    .first<UserRow & { last_seen_at: number; expires_at: number }>();

  const now = Date.now();
  if (!row || row.expires_at < now) throw new HTTPException(401, { message: "Sesión no iniciada" });

  if (now - row.last_seen_at > RENEW_AFTER_MS) {
    await c.env.DB.prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?")
      .bind(now, now + SESSION_SECONDS * 1000, tokenHash)
      .run();
    writeCookie(c, token);
  }

  c.set("user", row);
  c.set("tokenHash", tokenHash);
  await next();
});
