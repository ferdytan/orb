const CACHE_NAME = 'orb-fin-welly-v3.1.0';

// Only cache immutable static assets (images, fonts).
// NEVER cache HTML documents or API requests to avoid stale UI lockups.
const STATIC_ASSETS = [
  './manifest.json',
  './assets/logo_orb.png',
  './assets/avatar_fin_360.png',
  './assets/avatar_welly_360.png',
  './assets/office_morning.jpg',
  './assets/office_night.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Purge ALL old cache stores completely
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

  // 1. Never intercept /api, websockets, or external domains
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) return;

  // 2. Navigation / HTML pages MUST ALWAYS fetch fresh from network
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    return;
  }

  // 3. For images, try cache first, fall back to network
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        return cached || fetch(e.request);
      })
    );
    return;
  }

  // 4. For JS and CSS, fetch from network first, fall back to cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
