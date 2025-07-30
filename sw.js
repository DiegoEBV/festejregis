// sw.js
const CACHE_NAME = 'festejos-cache-v4'; // incrementa versión al actualizar
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/catalogo.html',
  '/catalog-admin.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  // agrega aquí otros recursos (imágenes, fuentes, etc)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo GET (no para POST de Dexie, etc)
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).catch(() =>
        // fallback offline: muestra index.html
        event.request.mode === 'navigate'
          ? caches.match('/index.html')
          : undefined
      )
    )
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notificación';
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
