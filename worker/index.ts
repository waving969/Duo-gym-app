import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "./env";
import { auth } from "./routes/auth";
import { me } from "./routes/me";
import { partner } from "./routes/partner";
import { push } from "./routes/push";
import { routines } from "./routes/routines";
import { visits } from "./routes/visits";
import { weights } from "./routes/weights";
import { cardio, workouts } from "./routes/workouts";

const app = new Hono<AppEnv>().basePath("/api");

// Nada de la API se guarda en cachés, y ninguna otra web puede enviar peticiones en vuestro nombre.
app.use("*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    if (!origin || new URL(origin).host !== new URL(c.req.url).host) {
      throw new HTTPException(403, { message: "Origen no permitido" });
    }
  }
  await next();
  c.header("Cache-Control", "no-store");
});

// Cada funcionalidad nueva es un archivo en routes/ y una línea aquí.
app.route("/", auth);
app.route("/me", me);
app.route("/weights", weights);
app.route("/visits", visits);
app.route("/routines", routines);
app.route("/workouts", workouts);
app.route("/cardio", cardio);
app.route("/push", push);
app.route("/", partner);

app.notFound((c) => c.json({ error: "No encontrado" }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status);
  console.error(err);
  return c.json({ error: "Algo ha fallado. Inténtalo de nuevo." }, 500);
});

export default app;
