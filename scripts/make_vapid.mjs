// Genera las claves de notificaciones (VAPID). Escribe la pública en wrangler.toml y la privada en .dev.vars;
// nunca muestra la privada por pantalla. Para subirla a producción:
//   node scripts/make_vapid.mjs --print-private | npx wrangler secret put VAPID_PRIVATE_KEY
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const VARS = ".dev.vars";

function readVars() {
  try {
    return Object.fromEntries(
      readFileSync(VARS, "utf8").split(/\r?\n/).filter(Boolean).map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      })
    );
  } catch {
    return {};
  }
}

const vars = readVars();
if (process.argv.includes("--print-private")) {
  process.stdout.write(vars.VAPID_PRIVATE_KEY ?? "");
  process.exit(0);
}
if (vars.VAPID_PRIVATE_KEY) {
  console.log("Las claves ya existen: no se generan otras para no romper las notificaciones activadas.");
  process.exit(0);
}

const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const pub = Buffer.from(await webcrypto.subtle.exportKey("raw", pair.publicKey)).toString("base64url");
const { d } = await webcrypto.subtle.exportKey("jwk", pair.privateKey);

writeFileSync(VARS, Object.entries({ ...vars, VAPID_PRIVATE_KEY: d }).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");

const toml = readFileSync("wrangler.toml", "utf8");
const line = `VAPID_PUBLIC_KEY = "${pub}"`;
writeFileSync("wrangler.toml", /VAPID_PUBLIC_KEY/.test(toml) ? toml.replace(/VAPID_PUBLIC_KEY = ".*"/, line) : `${toml.trimEnd()}\n\n[vars]\n${line}\n`);
console.log("Claves creadas. Pública en wrangler.toml, privada en .dev.vars.");
