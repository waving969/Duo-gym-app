import { useState } from "react";
import type { WeekBucket } from "../../../shared/training";
import { formatShortDate } from "../../lib/format";

interface Series {
  label: string;
  buckets: WeekBucket[];
  className: string;
}

/** Días de gym por semana. Una o dos series; con dos hay leyenda y se distinguen por posición y color. */
export function WeeklyBars({ series, goal }: { series: Series[]; goal?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const weeks = series[0]?.buckets ?? [];
  const max = Math.max(7, ...series.flatMap((s) => s.buckets.map((b) => b.days)));
  const summary = weeks.map((w, i) => `${formatShortDate(w.week)}: ${series.map((s) => `${s.label} ${s.buckets[i]?.days ?? 0}`).join(", ")}`).join("; ");

  return (
    <figure className="bars-figure">
      {series.length > 1 && (
        <figcaption className="legend">
          {series.map((s) => (
            <span key={s.label} className="legend__item">
              <span className={`legend__swatch ${s.className}`} aria-hidden />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div className="bars-tip" aria-live="polite">
        {active !== null && weeks[active] ? (
          <>
            <strong>Semana del {formatShortDate(weeks[active].week)}</strong>{" "}
            {series.map((s) => `${series.length > 1 ? `${s.label}: ` : ""}${s.buckets[active]?.days ?? 0} ${(s.buckets[active]?.days ?? 0) === 1 ? "día" : "días"}`).join(" · ")}
          </>
        ) : (
          <span className="muted">Toca una semana para ver el detalle</span>
        )}
      </div>
      <div className="bars" role="img" aria-label={`Días de gym por semana. ${summary}`}>
        {goal !== undefined && <span className="bars__goal" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden />}
        {weeks.map((w, i) => (
          <button
            key={w.week}
            type="button"
            className={`bars__week ${active === i ? "bars__week--active" : ""}`}
            aria-label={`Semana del ${formatShortDate(w.week)}`}
            onClick={() => setActive(active === i ? null : i)}
          >
            {series.map((s) => (
              <span key={s.label} className={`bars__bar ${s.className}`} style={{ height: `${((s.buckets[i]?.days ?? 0) / max) * 100}%` }} />
            ))}
          </button>
        ))}
      </div>
      <div className="bars__axis" aria-hidden>
        <span>{weeks[0] && formatShortDate(weeks[0].week)}</span>
        <span>Esta semana</span>
      </div>
    </figure>
  );
}
