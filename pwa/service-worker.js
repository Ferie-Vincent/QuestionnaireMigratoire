// service-worker.js - Version finale pour Android offline

const APP_VERSION = 'v1.3'; // <-- Incrémentez à chaque modification
const CACHE_NAME = `migration-cache-${APP_VERSION}`;
const OFFLINE_PAGE = '/offline.html';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/css/bootstrap.min.css',
  '/js/script.js',
  '/pwa/manifest.json',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png'
];

// 1. Installation - Cache les ressources critiques + page offline
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache initialisé');
        // Cache les fichiers essentiels
        cache.addAll(CACHE_FILES)
          // Ajoute la page offline en supplément
          .then(() => cache.add(OFFLINE_PAGE))
          .catch(err => console.error('[SW] Erreur cache.addAll:', err));
      })
  );
  self.skipWaiting();
});

// 2. Activation - Nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Stratégie de cache améliorée pour Android
self.addEventListener('fetch', event => {
  // Exclusion des requêtes non-GET et des API externes
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('http') && !event.request.url.includes(location.origin)) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Renvoie le cache si disponible
        if (cachedResponse) {
          return cachedResponse;
        }

        // Sinon, tente le réseau avec fallback offline
        return fetch(event.request)
          .then(networkResponse => {
            // Mise en cache des nouvelles ressources (sauf HTML)
            if (networkResponse.ok && 
                !networkResponse.url.endsWith('.html') &&
                !networkResponse.url.includes('chrome-extension')) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(async () => {
            // Fallback 1: Page offline pour les routes principales
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
            // Fallback 2: Placeholder pour les images
            if (event.request.destination === 'image') {
              return caches.match('/pwa/icon-512.png');
            }
            return new Response('', { status: 503 });
          });
      })
  );
});
