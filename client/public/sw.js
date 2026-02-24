const CACHE_NAME = "gym-app-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Always network-first — only cache the bare HTML shell for offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Always network for API and JS/TS modules
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/src/") ||
    url.pathname.includes(".js") ||
    url.pathname.includes(".ts") ||
    url.pathname.includes(".css") ||
    url.pathname.includes("@")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first only for true static assets (icons, images, manifest)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        });
      })
    )
  );
});
