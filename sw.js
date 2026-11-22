// Change this revision when any of the precached files changes.
const cachePrefix = `exascale:${self.registration.scope}:`;
const cacheName = cachePrefix + "pwa-1";
const files = [
  "./index.html",
  "./styles.css",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/installation.js",
  "./src/first-circuit.js",
  "./src/audio.js",
  "./src/data.js",
  "./src/engine.js",
  "./src/renderer.js",
  "./src/storage.js",
  "./assets/img/exascale.svg",
  "./assets/img/audioOn.png",
  "./assets/img/icon-180.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/icon-maskable.png",
  "./assets/audio/alert.ogg",
  "./assets/audio/connect.ogg",
  "./assets/audio/research.ogg",
].map((path) => new URL(path, self.registration.scope).href);
const entry = files[0];
const precached = new Set(files);
const home = new URL(self.registration.scope).pathname;
const index = new URL(entry).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      cache.addAll(files.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const documentRequest =
    request.mode === "navigate" && (url.pathname === home || url.pathname === index);
  if (!documentRequest && !precached.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    return (await cache.match(documentRequest ? entry : request)) || fetch(request);
  })());
});
