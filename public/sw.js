let VERSION = '2.1.2'; // Default fallback version
let CACHE_NAME = `our-house-v${VERSION}`;
const RUNTIME_CACHE = 'our-house-runtime';
const BASE_PATH = '/our-house';
const urlsToCache = [
  `${BASE_PATH}/`,
  `${BASE_PATH}/index.html`,
  `${BASE_PATH}/manifest.json`,
  `${BASE_PATH}/offline.html`,
  // Icons
  `${BASE_PATH}/icons/favicon.ico`,
  `${BASE_PATH}/icons/favicon.png`,
  `${BASE_PATH}/icons/apple-touch-icon.png`,
  `${BASE_PATH}/icons/icon-192x192.png`,
  `${BASE_PATH}/icons/icon-384x384.png`,
  `${BASE_PATH}/icons/icon-512x512.png`,
  // Splash screens
  `${BASE_PATH}/icons/splash-540x720.png`,
  `${BASE_PATH}/icons/splash-750x1280.png`,
  `${BASE_PATH}/icons/splash-1080x1440.png`,
  `${BASE_PATH}/icons/splash-1536x2048.png`
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
          // Keep current version cache and runtime cache, delete others
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin && !url.hostname.includes('firebase')) {
    return;
  }

  event.respondWith(
    (async () => {
      // Cache-first strategy for images, fonts, and static assets
      if (request.destination === 'image' || 
          request.destination === 'font' || 
          request.destination === 'style' ||
          url.pathname.includes('/icons/')) {
        const cached = await caches.match(request);
        if (cached) return cached;
        
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          return cached || new Response('', { status: 404 });
        }
      }

      // Network-first strategy for Firebase API calls and dynamic content
      if (url.hostname.includes('firebase') || 
          url.hostname.includes('googleapis') ||
          url.pathname.includes('/api/')) {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          const cached = await caches.match(request);
          return cached || new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Stale-while-revalidate for HTML and app resources
      const cached = await caches.match(request);
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          const cache = caches.open(RUNTIME_CACHE);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => null);

      // Return cached immediately if available, or wait for network
      if (cached) {
        return cached;
      }

      const response = await fetchPromise;
      if (response) {
        return response;
      }

      // Offline fallback for navigation requests
      if (request.mode === 'navigate') {
        return caches.match(`${BASE_PATH}/offline.html`);
      }

      return new Response('', { status: 404 });
    })()
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