import { motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { daysBetween } from "../../../shared/stats";
import type { WeightEntry } from "../../../shared/types";
import { formatKg, formatShortDate, formatShortDateYear } from "../../lib/format";

const HEIGHT = 220;
const M = { top: 14, right: 12, bottom: 26, left: 40 };

/** Eje con valores redondos: de 0,5 en 0,5 kg, de 1 en 1, de 2 en 2… */
function niceTicks(min: number, max: number, count = 4) {
  const span = Math.max(max - min, 1);
  const raw = span / (count - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { ticks, lo, hi };
}

interface Props {
  entries: WeightEntry[]; // ordenados por fecha, al menos 2
  goalKg: number | null;
  label?: string;
}

export function WeightChart({ entries, goalKg, label = "Evolución del peso" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const spanDays = Math.max(daysBetween(first.date, last.date), 1);
  const innerW = Math.max(width - M.left - M.right, 1);
  const innerH = HEIGHT - M.top - M.bottom;

  const { ticks, lo, hi } = useMemo(() => {
    const values = entries.map((e) => e.kg);
    // El objetivo solo amplía el eje si está cerca; si está lejos aplastaría la línea.
    const min = Math.min(...values);
    const max = Math.max(...values);
    const near = goalKg !== null && goalKg >= min - 5 && goalKg <= max + 5;
    return niceTicks(near ? Math.min(min, goalKg) : min, near ? Math.max(max, goalKg) : max);
  }, [entries, goalKg]);

  const x = (date: string) => M.left + (daysBetween(first.date, date) / spanDays) * innerW;
  const y = (kg: number) => M.top + (1 - (kg - lo) / (hi - lo)) * innerH;
  const points = entries.map((e) => ({ ...e, px: x(e.date), py: y(e.kg) }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(" ");
  const area = `${line} L${last && x(last.date).toFixed(1)} ${M.top + innerH} L${M.left} ${M.top + innerH} Z`;
  const goalVisible = goalKg !== null && goalKg >= lo && goalKg <= hi;

  const pick = (clientX: number) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const px = clientX - rect.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.px - px) < Math.abs(points[best]!.px - px)) best = i;
    });
    setActive(best);
  };

  const point = active === null ? null : points[active];
  const tipLeft = point ? Math.min(Math.max(point.px, 62), Math.max(width - 62, 62)) : 0;

  return (
    <div
      ref={box}
      className="chart"
      style={{ height: HEIGHT }}
      role="img"
      aria-label={`${label}: de ${formatKg(first.kg)} kg el ${formatShortDateYear(first.date)} a ${formatKg(last.kg)} kg el ${formatShortDateYear(last.date)}. El detalle está en el historial.`}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerLeave={() => setActive(null)}
      onPointerCancel={() => setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden>
          <defs>
            <linearGradient id="weight-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line className="chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="chart__tick" x={M.left - 8} y={y(t) + 4} textAnchor="end">
                {new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(t)}
              </text>
            </g>
          ))}

          <text className="chart__tick" x={M.left} y={HEIGHT - 6}>
            {formatShortDate(first.date)}
          </text>
          <text className="chart__tick" x={width - M.right} y={HEIGHT - 6} textAnchor="end">
            {formatShortDate(last.date)}
          </text>

          {goalVisible && (
            <g>
              <line className="chart__goal" x1={M.left} x2={width - M.right} y1={y(goalKg)} y2={y(goalKg)} />
              <text className="chart__goal-label" x={width - M.right} y={y(goalKg) - 6} textAnchor="end">
                Objetivo
              </text>
            </g>
          )}

          <motion.path d={area} fill="url(#weight-area)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.3 }} />
          <motion.path
            key={line}
            className="chart__line"
            d={line}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          />

          {point ? (
            <g>
              <line className="chart__cross" x1={point.px} x2={point.px} y1={M.top} y2={M.top + innerH} />
              <circle className="chart__dot" cx={point.px} cy={point.py} r={5} />
            </g>
          ) : (
            <circle className="chart__dot" cx={points[points.length - 1]!.px} cy={points[points.length - 1]!.py} r={4.5} />
          )}
        </svg>
      )}

      {point && (
        <div className="chart__tip" style={{ left: tipLeft }}>
          <strong className="tabular">{formatKg(point.kg)} kg</strong>
          <span>{formatShortDateYear(point.date)}</span>
        </div>
      )}
    </div>
  );
}
