// Service worker: la app abre sin cobertura y recibe notificaciones. Nunca guarda nada de /api.
const SHELL = "duo-shell-v1";
const IMAGES = "duo-images-v1";
const IMAGE_HOST = "raw.githubusercontent.com";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, IMAGES];
      for (const key of await caches.keys()) if (!keep.includes(key)) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

// La web pide guardar lo que ya ha cargado, porque esa primera carga ocurrió antes de que existiera este worker.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-urls") return;
  event.waitUntil(caches.open(SHELL).then((cache) => Promise.all(event.data.urls.map((url) => cache.add(url).catch(() => {})))));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === IMAGE_HOST) {
    event.respondWith(cacheFirst(request, IMAGES));
    return;
  }
  if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(async () => (await caches.match("/")) ?? Response.error())
    );
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, SHELL)); // llevan un hash en el nombre: nunca cambian
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => (await caches.match(request)) ?? Response.error())
  );
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("push", (event) => {
  let data = { title: "Dúo", body: "", url: "/", tag: "duo" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: data.tag,
        renotify: true,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { url: data.url },
      });
      // Si la app está abierta, que se actualice al momento.
      for (const client of await self.clients.matchAll({ type: "window" })) client.postMessage({ type: "push" });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows[0];
      if (open) {
        await open.focus();
        return open.navigate?.(url);
      }
      return self.clients.openWindow(url);
    })()
  );
});
