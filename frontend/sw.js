const CACHE_NAME = 'orb-fin-welly-v2.2.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css?v=2.1.0',
  './css/avatars.css?v=2.1.0',
  './js/api.js?v=2.1.0',
  './js/auth.js?v=2.1.0',
  './js/avatars.js?v=2.1.0',
  './js/bento.js?v=2.1.0',
  './js/fin_workspace.js?v=2.1.0',
  './js/welly_workspace.js?v=2.1.0',
  './js/app.js?v=2.1.0',
  './assets/logo_orb.png',
  './assets/avatar_fin_360.png',
  './assets/avatar_welly_360.png',
  './assets/office_morning.jpg',
  './assets/office_night.jpg'
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
          if (k !== CACHE_NAME) {
            console.log('Purging legacy cache:', k);
            return caches.delete(k);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);
  // Never intercept /api/ or cross-origin requests
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) return;

  // Stale-while-revalidate for static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
