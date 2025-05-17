import { db } from 'css/db.js';

// service-worker.js - Service Worker optimisé pour DAOSAR
const CACHE_NAME = 'daosar-cache-v3';
const OFFLINE_URL = '/offline.html';
const ESSENTIAL_URLS = [
  '/',
  OFFLINE_URL,
  '/css/styles.css',
  '/js/script.js',
  '/pwa/icon-192.png'
];

// Installation: Cache uniquement l'essentiel
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ESSENTIAL_URLS))
      .then(self.skipWaiting())
  );
});

// Activation: Nettoyage + prise de contrôle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME && caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Stratégie de fetch optimisée
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ignorer les non-GET et certaines URLs
  if (request.method !== 'GET' || request.url.includes('chrome-extension')) {
    return;
  }

  // API Google Sheets: Network First avec sauvegarde hors-ligne
  if (request.url.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .catch(() => new Response(JSON.stringify({ pendingSync: true }), {
          headers: { 'Content-Type': 'application/json' }
        }))
    );
    return;
  }

  // Pages HTML: Network First + fallback offline
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL) || caches.match('/'))
    );
    return;
  }

  // Assets: Cache First + mise à jour en arrière-plan
  event.respondWith(
    caches.match(request).then(cachedResponse => 
      cachedResponse || fetchAndCache(request)
    )
  );
});

async function fetchAndCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
    }
    return response;
  } catch {
    if (request.headers.get('accept').includes('image')) {
      return caches.match('/pwa/icon-192.png');
    }
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  const { request } = event;

  // Interception des soumissions de formulaire
  if (request.url.includes('googleapis.com') && request.method === 'POST') {
    event.respondWith(
      fetch(request.clone())
        .catch(async () => {
          // Sauvegarde dans IndexedDB si échec
          const data = await request.json();
          await db.init();
          await db.saveRequest({
            url: request.url,
            data,
            headers: { 'Content-Type': 'application/json' }
          });
          return new Response(JSON.stringify({ savedOffline: true }), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
  }
});

// Synchronisation des données en arrière-plan
self.addEventListener('sync', async event => {
  if (event.tag === 'sync-submissions') {
    event.waitUntil(
      (async () => {
        await db.init();
        const pendingRequests = await db.getPendingRequests();

        for (const req of pendingRequests) {
          try {
            const response = await fetch(req.url, {
              method: 'POST',
              headers: req.headers,
              body: JSON.stringify(req.data)
            });

            if (response.ok) {
              await db.deleteRequest(req.id);
            }
          } catch (error) {
            console.error('Sync failed:', error);
          }
        }
      })()
    );
  }
});
