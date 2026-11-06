import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { parseISODate, visitsInMonth, visitsInWeek, weekDays, weekStreak, weightChange } from "../../../shared/stats";
import { countedWorkouts, doneCount, nextRoutine } from "../../../shared/training";
import { NUDGES } from "../../../shared/types";
import { formatDelta, formatKg, formatLongDate, plural } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { Button } from "../../ui/Button";
import { CheckIcon } from "../../ui/icons";
import { useToast } from "../../ui/Toast";
import { useUser } from "../auth/useMe";
import { useToggleVisit, useVisits } from "../calendar/useVisits";
import { usePartner, useSendMessage, useUnread } from "../duo/useDuo";
import { startSession, useActiveSession } from "../training/activeSession";
import { CardioSheet } from "../training/CardioSheet";
import { useRoutines, useWorkouts } from "../training/useTraining";
import { useWeights } from "../weight/useWeights";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

function PartnerStrip() {
  const today = useToday();
  const { data } = usePartner();
  const { data: unread = 0 } = useUnread();
  const send = useSendMessage();
  const toast = useToast();
  if (!data) return null;

  const name = data.partner.displayName;
  const lastVisit = data.visits?.[data.visits.length - 1];
  const went = lastVisit === today;
  const status = !data.visits
    ? "No comparte su calendario"
    : went
      ? "Ha ido hoy al gym"
      : lastVisit
        ? `Fue por última vez el ${formatLongDate(lastVisit).toLowerCase()}`
        : "Aún no ha ido al gym";
  const nudge = NUDGES[0];

  return (
    <section className="partner-strip" aria-label={`Estado de ${name}`}>
      <Link to="/duo" className="partner-strip__info">
        <span className="partner-strip__avatar" data-swatch={data.partner.accent}>
          {name.charAt(0).toUpperCase()}
          {unread > 0 && <span className="badge">{unread}</span>}
        </span>
        <span className="partner-strip__text">
          <strong>{name}</strong>
          <span>{unread > 0 ? `${unread} ${plural(unread, "mensaje nuevo", "mensajes nuevos")}` : status}</span>
        </span>
      </Link>
      <motion.button
        type="button"
        className="nudge nudge--solo"
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          send("nudge", `${nudge.emoji} ${nudge.text}`);
          toast({ message: `Toque enviado a ${name}` });
        }}
      >
        <span aria-hidden>👉</span> Toque
      </motion.button>
    </section>
  );
}

