self.addEventListener('install', event => {
  console.log('Service Worker установлен');
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
