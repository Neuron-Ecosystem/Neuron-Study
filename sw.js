const CACHE_NAME = 'neuron-study-v4';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker: Установка');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Кэширование основных ресурсов');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Все ресурсы закэшированы');
      })
      .catch((error) => {
        console.error('❌ Service Worker: Ошибка кэширования', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Удаление старого кэша', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Активирован и готов к работе');
      return self.clients.claim();
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Пропускаем не-GET запросы и запросы к Firebase
  if (request.method !== 'GET' || 
      request.url.includes('firebase') || 
      request.url.includes('googleapis')) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true })
      .then((cachedResponse) => {
        // Возвращаем кэшированную версию если есть
        if (cachedResponse) {
          return cachedResponse;
        }

        // Загружаем из сети
        return fetch(request)
          .then((networkResponse) => {
            // Кэшируем только успешные ответы
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback для страниц
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response('Нет соединения', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
