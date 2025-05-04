// service-worker.js - Version améliorée et commentée

// 1. Configuration de base
const APP_VERSION = 'v1.2'; // Mettez à jour ce numéro quand vous modifiez les fichiers
const CACHE_NAME = `migration-app-${APP_VERSION}`;
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/css/bootstrap.min.css',
  '/js/script.js',
  '/pwa/manifest.json',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png'
];

// 2. Installation - Mise en cache quand l'utilisateur installe l'app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des ressources');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => {
        console.error('[Service Worker] Erreur de cache:', err);
      })
  );
  self.skipWaiting(); // Prend le contrôle immédiatement
});

// 3. Activation - Nettoie les anciennes versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  console.log('[Service Worker] Prêt à fonctionner offline!');
  self.clients.claim(); // Prend le contrôle de tous les clients
});

// 4. Stratégie de cache : "Cache First, then Network"
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes de données
  if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Renvoie la version en cache si disponible
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Sinon, va chercher sur le réseau
        return fetch(event.request).then(response => {
          // Option: mettre en cache les nouvelles ressources
          if (!response || response.status !== 200) {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// 5. Gestion du téléchargement JSON (à garder dans votre script.js principal)
// Cette partie ne devrait PAS être dans le service-worker!
// Déplacez-la dans script.js à la place