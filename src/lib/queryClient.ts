import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";
import { clearOutbox, configureOutbox, flush } from "./outbox";

export const ME_KEY = ["me"] as const;
export const QK = {
  visits: ["visits"],
  weights: ["weights"],
  routines: ["routines"],
  customExercises: ["custom-exercises"],
  workouts: ["workouts"],
  cardio: ["cardio"],
  partner: ["partner"],
  messages: ["messages"],
  unread: ["unread"],
} as const;

const THIRTY_DAYS = 30 * 86_400_000;
const OWNER_KEY = "duo.owner.v1";

// Si el servidor dice que la sesión ya no vale, se vuelve al login. Un fallo de red NO cierra la sesión.
function onError(error: unknown) {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(ME_KEY, null);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: Infinity, // ojo: más de 24,8 días desborda setTimeout y borraría los datos al instante
      networkMode: "always",
      retry: (count, error) => !(error instanceof ApiError && error.status > 0) && count < 1,
    },
    mutations: { networkMode: "always" },
  },
});

// Lo último cargado se guarda en el móvil: abre al instante y funciona sin cobertura en el gym.
export const persister = createSyncStoragePersister({
  storage: typeof localStorage === "undefined" ? undefined : localStorage,
  key: "duo.cache.v1",
  throttleTime: 1000,
});

export const persistOptions = {
  persister,
  maxAge: THIRTY_DAYS,
  buster: "2",
  dehydrateOptions: {
    // Se guarda todo lo que tenga datos, aunque el último intento de actualizarlo haya fallado por falta de red.
    shouldDehydrateQuery: (q: { state: { data: unknown }; queryKey: readonly unknown[] }) =>
      q.state.data !== undefined && q.queryKey[0] !== "invite",
  },
};

/** Primero se envía lo pendiente, para que lo descargado no pise lo que acabas de apuntar. */
export function fetchAfterSync<T>(request: () => Promise<T>) {
  return async () => {
    await flush();
    return request();
  };
}

/** Borra del dispositivo todo lo de la cuenta (al cerrar sesión o si entra otra persona). */
export function wipeDeviceData() {
  // No se usa clear(): dejaría sin aviso a las pantallas que ya están mirando la sesión.
  queryClient.setQueryData(ME_KEY, null);
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== ME_KEY[0] });
  clearOutbox();
  void persister.removeClient();
  try {
    localStorage.removeItem("duo.active.v1");
    localStorage.removeItem(OWNER_KEY);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

export function onSignedIn<T extends { id: string }>(user: T) {
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(OWNER_KEY);
  } catch {
    // Sin almacenamiento no hay datos de otra cuenta.
  }
  if (previous && previous !== user.id) wipeDeviceData();
  try {
    localStorage.setItem(OWNER_KEY, user.id);
  } catch {
    // Sin almacenamiento la app sigue funcionando.
  }
  queryClient.setQueryData(ME_KEY, user);
}

export function connectOutbox(notifyRejected: (message: string) => void) {
  configureOutbox({
    onDrained: () => {
      void queryClient.invalidateQueries({ queryKey: QK.visits });
      void queryClient.invalidateQueries({ queryKey: QK.workouts });
      void queryClient.invalidateQueries({ queryKey: QK.cardio });
      void queryClient.invalidateQueries({ queryKey: QK.routines });
      void queryClient.invalidateQueries({ queryKey: QK.messages });
    },
    onRejected: notifyRejected,
  });
  void flush();
}
