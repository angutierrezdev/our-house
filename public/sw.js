let VERSION = '2.1.2'; // Default fallback version
let CACHE_NAME = `our-house-v${VERSION}`;
const BASE_PATH = '/our-house';
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`
];

// Fetch version from metadata.json at service worker startup
fetch(`${BASE_PATH}/metadata.json`)
  .then(res => res.json())
  .then(data => {
    if (data.version) {
      VERSION = data.version;
      CACHE_NAME = `our-house-v${VERSION}`;
    }
  })
  .catch(() => {
    // Silently fail - use default fallback version
    console.warn('Failed to fetch version from metadata.json, using fallback');
  });

self.addEventListener('install', event => {
  // We don't skipWaiting() automatically here anymore 
  // to allow the user to see the notification if the app is open.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Handle messages from the client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Send current version to client
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: VERSION });
  }
});