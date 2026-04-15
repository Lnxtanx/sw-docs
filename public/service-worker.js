/**
 * Service Worker for offline support and caching
 */

const CACHE_NAME = 'sw-docs-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/_nav-tree.json',
  '/_search-index.json',
  '/_content-manifest.json',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching essential assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Ignore errors for missing assets
        console.log('Service Worker: Some assets could not be cached');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Navigation requests should preserve real 404 responses.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => (
            cached ||
            caches.match('/404.html') ||
            new Response('Page not available offline', { status: 404 })
          ));
        })
    );
    return;
  }

  // Special handling for content manifest and nav tree (Network-First)
  const isDocData = url.pathname.endsWith('.json') && (
    url.pathname.includes('_content-manifest') || 
    url.pathname.includes('_nav-tree')
  );

  if (isDocData) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Stale-While-Revalidate for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Final fallback for missing resources
      if (request.destination === 'image') {
        return new Response('', { status: 404 });
      }
      return new Response('Resource not available', { status: 404 });
    })
  );
});
