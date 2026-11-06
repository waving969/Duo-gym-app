import type { ComponentType, ReactNode, SVGProps } from "react";
import { DuoPage } from "../features/duo/DuoPage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { ProgressPage } from "../features/progress/ProgressPage";
import { TodayPage } from "../features/today/TodayPage";
import { RoutineEditorPage } from "../features/training/RoutineEditorPage";
import { SessionPage } from "../features/training/SessionPage";
import { TrainPage } from "../features/training/TrainPage";
import { ChartIcon, ChatIcon, DumbbellIcon, TodayIcon, UserIcon } from "../ui/icons";

interface NavItem {
  path: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  element: ReactNode;
}

// Una pestaña nueva es una línea aquí.
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Hoy", icon: TodayIcon, element: <TodayPage /> },
  { path: "/entrenar", label: "Entrenar", icon: DumbbellIcon, element: <TrainPage /> },
  { path: "/duo", label: "Dúo", icon: ChatIcon, element: <DuoPage /> },
  { path: "/progreso", label: "Progreso", icon: ChartIcon, element: <ProgressPage /> },
  { path: "/perfil", label: "Tú", icon: UserIcon, element: <ProfilePage /> },
];

// Pantallas sin pestaña propia.
export const EXTRA_ROUTES: { path: string; element: ReactNode }[] = [
  { path: "/entrenar/sesion", element: <SessionPage /> },
  { path: "/entrenar/rutina/:id", element: <RoutineEditorPage /> },
  { path: "/progreso/*", element: <ProgressPage /> },
];
