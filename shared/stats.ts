// Fechas y estadísticas puras. Las fechas son siempre cadenas AAAA-MM-DD del día local del usuario.
import type { WeightEntry } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(s: string, days: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Lunes de la semana de esa fecha. */
export function startOfWeek(s: string): string {
  const day = parseISODate(s).getDay(); // 0 = domingo
  return addDays(s, day === 0 ? -6 : 1 - day);
}

export function weekDays(s: string): string[] {
  const monday = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysBetween(from: string, to: string): number {
  // Se usa UTC para que un cambio de hora no descuadre la cuenta.
  const utc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function visitsInMonth(visits: Iterable<string>, year: number, monthIndex: number): number {
  const prefix = `${year}-${pad(monthIndex + 1)}-`;
  let n = 0;
  for (const v of visits) if (v.startsWith(prefix)) n++;
  return n;
}

export function visitsInWeek(visits: ReadonlySet<string>, today: string): number {
  return weekDays(today).filter((d) => visits.has(d)).length;
}

/**
 * Semanas seguidas cumpliendo el objetivo semanal. La semana en curso suma si ya
 * se ha cumplido, pero no rompe la racha mientras no haya terminado.
 */
export function weekStreak(visits: ReadonlySet<string>, weeklyGoal: number, today: string): number {
  let streak = visitsInWeek(visits, today) >= weeklyGoal ? 1 : 0;
  let cursor = addDays(startOfWeek(today), -7);
  while (visitsInWeek(visits, cursor) >= weeklyGoal) {
    streak++;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

/**
 * Cambio de peso entre el último registro y el más cercano a `days` días antes.
 * Devuelve null si no hay un registro anterior con el que comparar.
 */
export function weightChange(entries: readonly WeightEntry[], days: number): number | null {
  const last = entries[entries.length - 1];
  if (!last || entries.length < 2) return null;
  const target = addDays(last.date, -days);
  const earlier = entries.slice(0, -1);
  let base = earlier[0]!;
  for (const e of earlier) {
    if (Math.abs(daysBetween(target, e.date)) < Math.abs(daysBetween(target, base.date))) base = e;
  }
  return Math.round((last.kg - base.kg) * 10) / 10;
}
