import { useMemo, useState } from "react";
import { avatarName } from "../../../shared/avatars";
import { weekStreak } from "../../../shared/stats";
import { trainingTotals, weeklyVisits } from "../../../shared/training";
import type { PartnerData, User } from "../../../shared/types";
import { formatKg, formatShortDateYear } from "../../lib/format";
import { useToday } from "../../lib/useToday";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Segmented } from "../../ui/controls";
import { useUser } from "../auth/useMe";
import { MonthCalendar } from "../calendar/MonthCalendar";
import { useVisits } from "../calendar/useVisits";
import { ActivityList, ExercisesView, SummaryView } from "../progress/TrainingViews";
import { WeeklyBars } from "../progress/WeeklyBars";
import { useCardio, useWorkouts } from "../training/useTraining";
import { WeightChart } from "../weight/WeightChart";
import { ChatPanel } from "./ChatPanel";
import { usePartner } from "./useDuo";

type Tab = "chat" | "compare" | "partner";

const NotShared = ({ name, what }: { name: string; what: string }) => (
  <section className="card empty">
    <h2>{name} no comparte {what}</h2>
    <p>Cada uno decide qué se ve desde «Tú → Privacidad».</p>
  </section>
);

function ComparePanel({ me, data }: { me: User; data: PartnerData }) {
  const today = useToday();
  const { visits } = useVisits();
  const { data: workouts = [] } = useWorkouts();
  const { data: cardio = [] } = useCardio();
  const name = data.partner.displayName;

  const mine = trainingTotals(workouts, cardio, today);
  const theirs = data.workouts ? trainingTotals(data.workouts, data.cardio ?? [], today) : null;
  const theirVisits = useMemo(() => (data.visits ? new Set(data.visits) : null), [data.visits]);
  const month = today.slice(0, 7);
  const days = (set: Iterable<string>) => [...set].filter((d) => d.startsWith(month)).length;

  const rows: { label: string; a: string | number; b: string | number | null }[] = [
    { label: "Días este mes", a: days(visits), b: theirVisits && days(theirVisits) },
    { label: "Racha (semanas)", a: weekStreak(visits, me.weeklyGoal, today), b: theirVisits && weekStreak(theirVisits, data.partner.weeklyGoal, today) },
    { label: "Entrenos este mes", a: mine.workoutsThisMonth, b: theirs && theirs.workoutsThisMonth },
    { label: "Kilos movidos este mes", a: mine.volumeThisMonth.toLocaleString("es-ES"), b: theirs && theirs.volumeThisMonth.toLocaleString("es-ES") },
    { label: "Cardio este mes (min)", a: mine.cardioThisMonth, b: theirs && theirs.cardioThisMonth },
  ];

  return (
    <>
      <section className="card card--list">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Dato</span>
              </th>
              <th scope="col">
                <Avatar avatar={me.avatar} name={me.displayName} accent={me.accent} size={36} className="compare__avatar" />
                Tú
              </th>
              <th scope="col">
                <Avatar avatar={data.partner.avatar} name={name} accent={data.partner.accent} size={36} className="compare__avatar" />
                {name}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td className="tabular">{r.a}</td>
                <td className="tabular">{r.b ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {theirVisits && (
        <section className="card" aria-labelledby="compare-weeks">
          <h2 className="card__title" id="compare-weeks">
            Días de gym por semana
          </h2>
          <WeeklyBars
            series={[
              { label: "Tú", buckets: weeklyVisits(visits, today), className: "bars__bar--a" },
              { label: name, buckets: weeklyVisits(theirVisits, today), className: "bars__bar--b" },
            ]}
          />
        </section>
      )}
    </>
  );
}

function PartnerPanel({ data }: { data: PartnerData }) {
  const name = data.partner.displayName;
  const visits = useMemo(() => new Set(data.visits ?? []), [data.visits]);
  const latest = data.weights?.[data.weights.length - 1];

  return (
    <>
      {data.visits ? (
        <>
          {data.workouts && <SummaryView visits={visits} workouts={data.workouts} cardio={data.cardio ?? []} weeklyGoal={data.partner.weeklyGoal} />}
          <MonthCalendar visits={visits} subject={`${name} fue`} />
        </>
      ) : (
        <NotShared name={name} what="su calendario" />
      )}

      {data.workouts ? (
        <>
          <section className="card card--list" aria-labelledby="partner-activity">
            <h2 className="card__title" id="partner-activity">
              Sus entrenos
            </h2>
            <ActivityList workouts={data.workouts} cardio={data.cardio ?? []} />
          </section>
          <h2 className="section-title">Sus pesos por ejercicio</h2>
          <ExercisesView workouts={data.workouts} emptyText={`${name} aún no ha registrado ejercicios.`} />
        </>
      ) : (
        <NotShared name={name} what="sus entrenos" />
      )}

      {data.weights &&
        (latest ? (
          <section className="card">
            <h2 className="card__title">Su peso</h2>
            <div className="hero-number">
              <span className="hero-number__value tabular">{formatKg(latest.kg)}</span>
              <span className="hero-number__unit">kg</span>
            </div>
            <p className="hero-number__meta">{formatShortDateYear(latest.date)}</p>
            {data.weights.length >= 2 && <WeightChart entries={data.weights} goalKg={null} label={`Evolución del peso de ${name}`} />}
          </section>
        ) : null)}
    </>
  );
}

export function DuoPage() {
  const me = useUser();
  const partner = usePartner();
  const [tab, setTab] = useState<Tab>("chat");

  if (partner.isPending) return <div className="card skeleton" style={{ height: 320 }} />;
  if (partner.isError && !partner.data) {
    return (
      <section className="card empty">
        <h2>Sin conexión</h2>
        <p>No se han podido cargar los datos.</p>
        <Button variant="secondary" onClick={() => partner.refetch()}>
          Reintentar
        </Button>
      </section>
    );
  }
  if (!partner.data) {
    return (
      <section className="card empty">
        <h2>Aún estás solo aquí</h2>
        <p>En cuanto la otra cuenta exista, os vincularéis automáticamente.</p>
      </section>
    );
  }

  const data = partner.data;
  const name = data.partner.displayName;
  const options = [
    { id: "chat", label: "Mensajes" },
    { id: "compare", label: "Comparar" },
    { id: "partner", label: name },
  ] as const;

  return (
    <>
      <header className="duo-head">
        <div className="duo-head__avatars">
          <Avatar avatar={me.avatar} name={me.displayName} accent={me.accent} size={56} />
          <Avatar avatar={data.partner.avatar} name={name} accent={data.partner.accent} size={56} />
        </div>
        <div>
          <h1 className="page__title">Tú y {name}</h1>
          {avatarName(data.partner.avatar) && <p className="page__subtitle">{avatarName(data.partner.avatar)}</p>}
        </div>
      </header>
      <Segmented id="duo-tabs" label="Sección" value={tab} options={options as readonly { id: Tab; label: string }[]} onChange={setTab} />
      {tab === "chat" && <ChatPanel partner={data.partner} />}
      {tab === "compare" && <ComparePanel me={me} data={data} />}
      {tab === "partner" && <PartnerPanel data={data} />}
    </>
  );
}
