import type { Equipment, Muscle, RoutineExercise } from "./types";

// Rutina de aclimatación para volver tras mucho tiempo: 3 días, músculos que trabajan juntos,
// casi todo en máquina (más seguro y fácil de aprender), 2 series de 12-15 con peso ligero.

const ex = (exerciseId: string, name: string, muscle: Muscle, equipment: Equipment, sets = 2, reps = 12): RoutineExercise => ({
  exerciseId,
  name,
  muscle,
  equipment,
  sets,
  reps,
});

export interface DefaultRoutine {
  key: string;
  name: string;
  note: string;
  cardioMinutes: number;
  exercises: RoutineExercise[];
}

const NOTE = "Aclimatación: peso con el que podrías hacer 5 repeticiones más. Si duele, para.";

export const DEFAULT_ROUTINES: DefaultRoutine[] = [
  {
    key: "aclimatacion-a",
    name: "Pecho y tríceps",
    note: NOTE,
    cardioMinutes: 10,
    exercises: [
      ex("Leverage_Chest_Press", "Press de pecho en máquina", "pecho", "maquina"),
      ex("Butterfly", "Contractor de pecho (peck deck)", "pecho", "maquina"),
      ex("Machine_Shoulder_Military_Press", "Press de hombros en máquina", "hombros", "maquina"),
      ex("Triceps_Pushdown", "Extensión de tríceps en polea", "triceps", "polea"),
      ex("Crunches", "Crunch abdominal", "abs", "corporal", 2, 15),
    ],
  },
  {
    key: "aclimatacion-b",
    name: "Espalda y bíceps",
    note: NOTE,
    cardioMinutes: 10,
    exercises: [
      ex("Wide-Grip_Lat_Pulldown", "Jalón al pecho, agarre ancho", "espalda", "polea"),
      ex("Seated_Cable_Rows", "Remo sentado en polea", "espalda", "polea"),
      ex("Face_Pull", "Face pull", "hombros", "polea", 2, 15),
      ex("Machine_Bicep_Curl", "Curl de bíceps en máquina", "biceps", "maquina"),
      ex("Hammer_Curls", "Curl martillo", "biceps", "mancuernas"),
    ],
  },
  {
    key: "aclimatacion-c",
    name: "Pierna y hombro",
    note: NOTE,
    cardioMinutes: 10,
    exercises: [
      ex("Leg_Press", "Prensa de piernas", "piernas", "maquina"),
      ex("Leg_Extensions", "Extensión de cuádriceps", "piernas", "maquina"),
      ex("Seated_Leg_Curl", "Curl femoral sentado", "piernas", "maquina"),
      ex("Side_Lateral_Raise", "Elevación lateral", "hombros", "mancuernas"),
      ex("Plank", "Plancha", "abs", "corporal", 2, 30),
    ],
  },
];
