// Contrato entre la API y la web.

export const ACCENTS = ["lima", "coral", "violeta", "cielo", "menta"] as const;
export type Accent = (typeof ACCENTS)[number];

export interface User {
  id: string;
  username: string;
  displayName: string;
  accent: Accent;
  heightCm: number | null;
  goalKg: number | null;
  weeklyGoal: number;
  shareCalendar: boolean;
  shareWorkouts: boolean;
  shareWeight: boolean;
}

export interface WeightEntry {
  date: string; // AAAA-MM-DD
  kg: number;
}

export interface ProfilePatch {
  displayName?: string;
  accent?: Accent;
  heightCm?: number | null;
  goalKg?: number | null;
  weeklyGoal?: number;
  shareCalendar?: boolean;
  shareWorkouts?: boolean;
  shareWeight?: boolean;
}

export const LIMITS = {
  passwordMin: 8,
  passwordMax: 200,
  kgMin: 20,
  kgMax: 400,
  heightMin: 100,
  heightMax: 250,
  weeklyGoalMin: 1,
  weeklyGoalMax: 7,
  messageMax: 1000,
  routineExercisesMax: 30,
  setsMax: 10,
  repsMax: 100,
  liftKgMax: 1000,
  cardioMinutesMax: 600,
} as const;

// ---------- Ejercicios ----------

export const MUSCLES = {
  pecho: "Pecho",
  espalda: "Espalda",
  hombros: "Hombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  piernas: "Piernas",
  gluteos: "Glúteos",
  gemelos: "Gemelos",
  abs: "Abdomen",
  antebrazos: "Antebrazos",
  cuello: "Cuello",
} as const;
export type Muscle = keyof typeof MUSCLES;

export const EQUIPMENT = {
  maquina: "Máquina",
  polea: "Polea",
  mancuernas: "Mancuernas",
  barra: "Barra",
  kettlebell: "Kettlebell",
  corporal: "Peso corporal",
  bandas: "Bandas",
  balon: "Balón medicinal",
  fitball: "Fitball",
  rodillo: "Rodillo",
  otro: "Otro",
} as const;
export type Equipment = keyof typeof EQUIPMENT;

export interface CatalogExercise {
  id: string;
  name: string;
  en: string;
  muscle: Muscle;
  equipment: Equipment;
  category: "fuerza" | "olimpico" | "estiramiento" | "pliometria" | "cardio";
  level: 1 | 2 | 3;
  images: number;
}

export interface CustomExercise {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
}

// ---------- Rutinas ----------

export interface RoutineExercise {
  exerciseId: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  sets: number;
  reps: number;
}

export interface Routine {
  id: string;
  name: string;
  note: string;
  position: number;
  cardioMinutes: number;
  isDefault: boolean;
  exercises: RoutineExercise[];
}

// ---------- Entrenos ----------

export interface WorkoutEntry extends RoutineExercise {
  kg: number | null;
  done: boolean;
}

export interface Workout {
  id: string;
  date: string;
  routineId: string | null;
  routineName: string;
  startedAt: number;
  finishedAt: number | null;
  entries: WorkoutEntry[];
}

export const CARDIO_KINDS = {
  cinta: "Cinta",
  bici: "Bici",
  eliptica: "Elíptica",
  remo: "Remo",
  escaladora: "Escaladora",
  caminar: "Caminar",
  comba: "Comba",
  otro: "Otro",
} as const;
export type CardioKind = keyof typeof CARDIO_KINDS;

export interface CardioEntry {
  id: string;
  date: string;
  kind: CardioKind;
  minutes: number;
}

// ---------- Pareja y mensajes ----------

export interface Partner {
  id: string;
  displayName: string;
  accent: Accent;
  weeklyGoal: number;
}

/** Cada bloque es null si esa persona ha decidido no compartirlo. */
export interface PartnerData {
  partner: Partner;
  visits: string[] | null;
  workouts: Workout[] | null;
  cardio: CardioEntry[] | null;
  weights: WeightEntry[] | null;
}

export type MessageKind = "text" | "nudge" | "event";

export interface Message {
  id: string;
  fromMe: boolean;
  kind: MessageKind;
  body: string;
  createdAt: number;
  readAt: number | null;
}

export const NUDGES = [
  { emoji: "💪", text: "¡Vamos al gym!" },
  { emoji: "🔥", text: "¡Bien hecho!" },
  { emoji: "👀", text: "¿Hoy no vas?" },
] as const;
