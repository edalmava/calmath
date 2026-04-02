const CACHE_NAME = 'calmath-v1';

async function precacheFromManifest() {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    const response = await fetch('/sw-manifest.json');
    if (!response.ok) {
      console.error('Failed to fetch manifest:', response.status);
      return;
    }
    const manifest = await response.json();
    
    const promises = manifest.files.map(async (file) => {
      try {
        await cache.add(file);
      } catch (e) {
        console.warn('Failed to cache:', file, e.message);
      }
    });
    
    await Promise.all(promises);
    console.log('Precached', manifest.files.length, 'files');
  } catch (e) {
    console.error('Failed to precache:', e);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheFromManifest());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

function handleFetch(event) {
  const url = new URL(event.request.url);

  if (url.origin !== location.origin) {
    return;
  }

  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image' ||
    event.request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        });
      })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        return response;
      }).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
}

self.addEventListener('fetch', handleFetch);
