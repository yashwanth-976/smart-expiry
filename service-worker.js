const CACHE_VERSION = "v4"; // ⬅️ CHANGE THIS EVERY DEPLOY
const CACHE_NAME = `smart-expiry-${CACHE_VERSION}`;

const ASSETS = [
  "/smart-expiry/",
  "/smart-expiry/index.html",
  "/smart-expiry/style.css",
  "/smart-expiry/script.js",
  "/smart-expiry/manifest.json"
];

// INSTALL
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ACTIVATE – CLEAR OLD CACHES
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});

