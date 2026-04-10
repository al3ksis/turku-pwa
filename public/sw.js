const CACHE_NAME = 'turku-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Network-first strategy - always try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && event.request.method === 'GET') {
          const url = new URL(event.request.url)
          // Only cache same-origin static assets
          if (url.origin === self.location.origin && !url.pathname.startsWith('/.netlify/')) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
        }
        return response
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
      })
  )
})
