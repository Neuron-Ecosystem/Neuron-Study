// sw.js
const CACHE_NAME = 'neuron-v9';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/screenshot-wide.png',
  '/screenshot-narrow.png'
  // НЕ кэшируем '/' — это ошибка!
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache.map(url => new Request(url, { credentials: 'same-origin' })));
      })
      .catch(err => {
        console.error('SW: Failed to cache resources:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Оффлайн-фолбэк (опционально)
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
