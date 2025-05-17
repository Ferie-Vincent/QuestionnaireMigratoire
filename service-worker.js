// service-worker.js - Service Worker pour l'application DAOSAR

const CACHE_NAME = 'daosar-cache-v2';
const OFFLINE_URL = 'offline.html';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/parametres.html',
  '/login.html',
  '/css/styles.css',
  '/js/script.js',
  '/js/auth.js',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/manifest.json',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(PRECACHE_URLS)
          .then(() => cache.add(OFFLINE_URL));
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Stratégie de mise en cache: Network First, fallback to Cache
self.addEventListener('fetch', event => {
  // Ignore les requêtes non-GET et les requêtes vers des APIs externes
  if (event.request.method !== 'GET' || 
      event.request.url.includes('/api/') || 
      event.request.url.includes('chrome-extension')) {
    return;
  }

  // Pour les pages HTML, essayez le réseau d'abord, puis le cache
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la réponse est valide, mettez à jour le cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => {
          // Si le réseau échoue, retournez la page hors ligne
          return caches.match(OFFLINE_URL)
            .then(response => response || caches.match('/index.html'));
        })
    );
    return;
  }

  // Pour les autres ressources (CSS, JS, images), cache d'abord
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request)
          .then(fetchResponse => {
            // Mettez en cache les nouvelles ressources
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));

            return fetchResponse;
          })
          .catch(() => {
            // Pour les images, retournez une image de remplacement
            if (event.request.headers.get('accept').includes('image')) {
              return caches.match('/pwa/icon-192.png');
            }
          });
      })
  );
});

// Gestion de la synchronisation en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('Sync en arrière-plan déclenché');
    // Ici vous pourriez implémenter la synchronisation des données
  }
});

// Gestion des notifications push
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/pwa/icon-192.png',
    badge: '/pwa/icon-192.png'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});