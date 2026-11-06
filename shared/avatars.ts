// Avatares de Fluent Emoji (Microsoft, MIT) con nombre de gym. Las imágenes están en public/avatares/<id>.webp.

export const AVATAR_GROUPS = [
  {
    title: "Fieras del gym",
    avatars: [
      { id: "oso", name: "Oso Press Banca" },
      { id: "gato", name: "Gato Mancuerna" },
      { id: "perro", name: "Perro Sentadilla" },
      { id: "panda", name: "Panda Proteína" },
      { id: "mono", name: "Mono Dominadas" },
      { id: "rana", name: "Rana Burpee" },
      { id: "tigre", name: "Tigre de Hierro" },
      { id: "leon", name: "León del Rack" },
      { id: "zorro", name: "Zorro Cardio" },
      { id: "koala", name: "Koala Estiramientos" },
      { id: "pinguino", name: "Pingüino Plancha" },
      { id: "conejo", name: "Conejo Comba" },
      { id: "gallo", name: "Gallo Madrugador" },
      { id: "buho", name: "Búho Nocturno" },
      { id: "unicornio", name: "Unicornio Gains" },
      { id: "dragon", name: "Dragón Pre-Entreno" },
      { id: "tortuga", name: "Tortuga Constante" },
      { id: "cerdo", name: "Cerdito Volumen" },
      { id: "vaca", name: "Vaca Whey" },
      { id: "hamster", name: "Hámster en la Cinta" },
      { id: "llama", name: "Llama Elíptica" },
      { id: "perezoso", name: "Perezoso Día de Descanso" },
      { id: "pulpo", name: "Pulpo Multipower" },
      { id: "trex", name: "T-Rex Día de Brazo" },
      { id: "gorila", name: "Gorila Peso Muerto" },
    ],
  },
  {
    title: "Modo bestia",
    avatars: [
      { id: "biceps", name: "Bíceps de Acero" },
      { id: "levantador", name: "Levanta Hierro" },
      { id: "robot", name: "Robot Sin Excusas" },
      { id: "fuego", name: "Racha de Fuego" },
      { id: "rayo", name: "Pura Energía" },
      { id: "trofeo", name: "Récord Personal" },
      { id: "medalla", name: "Medalla de Oro" },
    ],
  },
] as const;

export type AvatarId = (typeof AVATAR_GROUPS)[number]["avatars"][number]["id"];

export const AVATARS = AVATAR_GROUPS.flatMap((g): readonly { id: AvatarId; name: string }[] => g.avatars);

const NAMES = new Map<string, string>(AVATARS.map((a) => [a.id, a.name]));

export const avatarName = (id: string | null | undefined) => (id ? (NAMES.get(id) ?? null) : null);
export const isAvatarId = (value: unknown): value is AvatarId => typeof value === "string" && NAMES.has(value);
