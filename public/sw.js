const CACHE_NAME = 'dr-stone-arena-v2';
const urlsToCache = [
  '/',
  '/login',
  '/icon-192.png',
  '/icon-512.png'
];

// Installation du Service Worker et mise en cache de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches puis prise de contrôle immédiate
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie Network First : le réseau a TOUJOURS la priorité (version à jour),
// le cache ne sert qu'en hors-ligne. Les requêtes non-GET (POST, PUT, DELETE)
// ne sont jamais interceptées — les soumissions API passent directement.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Gestion des notifications Push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'Un nouveau défi t\'attend !',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/etudiant'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Dr. Stone Arena', options)
  );
});

// Ouvrir l'app quand on clique sur la notif
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});