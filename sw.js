const CACHE_NAME = 'neuron-study-v2';
const urlsToCache = [
    '/', '/index.html', '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => caches.open(CACHE_NAME).then(c => { c.put(e.request, res.clone()); return res; })))));

self.addEventListener('push', e => {
    const data = e.data.json();
    self.registration.showNotification(data.title, { body: data.body, icon: 'favicon-192x192.png' });
});
