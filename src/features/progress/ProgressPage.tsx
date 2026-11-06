import { useLocation, useNavigate } from "react-router";
import { Segmented } from "../../ui/controls";
import { useUser } from "../auth/useMe";
import { CalendarPanel } from "../calendar/CalendarPage";
import { useVisits } from "../calendar/useVisits";
import { useCardio, useWorkouts } from "../training/useTraining";
import { WeightPanel } from "../weight/WeightPage";
import { ActivityList, ExercisesView, SummaryView } from "./TrainingViews";

const SECTIONS = [
  { id: "resumen", label: "Resumen" },
  { id: "calendario", label: "Calendario" },
  { id: "peso", label: "Peso" },
  { id: "ejercicios", label: "Ejercicios" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export function ProgressPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useUser();
  const { visits } = useVisits();
  const { data: workouts = [] } = useWorkouts();
  const { data: cardio = [] } = useCardio();

  const param = pathname.split("/")[2] as Section | undefined;
  const section: Section = SECTIONS.some((s) => s.id === param) ? param! : "resumen";

  return (
    <>
      <header className="page__header">
        <h1 className="page__title">Progreso</h1>
      </header>
      <Segmented id="progress-tabs" label="Sección" value={section} options={SECTIONS} onChange={(id) => navigate(`/progreso/${id}`, { replace: true })} />

      {section === "resumen" && (
        <>
          <SummaryView visits={visits} workouts={workouts} cardio={cardio} weeklyGoal={user.weeklyGoal} />
          <section className="card card--list" aria-labelledby="activity-title">
            <h2 className="card__title" id="activity-title">
              Actividad reciente
            </h2>
            <ActivityList workouts={workouts} cardio={cardio} />
          </section>
        </>
      )}
      {section === "calendario" && <CalendarPanel />}
      {section === "peso" && <WeightPanel />}
      {section === "ejercicios" && <ExercisesView workouts={workouts} emptyText="Cuando hagas tu primer entreno verás aquí el peso de cada ejercicio." />}
    </>
  );
}
