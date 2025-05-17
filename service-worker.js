// service-worker.js - Service Worker optimisé pour DAOSAR (version corrigée)
const CACHE_NAME = 'daosar-cache-v1';
const OFFLINE_URL = '/QuestionnaireMigratoire/offline.html';

const ESSENTIAL_URLS = [
  '/',
  '/QuestionnaireMigratoire/index.html',
  '/QuestionnaireMigratoire/dashboard.html',
  '/QuestionnaireMigratoire/parametres.html',
  OFFLINE_URL,
  '/QuestionnaireMigratoire/css/styles.css',
  '/QuestionnaireMigratoire/js/script.js',
  '/QuestionnaireMigratoire/js/db.js',
  '/QuestionnaireMigratoire/pwa/icon-192.png',
  '/QuestionnaireMigratoire/pwa/icon-512.png'
];

// Installation: Cache les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll([
        '/',
        '/QuestionnaireMigratoire/index.html',
        '/QuestionnaireMigratoire/offline.html',
        '/QuestionnaireMigratoire/css/styles.css',
        '/QuestionnaireMigratoire/js/script.js',
        '/QuestionnaireMigratoire/pwa/icon-192.png'
      ]))
  );
});

// Activation: Nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Suppression de l\'ancien cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activé et prêt');
      return self.clients.claim();
    })
  );
});

// Stratégie de fetch optimisée
self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  // Ignorer les requêtes non-GET et les URLs externes/chrome
  if (request.method !== 'GET' || 
      requestUrl.origin !== self.location.origin ||
      request.url.includes('chrome-extension')) {
    return;
  }

  // Pour les pages HTML: Network First avec fallback cache
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Mise à jour du cache en arrière-plan
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, responseClone));
          return response;
        })
        .catch(() => {
          // Fallback: retourne la page offline ou la page d'accueil
          return caches.match(OFFLINE_URL) || caches.match('/QuestionnaireMigratoire/index.html');
        })
    );
    return;
  }

  // Pour les autres assets: Cache First avec mise à jour
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Si trouvé en cache, retourne la réponse
        if (cachedResponse) {
          // Mise à jour en arrière-plan
          fetchAndCache(request);
          return cachedResponse;
        }
        // Sinon, fetch + mise en cache
        return fetchAndCache(request);
      })
  );
});

// Fonction helper pour fetch + mise en cache
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    
    // Ne met en cache que les réponses valides
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback pour les images
    if (request.headers.get('accept').includes('image')) {
      return caches.match('/QuestionnaireMigratoire/pwa/icon-192.png');
    }
    return Response.error();
  }
}

// Gestion des notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true
    }).then(windowClients => {
      // Focus sur une fenêtre existante ou ouvre une nouvelle
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      } else {
        return clients.openWindow('/');
      }
    })
  );
});

// Gestion de l'état de connexion
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});