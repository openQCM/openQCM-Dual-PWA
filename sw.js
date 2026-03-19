/** Service worker — cache-first for static assets. */

const CACHE_NAME = 'openqcm-v2';
// Use relative paths so the SW works both at root and in subdirectories (GitHub Pages)
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/data-model.js',
  './js/serial-comm.js',
  './js/csv-export.js',
  './js/charts.js',
  './js/app.js',
  './manifest.json',
  './icons/openqcm.svg',
];

// Pre-cache static assets on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, fallback to network (and cache the response)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache CDN resources (Plotly) on first load
        if (response.ok && event.request.url.includes('cdn.plot.ly')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
