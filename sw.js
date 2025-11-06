// sw.js
const CACHE_NAME = 'neuron-study-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
  // Только то, что 100% существует
  // Иконки и скриншоты — добавляются отдельно, когда будут загружены
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(err => console.warn('SW: Failed to cache core assets:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Только GET-запросы
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      // Возвращаем из кэша, если есть
      if (cached) return cached;

      // Иначе — с сети
      return fetch(request).then(response => {
        // Проверяем валидность ответа
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Кэшируем успешный ответ
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Оффлайн: если HTML — возвращаем index.html
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
