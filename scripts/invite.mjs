// Crea una invitación de un solo uso y muestra el enlace.
//   npm run invite                        -> en local (http://localhost:5173)
//   npm run invite -- https://tu-web.dev  -> en producción
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const baseUrl = process.argv[2];
const remote = Boolean(baseUrl);
const token = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token).digest("hex");
const now = Date.now();
const expires = now + 7 * 86_400_000;

const sql = `INSERT INTO invites (token_hash, created_at, expires_at) VALUES ('${hash}', ${now}, ${expires})`;
const args = ["wrangler", "d1", "execute", "duo-gym", remote ? "--remote" : "--local", "--command", `"${sql}"`];
execFileSync("npx", args, { stdio: "ignore", shell: true });

console.log(`\nInvitación creada (válida 7 días, un solo uso):\n${baseUrl ?? "http://localhost:5173"}/invitacion/${token}\n`);
