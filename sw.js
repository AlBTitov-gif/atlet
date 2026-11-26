/* ============================================================
   Service worker: офлайн-работа приложения
   ============================================================ */
const VERSION = 'atlet-v1.6.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/components.css',
  './css/session.css',
  './css/library.css',
  './css/programs.css',
  './css/journal.css',
  './css/progress.css',
  './js/main.js',
  './js/utils.js',
  './js/store.js',
  './js/icons.js',
  './js/analytics.js',
  './js/exercises.js',
  './js/templates.js',
  './js/timer.js',
  './js/session.js',
  './js/ui.js',
  './js/importer.js',
  './js/sports.js',
  './js/body-map.js',
  './js/anatomy.js',
  './js/anatomy360.js',
  './js/views/sport.js',
  './js/seed.js',
  './js/views/today.js',
  './js/views/session.js',
  './js/views/programs.js',
  './js/views/journal.js',
  './js/views/progress.js',
  './js/views/profile.js',
  './js/views/exercises.js',
  './js/views/picker.js',
  './js/views/group-picker.js',
  './js/views/measure.js',
  './js/views/import.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // навигация: сеть, при офлайне — кэш
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // статика: cache-first с фоновым обновлением
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

