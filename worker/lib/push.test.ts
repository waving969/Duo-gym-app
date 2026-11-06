import { describe, expect, it } from "vitest";
import { b64url, encryptPayload, fromB64url, isAllowedEndpoint, vapidHeader } from "./push";

// Vector de ejemplo de la especificación (RFC 8291, apéndice A).
const V = {
  plaintext: "When I grow up, I want to be a watermelon",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  expected:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

async function serverKeys(): Promise<CryptoKeyPair> {
  const pub = fromB64url(V.asPublic);
  const jwk = { kty: "EC", crv: "P-256", x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), ext: true };
  return {
    privateKey: await crypto.subtle.importKey("jwk", { ...jwk, d: V.asPrivate }, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]),
    publicKey: await crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []),
  } as CryptoKeyPair;
}

describe("cifrado de notificaciones", () => {
  it("cumple el ejemplo de la especificación", async () => {
    const out = await encryptPayload(V.plaintext, V.uaPublic, V.auth, { salt: fromB64url(V.salt), serverKeys: await serverKeys() });
    expect(b64url(out)).toBe(V.expected);
  });
});

describe("firma VAPID", () => {
  it("genera un JWT válido para el servicio de destino", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const pub = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer);
    const jwk = (await crypto.subtle.exportKey("jwk", pair.privateKey)) as JsonWebKey;
    const header = await vapidHeader("https://fcm.googleapis.com/fcm/send/abc", b64url(pub), jwk.d!, "https://example.dev");

    const match = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!;
    const claims = JSON.parse(atob(match[2]!.replace(/-/g, "+").replace(/_/g, "/")));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("https://example.dev");
    expect(claims.exp).toBeGreaterThan(Date.now() / 1000);
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      pair.publicKey,
      fromB64url(match[3]!),
      new TextEncoder().encode(`${match[1]}.${match[2]}`)
    );
    expect(ok).toBe(true);
  });
});

describe("destinos permitidos", () => {
  it("solo acepta servicios de push reales", () => {
    expect(isAllowedEndpoint("https://fcm.googleapis.com/fcm/send/x")).toBe(true);
    expect(isAllowedEndpoint("https://web.push.apple.com/x")).toBe(true);
    expect(isAllowedEndpoint("https://updates.push.services.mozilla.com/x")).toBe(true);
    expect(isAllowedEndpoint("https://malo.example/x")).toBe(false);
    expect(isAllowedEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedEndpoint("no-es-url")).toBe(false);
  });
});
