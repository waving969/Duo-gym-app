import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppContext, AppEnv, UserRow } from "../env";
import { hashPassword, sha256Hex, verifyPassword } from "../lib/crypto";
import { linkNewUser } from "../lib/partner";
import { endSession, requireAuth, startSession } from "../lib/session";
import { badRequest, parsePassword, readJson, toPublicUser } from "../lib/validate";

const WINDOW_MS = 15 * 60_000;
const MAX_FAILS_ACCOUNT = 8;
const MAX_FAILS_IP = 40;

// Se compara contra esto cuando el usuario no existe, para que tarde lo mismo y no delate qué usuarios hay.
const DUMMY = { hash: "0".repeat(64), salt: "00".repeat(16), iters: 100_000 };

const ipOf = (c: AppContext) => c.req.header("cf-connecting-ip") ?? "local";

async function failCount(c: AppContext, key: string) {
  const row = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?")
    .bind(key, Date.now() - WINDOW_MS)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export const auth = new Hono<AppEnv>();

auth.post("/auth/login", async (c) => {
  const { username, password } = await readJson(c.req);
  if (typeof username !== "string" || typeof password !== "string") throw badRequest("Faltan datos");

  const ip = ipOf(c);
  const accountKey = `${ip}|${username.trim().toLowerCase()}`;
  const [accountFails, ipFails] = await Promise.all([failCount(c, accountKey), failCount(c, ip)]);
  if (accountFails >= MAX_FAILS_ACCOUNT || ipFails >= MAX_FAILS_IP) {
    throw new HTTPException(429, { message: "Demasiados intentos. Prueba de nuevo en unos minutos." });
  }

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username.trim()).first<UserRow>();
  const secret = user ? { hash: user.password_hash, salt: user.password_salt, iters: user.password_iters } : DUMMY;
  const ok = await verifyPassword(password, secret.hash, secret.salt, secret.iters);

  if (!user || !ok) {
    const now = Date.now();
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO login_attempts (key, at) VALUES (?, ?), (?, ?)").bind(accountKey, now, ip, now),
      c.env.DB.prepare("DELETE FROM login_attempts WHERE at < ?").bind(now - 86_400_000),
    ]);
    throw new HTTPException(401, { message: "Usuario o contraseña incorrectos" });
  }

  await c.env.DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(accountKey).run();
  await startSession(c, user.id);
  return c.json(toPublicUser(user));
});

auth.get("/invite/:token", async (c) => {
  const invite = await c.env.DB.prepare("SELECT 1 AS ok FROM invites WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
    .bind(await sha256Hex(c.req.param("token")), Date.now())
    .first();
  if (!invite) throw new HTTPException(404, { message: "Esta invitación no es válida o ya se ha usado" });
  return c.json({ ok: true });
});

auth.post("/invite/:token", async (c) => {
  const body = await readJson(c.req);
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!/^[\p{L}\p{N}._-]{2,30}$/u.test(username)) {
    throw badRequest("El usuario debe tener entre 2 y 30 caracteres, sin espacios");
  }
  if (displayName.length < 1 || displayName.length > 40) throw badRequest("Escribe tu nombre");
  const password = parsePassword(body.password);

  const now = Date.now();
  const tokenHash = await sha256Hex(c.req.param("token"));
  // Se marca como usada en una sola operación: dos envíos a la vez no pueden crear dos cuentas.
  const claim = await c.env.DB.prepare(
    "UPDATE invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?"
  )
    .bind(now, tokenHash, now)
    .run();
  if (!claim.meta.changes) throw new HTTPException(404, { message: "Esta invitación no es válida o ya se ha usado" });

  const pw = await hashPassword(password);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO users (id, username, display_name, password_hash, password_salt, password_iters, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, username, displayName, pw.hash, pw.salt, pw.iters, now)
      .run();
  } catch {
    // Usuario repetido: la invitación sigue sirviendo para intentarlo con otro nombre.
    await c.env.DB.prepare("UPDATE invites SET used_at = NULL WHERE token_hash = ?").bind(tokenHash).run();
    throw new HTTPException(409, { message: "Ese usuario ya existe" });
  }

  await linkNewUser(c.env.DB, id);
  await startSession(c, id);
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  return c.json(toPublicUser(user!));
});

auth.post("/auth/logout", requireAuth, async (c) => {
  await endSession(c);
  return c.json({ ok: true });
});

auth.post("/auth/logout-others", requireAuth, async (c) => {
  await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?")
    .bind(c.get("user").id, c.get("tokenHash"))
    .run();
  return c.json({ ok: true });
});

auth.post("/auth/password", requireAuth, async (c) => {
  const body = await readJson(c.req);
  const user = c.get("user");
  const ok =
    typeof body.current === "string" &&
    (await verifyPassword(body.current, user.password_hash, user.password_salt, user.password_iters));
  if (!ok) throw new HTTPException(403, { message: "La contraseña actual no es correcta" });

  const pw = await hashPassword(parsePassword(body.next));
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ?, password_iters = ? WHERE id = ?").bind(
      pw.hash,
      pw.salt,
      pw.iters,
      user.id
    ),
    // Al cambiarla se cierra la sesión en los demás dispositivos.
    c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(user.id, c.get("tokenHash")),
  ]);
  return c.json({ ok: true });
});
