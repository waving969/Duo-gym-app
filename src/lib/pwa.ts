import { api } from "./api";
import { QK, queryClient } from "./queryClient";

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then((registration) => {
      // Guarda lo que ya se ha cargado para poder abrir la app sin cobertura.
      const loaded = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .filter((url) => url.startsWith(location.origin) && !url.includes("/api/"));
      registration.active?.postMessage({ type: "cache-urls", urls: [...new Set(["/", "/exercises.json", ...loaded])] });
    });

  navigator.serviceWorker.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type !== "push") return;
    void queryClient.invalidateQueries({ queryKey: QK.messages });
    void queryClient.invalidateQueries({ queryKey: QK.unread });
    void queryClient.invalidateQueries({ queryKey: QK.partner });
  });
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type PushSupport = "ok" | "needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  // En iPhone las notificaciones web solo existen en la app añadida a la pantalla de inicio.
  if (isIOS() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok" || !import.meta.env.PROD) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePush(): Promise<void> {
  const { publicKey } = await api<{ publicKey: string | null }>("GET", "/push/key");
  if (!publicKey) throw new Error("El servidor no tiene las notificaciones configuradas.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso denegado. Actívalo en los ajustes del móvil para esta app.");
  }
  const registration = await navigator.serviceWorker.ready;
  const raw = atob(publicKey.replace(/-/g, "+").replace(/_/g, "/"));
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)),
  });
  await api("POST", "/push/subscribe", subscription.toJSON());
}

export async function disablePush(): Promise<void> {
  const subscription = await currentSubscription();
  if (!subscription) return;
  await api("POST", "/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}
