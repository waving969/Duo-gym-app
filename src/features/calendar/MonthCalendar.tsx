import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { addDays, parseISODate, startOfWeek, toISODate, visitsInMonth } from "../../../shared/stats";
import { formatLongDate, formatMonth, plural } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { CheckIcon, ChevronLeft, ChevronRight } from "../../ui/icons";

const WEEKDAYS = [
  ["L", "lunes"],
  ["M", "martes"],
  ["X", "miércoles"],
  ["J", "jueves"],
  ["V", "viernes"],
  ["S", "sábado"],
  ["D", "domingo"],
] as const;

/** Las 6 semanas que se muestran para un mes: la altura no salta al cambiar de mes. */
function monthCells(year: number, monthIndex: number): string[] {
  const first = startOfWeek(toISODate(new Date(year, monthIndex, 1)));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

interface Props {
  visits: ReadonlySet<string>;
  /** Sin esto el calendario es de solo lectura (el de tu pareja). */
  onToggle?: (date: string, going: boolean) => void;
  /** Al cambiar de mes, para mostrar debajo lo de ese mes. */
  onMonthChange?: (prefix: string) => void;
  subject?: string;
}

export function MonthCalendar({ visits, onToggle, onMonthChange, subject = "fuiste" }: Props) {
  const today = useToday();
  const start = parseISODate(today);
  const [view, setView] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [direction, setDirection] = useState(1);

  const isCurrentMonth = view.year === start.getFullYear() && view.month === start.getMonth();
  const cells = useMemo(() => monthCells(view.year, view.month), [view]);
  const count = visitsInMonth(visits, view.year, view.month);

  const move = (delta: number) => {
    if (delta > 0 && isCurrentMonth) return;
    setDirection(delta);
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
    onMonthChange?.(toISODate(d).slice(0, 7));
  };

  return (
    <section className="card calendar">
      <div className="calendar__bar">
        <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => move(-1)}>
          <ChevronLeft />
        </button>
        <div className="calendar__heading" aria-live="polite">
          <h2>{formatMonth(view.year, view.month)}</h2>
          <p>
            <span className="tabular">{count}</span> {plural(count, "día", "días")}
          </p>
        </div>
        <button type="button" className="icon-btn" aria-label="Mes siguiente" disabled={isCurrentMonth} onClick={() => move(1)}>
          <ChevronRight />
        </button>
      </div>

      <div className="calendar__weekdays" aria-hidden>
        {WEEKDAYS.map(([letter, name]) => (
          <span key={name}>{letter}</span>
        ))}
      </div>

      <div className="calendar__viewport">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={`${view.year}-${view.month}`}
            className="calendar__grid"
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: `${d * 100}%`, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: `${d * -100}%`, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragDirectionLock
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) move(1);
              else if (info.offset.x > 60) move(-1);
            }}
          >
            {cells.map((date) => {
              const inMonth = parseISODate(date).getMonth() === view.month;
              const visited = visits.has(date);
              return (
                <button
                  key={date}
                  type="button"
                  className={["day", visited && "day--visited", date === today && "day--today", !inMonth && "day--outside", date > today && "day--future"].filter(Boolean).join(" ")}
                  disabled={date > today || !onToggle}
                  aria-pressed={onToggle ? visited : undefined}
                  aria-label={`${formatLongDate(date)}${visited ? `, ${subject} al gym` : ""}`}
                  onClick={() => onToggle?.(date, !visited)}
                >
                  <AnimatePresence initial={false}>
                    {visited && (
                      <motion.span
                        className="day__fill"
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.3, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 520, damping: 26 }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="day__number">{parseISODate(date).getDate()}</span>
                  {visited && <CheckIcon className="day__check" aria-hidden />}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
