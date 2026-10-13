const CACHE_NAME = 'orb-pwa-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=1.3.0',
  './css/avatars.css?v=1.3.0',
  './js/api.js?v=1.3.0',
  './js/avatars.js?v=1.3.0',
  './js/bento.js?v=1.3.0',
  './js/agent_modal.js?v=1.3.0',
  './js/chat.js?v=1.3.0',
  './js/app.js?v=1.3.0',
  './assets/office_morning.jpg',
  './assets/office_night.jpg',
  './assets/avatar_fin.png',
  './assets/avatar_muse.png',
  './assets/avatar_chat.png',
  './assets/avatar_nova.png',
  './assets/avatar_blaze.png',
  './assets/avatar_sage.png',
  './assets/avatar_spark.png',
  './assets/avatar_echo.png',
  './assets/avatar_pixel.png',
  './assets/avatar_atlas.png',
  './assets/widget_wallet.png',
  './assets/widget_badges.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW cache pre-fill partial:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;
  
  // Do not intercept cross-origin requests, API endpoints, or WebSockets
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || url.pathname.includes('/ws')) return;

  // Network-First strategy: always fetch fresh assets when online, fall back to cache when offline
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, clone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
