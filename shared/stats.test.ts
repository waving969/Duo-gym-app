import { describe, expect, it } from "vitest";
import { addDays, daysBetween, startOfWeek, visitsInMonth, visitsInWeek, weekDays, weekStreak, weightChange } from "./stats";

describe("fechas", () => {
  it("la semana empieza en lunes, también si hoy es domingo", () => {
    expect(startOfWeek("2026-11-06")).toBe("2026-11-02"); // viernes
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02"); // domingo
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02"); // lunes
    expect(weekDays("2026-11-06")).toHaveLength(7);
  });

  it("cruza meses, años y cambios de hora", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30"); // cambio de hora en España
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2); // cambio de hora en España
  });
});

describe("visitas", () => {
  const visits = new Set(["2026-11-02", "2026-11-04", "2026-10-30"]);

  it("cuenta por mes y por semana", () => {
    expect(visitsInMonth(visits, 2026, 10)).toBe(2);
    expect(visitsInMonth(visits, 2026, 9)).toBe(1);
    expect(visitsInWeek(visits, "2026-11-06")).toBe(2);
  });
});

describe("racha semanal", () => {
  const today = "2026-11-06"; // viernes, semana del 2 de noviembre

  it("la semana en curso sin cumplir no rompe la racha", () => {
    const v = new Set(["2026-10-26", "2026-10-28", "2026-10-19", "2026-10-21"]);
    expect(weekStreak(v, 2, today)).toBe(2);
  });

  it("la semana en curso suma si ya se ha cumplido", () => {
    const v = new Set(["2026-11-02", "2026-11-03", "2026-10-26", "2026-10-28"]);
    expect(weekStreak(v, 2, today)).toBe(2);
  });

  it("una semana completa sin cumplir la corta", () => {
    const v = new Set(["2026-10-19", "2026-10-21"]);
    expect(weekStreak(v, 2, today)).toBe(0);
  });

  it("sin visitas es 0", () => {
    expect(weekStreak(new Set(), 3, today)).toBe(0);
  });
});

describe("cambio de peso", () => {
  it("necesita al menos dos registros", () => {
    expect(weightChange([], 30)).toBeNull();
    expect(weightChange([{ date: "2026-11-01", kg: 70 }], 30)).toBeNull();
  });

  it("compara con el registro más cercano a la fecha objetivo", () => {
    const e = [
      { date: "2026-09-01", kg: 75 },
      { date: "2026-10-05", kg: 73.2 },
      { date: "2026-11-05", kg: 72.1 },
    ];
    expect(weightChange(e, 30)).toBe(-1.1);
    expect(weightChange(e, 65)).toBe(-2.9);
  });
});
