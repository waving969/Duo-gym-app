// Web Push sin librerías (RFC 8291 para el cifrado, RFC 8292 para la identificación VAPID).
import type { AppEnv } from "../env";

type Env = AppEnv["Bindings"];

const enc = new TextEncoder();

export function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = new Uint8Array(bytes);
  let s = "";
  for (const b of view) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64url(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

export interface EncryptOverrides {
  salt?: Uint8Array;
  serverKeys?: CryptoKeyPair;
}

/** Cifra el mensaje para un navegador concreto (aes128gcm). Solo ese dispositivo puede leerlo. */
export async function encryptPayload(plaintext: string, p256dh: string, auth: string, overrides: EncryptOverrides = {}): Promise<Uint8Array> {
  const clientPublic = fromB64url(p256dh);
  const authSecret = fromB64url(auth);
  const salt = overrides.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const server =
    overrides.serverKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const serverPublic = new Uint8Array((await crypto.subtle.exportKey("raw", server.publicKey)) as ArrayBuffer);
  const clientKey = await crypto.subtle.importKey("raw", clientPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: clientKey } as unknown as SubtleCryptoDeriveKeyAlgorithm, server.privateKey, 256)
  );

  const keyInfo = concat(enc.encode("WebPush: info\0"), clientPublic, serverPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const data = concat(enc.encode(plaintext), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, data));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = serverPublic.length;
  return concat(header, serverPublic, cipher);
}

/** Identifica nuestro servidor ante el servicio de notificaciones del móvil. */
export async function vapidHeader(endpoint: string, publicKey: string, privateKey: string, subject: string): Promise<string> {
  const pub = fromB64url(publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: b64url(pub.slice(1, 33)),
      y: b64url(pub.slice(33, 65)),
      d: privateKey,
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const head = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }))
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64url(signature)}, k=${publicKey}`;
}

// Solo se envía a los servicios de push reales de los navegadores.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /\.push\.apple\.com$/, /\.push\.services\.mozilla\.com$/, /\.notify\.windows\.com$/];

export function isAllowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(url.hostname));
  } catch {
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Envía a todos los dispositivos de un usuario y borra los que ya no existen. Devuelve los códigos de respuesta. */
export async function sendPush(env: Env, userId: string, payload: PushPayload, origin: string): Promise<number[]> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return [];
  const { results } = await env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .bind(userId)
    .all<{ endpoint: string; p256dh: string; auth: string }>();

  return Promise.all(
    results.map(async (sub) => {
      try {
        const body = await encryptPayload(JSON.stringify(payload), sub.p256dh, sub.auth);
        const res = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            Authorization: await vapidHeader(sub.endpoint, env.VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!, origin),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: "high",
            Topic: payload.tag.slice(0, 32),
          },
          body,
        });
        if (res.status === 404 || res.status === 410) {
          await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(sub.endpoint).run();
        } else if (!res.ok) {
          console.error("push", res.status, await res.text());
        }
        return res.status;
      } catch (error) {
        console.error("push", error);
        return 0;
      }
    })
  );
}
