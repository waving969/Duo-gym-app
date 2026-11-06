// Cola de envíos: lo que apuntas se guarda en el móvil al instante y se manda cuando hay cobertura.
// Cada envío es idempotente (lleva su id), así que repetirlo tras un corte no duplica nada.
import { useSyncExternalStore } from "react";
import { api, ApiError } from "./api";

const STORAGE_KEY = "duo.outbox.v1";

export interface OutboxItem {
  key: string; // dos envíos con la misma clave: solo cuenta el último
  method: string;
  path: string;
  body?: unknown;
}

function load(): OutboxItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

let items = load();
let flushing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let onDrained: () => void = () => {};
let onRejected: (message: string) => void = () => {};
const listeners = new Set<() => void>();

function commit(next: OutboxItem[]) {
  items = next;
  try {
    if (items.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento la cola sigue viva en memoria mientras la app esté abierta.
  }
  listeners.forEach((l) => l());
}

export function configureOutbox(handlers: { onDrained: () => void; onRejected: (message: string) => void }) {
  onDrained = handlers.onDrained;
  onRejected = handlers.onRejected;
}

export function enqueue(item: OutboxItem) {
  commit([...items.filter((i) => i.key !== item.key), item]);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), 300);
}

async function run() {
  let sent = false;
  while (items.length > 0) {
    const item = items[0]!;
    try {
      await api(item.method, item.path, item.body);
      sent = true;
    } catch (error) {
      // Sin red, fallo del servidor, sesión caducada o límite: se reintenta más tarde.
      const status = error instanceof ApiError ? error.status : 0;
      const retry = status === 0 || status >= 500 || status === 401 || status === 429;
      if (retry) return;
      onRejected((error as Error).message);
      sent = true;
    }
    // Si mientras se enviaba llegó una versión más nueva, esa se queda en la cola.
    commit(items.filter((i) => i !== item));
  }
  if (sent) onDrained();
}

export function flush(): Promise<void> {
  flushing ??= run().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function clearOutbox() {
  commit([]);
}

export function useOutboxCount(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items.length
  );
}

window.addEventListener("online", () => void flush());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void flush();
});
setInterval(() => {
  if (items.length > 0 && navigator.onLine) void flush();
}, 20_000);
