/* Portfolio service worker (jayaremala.com / itsjaya.com).
 *
 * Makes the site an installable PWA (Chromium needs a service worker with a fetch
 * handler before it offers the install prompt) and gives page navigations a light
 * offline fallback.
 *
 * NETWORK-FIRST, navigations only — the chatbot stream, /_next/ chunks, and API
 * calls go straight to the network untouched, so content is never stale; the cache
 * is only a fallback when the device is offline.
 */
const CACHE = "itsjaya-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached || (await caches.match("/")) || Response.error();
      }
    })(),
  );
});