export function TodayPage() {
  const user = useUser();
  const today = useToday();
  const navigate = useNavigate();
  const { visits, isPending } = useVisits();
  const toggle = useToggleVisit();
  const { data: entries = [] } = useWeights();
  const { data: routines = [] } = useRoutines();
  const { data: workouts = [] } = useWorkouts();
  const active = useActiveSession();
  const [cardioOpen, setCardioOpen] = useState(false);

  const wentToday = visits.has(today);
  const date = parseISODate(today);
  const thisWeek = visitsInWeek(visits, today);
  const streak = weekStreak(visits, user.weeklyGoal, today);
  const thisMonth = visitsInMonth(visits, date.getFullYear(), date.getMonth());
  const latest = entries[entries.length - 1];
  const change = weightChange(entries, 30);
  const remaining = Math.max(user.weeklyGoal - thisWeek, 0);
  const next = nextRoutine(routines, workouts);
  const doneToday = countedWorkouts(workouts).find((w) => w.date === today && w.finishedAt);

  return (
    <>
      <header className="page__header">
        <p className="page__eyebrow">{formatLongDate(today)}</p>
        <h1 className="page__title">Hola, {user.displayName}</h1>
      </header>

      <PartnerStrip />

      {active ? (
        <section className="card cta">
          <span className="cta__label">Entreno en curso</span>
          <h2 className="cta__title">{active.workout.routineName}</h2>
          <p className="cta__meta tabular">
            {doneCount(active.workout)} de {active.workout.entries.length} ejercicios
          </p>
          <Button size="large" onClick={() => navigate("/entrenar/sesion")}>
            Continuar
          </Button>
        </section>
      ) : doneToday ? (
        <section className="card cta cta--done">
          <span className="cta__label">Hoy</span>
          <h2 className="cta__title">{doneToday.routineName}: hecho</h2>
          <p className="cta__meta tabular">{doneCount(doneToday)} ejercicios</p>
        </section>
      ) : (
        next && (
          <section className="card cta">
            <span className="cta__label">Te toca</span>
            <h2 className="cta__title">{next.name}</h2>
            <p className="cta__meta">
              {next.exercises.length} ejercicios{next.cardioMinutes > 0 && ` · ${next.cardioMinutes} min de cardio`}
            </p>
            <Button
              size="large"
              onClick={() => {
                startSession(next, today);
                navigate("/entrenar/sesion");
              }}
            >
              Empezar
            </Button>
            <Link to="/entrenar" className="cta__link">
              Elegir otra rutina
            </Link>
          </section>
        )
      )}

      <section className="card" aria-label="Esta semana">
        <div className="week__head">
          <h2 className="card__title">Esta semana</h2>
          <p className="week__count tabular">
            {thisWeek} de {user.weeklyGoal}
          </p>
        </div>
        <ol className="week">
          {weekDays(today).map((day, i) => (
            <li key={day} className={`week__day ${visits.has(day) ? "week__day--on" : ""} ${day === today ? "week__day--today" : ""}`}>
              <span className="week__letter" aria-hidden>
                {LETTERS[i]}
              </span>
              <span className="week__dot">{visits.has(day) && <CheckIcon width={14} height={14} aria-hidden />}</span>
              <span className="sr-only">
                {formatLongDate(day)}: {visits.has(day) ? "fuiste" : "no fuiste"}
              </span>
            </li>
          ))}
        </ol>
        <p className="week__note">
          {remaining === 0
            ? "Objetivo de la semana cumplido."
            : `${plural(remaining, "Te falta", "Te faltan")} ${remaining} ${plural(remaining, "día", "días")} para tu objetivo.`}
        </p>
        <div className="quick-actions">
          <motion.button
            type="button"
            className={`quick ${wentToday ? "quick--on" : ""}`}
            aria-pressed={wentToday}
            disabled={isPending}
            whileTap={{ scale: 0.96 }}
            onClick={() => toggle.mutate({ date: today, going: !wentToday })}
          >
            <AnimatePresence initial={false}>
              {wentToday && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="quick__check">
                  <CheckIcon width={16} height={16} aria-hidden />
                </motion.span>
              )}
            </AnimatePresence>
            {wentToday ? "Hoy he ido" : "Marcar que he ido"}
          </motion.button>
          <button type="button" className="quick" onClick={() => setCardioOpen(true)}>
            Apuntar cardio
          </button>
        </div>
      </section>

      <section className="stats" aria-label="Resumen">
        <div className="stat">
          <span className="stat__value tabular">{streak}</span>
          <span className="stat__label">{plural(streak, "semana", "semanas")} de racha</span>
        </div>
        <div className="stat">
          <span className="stat__value tabular">{thisMonth}</span>
          <span className="stat__label">{plural(thisMonth, "día", "días")} este mes</span>
        </div>
        <div className="stat">
          <span className="stat__value tabular">{visits.size}</span>
          <span className="stat__label">en total</span>
        </div>
      </section>

      <Link to="/progreso/peso" className="card card--link weight-link">
        <span className="weight-link__label">Tu peso</span>
        {latest ? (
          <span className="weight-link__value">
            <strong className="tabular">{formatKg(latest.kg)} kg</strong>
            {change !== null && <span className="tabular">{formatDelta(change)} kg en 30 días</span>}
          </span>
        ) : (
          <span className="weight-link__value">
            <strong>Apuntar el primero</strong>
          </span>
        )}
      </Link>

      <CardioSheet open={cardioOpen} onClose={() => setCardioOpen(false)} />
    </>
  );
}
