// LibreIC Service Worker — Cache Strategy
const CACHE_NAME = 'libreic-v1'
const STATIC_CACHE = 'libreic-static-v1'

// Assets estáticos para cachear no install
const STATIC_ASSETS = [
  '/',
  '/library',
  '/explore',
  '/search',
  '/collections',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Não intercepta chamadas de API — sempre vai para a rede
  if (url.pathname.startsWith('/api/')) return

  // Estratégia: Network first, cache fallback para navegação
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then(r => r ?? caches.match('/')))
    )
    return
  }

  // Imagens e assets estáticos: cache first
  if (request.destination === 'image' || request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          caches.open(CACHE_NAME).then(cache => cache.put(request, res.clone()))
          return res
        })
      })
    )
  }
})
