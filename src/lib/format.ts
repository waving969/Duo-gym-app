import { parseISODate } from "../../shared/stats";

const kgFormat = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatKg = (kg: number) => kgFormat.format(kg);

export const formatDelta = (kg: number) => `${kg > 0 ? "+" : kg < 0 ? "−" : ""}${kgFormat.format(Math.abs(kg))}`;

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", options);
const longDate = fmt({ weekday: "long", day: "numeric", month: "long" });
const shortDate = fmt({ day: "numeric", month: "short" });
const shortDateYear = fmt({ day: "numeric", month: "short", year: "numeric" });
const monthTitle = fmt({ month: "long", year: "numeric" });

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatLongDate = (iso: string) => capitalize(longDate.format(parseISODate(iso)));
export const formatShortDate = (iso: string) => shortDate.format(parseISODate(iso)).replace(".", "");
export const formatShortDateYear = (iso: string) => shortDateYear.format(parseISODate(iso)).replace(".", "");
export const formatMonth = (year: number, monthIndex: number) => capitalize(monthTitle.format(new Date(year, monthIndex, 1)));

export const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
