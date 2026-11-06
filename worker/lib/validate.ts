import { HTTPException } from "hono/http-exception";
import { EQUIPMENT, LIMITS, MUSCLES } from "../../shared/types";
import type { Equipment, Muscle, RoutineExercise, User } from "../../shared/types";
import type { UserRow } from "../env";

export const badRequest = (message: string) => new HTTPException(400, { message });

export async function readJson(req: { json(): Promise<unknown> }): Promise<Record<string, unknown>> {
  const data = await req.json().catch(() => null);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw badRequest("Petición no válida");
  return data as Record<string, unknown>;
}

/** Fecha real AAAA-MM-DD, no futura (con margen por las zonas horarias). */
export function parseDate(value: unknown): string {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) throw badRequest("Fecha no válida");
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw badRequest("Fecha no válida");
  if (y < 2000 || date.getTime() > Date.now() + 86_400_000) throw badRequest("La fecha no puede ser futura");
  return value as string;
}

export function parseKg(value: unknown): number {
  const kg = typeof value === "number" ? value : NaN;
  if (!Number.isFinite(kg) || kg < LIMITS.kgMin || kg > LIMITS.kgMax) {
    throw badRequest(`El peso debe estar entre ${LIMITS.kgMin} y ${LIMITS.kgMax} kg`);
  }
  return Math.round(kg * 10) / 10;
}

export function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < LIMITS.passwordMin) {
    throw badRequest(`La contraseña debe tener al menos ${LIMITS.passwordMin} caracteres`);
  }
  if (value.length > LIMITS.passwordMax) throw badRequest("La contraseña es demasiado larga");
  return value;
}

export function parseId(value: unknown): string {
  if (typeof value !== "string" || !/^[\w-]{8,64}$/.test(value)) throw badRequest("Identificador no válido");
  return value;
}

export function parseText(value: unknown, max: number, field: string, min = 1): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < min || text.length > max) throw badRequest(`${field} no válido`);
  return text;
}

export function parseInteger(value: unknown, min: number, max: number, field: string): number {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) throw badRequest(`${field} no válido`);
  return value as number;
}

export function parseMuscle(value: unknown): Muscle {
  if (typeof value !== "string" || !(value in MUSCLES)) throw badRequest("Músculo no válido");
  return value as Muscle;
}

export function parseEquipment(value: unknown): Equipment {
  if (typeof value !== "string" || !(value in EQUIPMENT)) throw badRequest("Material no válido");
  return value as Equipment;
}

export function parseRoutineExercise(raw: unknown): RoutineExercise {
  const e = (raw ?? {}) as Record<string, unknown>;
  return {
    exerciseId: parseText(e.exerciseId, 100, "Ejercicio"),
    name: parseText(e.name, 120, "Nombre del ejercicio"),
    muscle: parseMuscle(e.muscle),
    equipment: parseEquipment(e.equipment),
    sets: parseInteger(e.sets, 1, LIMITS.setsMax, "Series"),
    reps: parseInteger(e.reps, 1, LIMITS.repsMax, "Repeticiones"),
  };
}

export function toPublicUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    accent: row.accent as User["accent"],
    heightCm: row.height_cm,
    goalKg: row.goal_grams === null ? null : row.goal_grams / 1000,
    weeklyGoal: row.weekly_goal,
    shareCalendar: !!row.share_calendar,
    shareWorkouts: !!row.share_workouts,
    shareWeight: !!row.share_weight,
  };
}
