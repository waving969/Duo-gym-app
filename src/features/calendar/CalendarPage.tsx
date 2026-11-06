import { useState } from "react";
import { CARDIO_KINDS } from "../../../shared/types";
import { doneCount } from "../../../shared/training";
import { formatShortDate } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { useCardio, useWorkouts } from "../training/useTraining";
import { MonthCalendar } from "./MonthCalendar";
import { useToggleVisit, useVisits } from "./useVisits";

export function CalendarPanel() {
  const today = useToday();
  const { visits } = useVisits();
  const toggle = useToggleVisit();
  const { data: workouts = [] } = useWorkouts();
  const { data: cardio = [] } = useCardio();
  const [month, setMonth] = useState(today.slice(0, 7));

  const items = [
    ...workouts
      .filter((w) => w.date.startsWith(month) && doneCount(w) > 0)
      .map((w) => ({ key: w.id, date: w.date, title: w.routineName, detail: `${doneCount(w)} ejercicios` })),
    ...cardio
      .filter((c) => c.date.startsWith(month))
      .map((c) => ({ key: c.id, date: c.date, title: `Cardio: ${CARDIO_KINDS[c.kind]}`, detail: `${c.minutes} min` })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <p className="panel-hint">Toca un día para marcar que fuiste al gym.</p>
      <MonthCalendar visits={visits} onToggle={(date, going) => toggle.mutate({ date, going })} onMonthChange={setMonth} />
      {items.length > 0 && (
        <section className="card card--list" aria-label="Actividad del mes">
          <h2 className="card__title">Este mes</h2>
          <ul className="history">
            {items.map((item) => (
              <li key={item.key} className="activity-row">
                <span className="history__date">{formatShortDate(item.date)}</span>
                <span className="activity-row__title">{item.title}</span>
                <span className="history__delta">{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
