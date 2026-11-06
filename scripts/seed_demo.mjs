// Crea dos cuentas ficticias con un mes de datos en la base LOCAL, para probar la app y hacer capturas.
//   npm run demo:seed   (con la app en marcha en http://localhost:5173 y la base local recién creada)
import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const BASE = "http://localhost:5173";

function invite() {
  const out = execSync("npm run -s invite", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return /invitacion\/(\S+)/.exec(out)[1];
}

function client() {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { origin: BASE, "content-type": "application/json", cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.json();
  };
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const alex = client();
const sam = client();
await alex("POST", `/api/invite/${invite()}`, { displayName: "Alex", username: "alex", password: "demo-local-123" });
await sam("POST", `/api/invite/${invite()}`, { displayName: "Sam", username: "sam", password: "demo-local-456" });
await alex("PATCH", "/api/me", { accent: "lima", goalKg: 72 });
await sam("PATCH", "/api/me", { accent: "coral", shareWeight: true });

const BASE_KG = { maquina: 30, polea: 25, mancuernas: 8, barra: 20, corporal: 0 };
const CARDIO = ["cinta", "bici", "eliptica"];

for (const [who, strength] of [
  [alex, 1],
  [sam, 0.7],
]) {
  const routines = await who("GET", "/api/routines");
  let index = 0;
  for (let ago = 30; ago >= 1; ago--) {
    const day = daysAgo(ago);
    if (![1, 3, 5].includes(day.getDay())) continue; // lunes, miércoles y viernes
    const routine = routines[index++ % routines.length];
    const progress = 4 - Math.floor(ago / 7);
    const entries = routine.exercises.map((e) => {
      const raise = e.equipment === "corporal" ? 0 : progress * 2.5;
      return { ...e, kg: Math.round((BASE_KG[e.equipment] * strength + raise) / 2.5) * 2.5, done: true };
    });
    await who("PUT", `/api/workouts/${randomUUID()}`, {
      date: iso(day),
      routineId: routine.id,
      routineName: routine.name,
      startedAt: day.getTime(),
      finishedAt: day.getTime() + 3_600_000,
      entries,
    });
    await who("PUT", `/api/cardio/${randomUUID()}`, { date: iso(day), kind: CARDIO[index % CARDIO.length], minutes: 10 });
  }
}

let kg = 76;
for (let k = 5; k >= 0; k--) {
  kg = Math.round((kg - 0.3) * 10) / 10;
  await alex("PUT", `/api/weights/${iso(daysAgo(k * 6))}`, { kg });
  await sam("PUT", `/api/weights/${iso(daysAgo(k * 6))}`, { kg: Math.round((kg - 12) * 10) / 10 });
}

const message = (who, kind, body) => who("POST", "/api/messages", { id: randomUUID(), kind, body });
await message(sam, "text", "¿Vamos hoy a las 7?");
await message(alex, "text", "Dale, voy a por la mochila");
await message(sam, "text", "Perfecto 💪");
await message(sam, "nudge", "💪 ¡Vamos al gym!");

console.log("Listo: usuarios alex y sam.");
