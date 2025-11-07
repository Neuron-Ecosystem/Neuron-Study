const CACHE_NAME = 'neuron-study-v1';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json'];
// Добавьте сюда все ресурсы, которые нужны для работы офлайн
// '/css/styles.css', '/js/main.js' и т.д.

self.addEventListener('install', event => { /* ... ваш код install ... */ self.skipWaiting(); });
self.addEventListener('activate', event => { /* ... ваш код activate ... */ });

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(cached => { // <-- ИСПРАВЛЕНИЕ: Добавлена опция ignoreSearch: true
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const clone = response.clone();
        // При кэшировании мы тоже используем чистый URL, чтобы не плодить записи в кэше
        caches.open(CACHE_NAME).then(cache => cache.put(new URL(request.url).pathname, clone));
        return response;
      }).catch(() => {
        // Fallback для документов (страниц)
        if (request.destination === 'document') return caches.match('/index.html', { ignoreSearch: true });
      });
    })
  );
});
