const CACHE_NAME = "smart-expiry-v1";
const FILES_TO_CACHE = [
  "/smart-expiry/",
  "/smart-expiry/index.html",
  "/smart-expiry/style.css",
  "/smart-expiry/script.js",
  "/smart-expiry/manifest.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
