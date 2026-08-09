const CACHE_NAME = 'freedom-os-app-shell-v8'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/freedom-os-icon.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(APP_SHELL)

      // Pre-cache the hashed Vite assets referenced by the current production shell.
      // This makes the first installed version usable offline immediately.
      try {
        const response = await fetch('/', { cache: 'no-store' })
        if (!response.ok) return

        await cache.put('/', response.clone())
        const html = await response.text()
        const assetUrls = Array.from(
          html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g),
          match => match[1],
        )
        await Promise.allSettled(assetUrls.map(url => cache.add(url)))
      } catch {
        // APP_SHELL is still available if the install-time refresh is offline.
      }
    }),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Trading data and serverless endpoints must always use their live source.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put('/', copy))
          }
          return response
        })
        .catch(async () => (await caches.match('/')) || Response.error()),
    )
    return
  }

  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)

  if (!isStaticAsset) return

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
