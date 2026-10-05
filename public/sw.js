const CACHE_NAME = 'dr-stone-arena-v5';
// Uniquement des fichiers statiques (les pages dépendent de la connexion de l'utilisateur)
const urlsToCache = [
  '/offline.html',
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
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Hors connexion sur une page : écran de secours au lieu de l'erreur du navigateur
      if (event.request.mode === 'navigate') return caches.match('/offline.html');
      return Response.error();
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
  const url = (event.notification.data && event.notification.data.url) || '/etudiant';
  // Si l'app est déjà ouverte, on la ramène devant au lieu d'ouvrir une deuxième fenêtre
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});