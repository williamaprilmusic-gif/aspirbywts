// Aspir by WTS — service worker (offline support + installability)
// Runtime caching so it works regardless of Vite's hashed filenames.
const CACHE = 'aspir-v2'

// Live data hosts (OpenStreetMap Nominatim + Overpass mirrors). These must
// never be cached or intercepted — always go straight to the network so the
// company finder returns fresh results.
const LIVE_HOSTS = [
  'nominatim.openstreetmap.org',
  'overpass-api.de',
  'overpass.kumi.systems',
  'maps.mail.ru',
]

self.addEventListener('install', (event) => {
  // Pre-cache the app entry so a fresh install can open offline.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest']).catch(() => {})),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Live data APIs: never intercept — let the browser hit the network directly.
  if (LIVE_HOSTS.includes(url.hostname)) return

  // SPA navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    )
    return
  }

  // Same-origin assets: cache-first, then network (and cache it).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
            return res
          }),
      ),
    )
    return
  }

  // Cross-origin (e.g. Google Fonts): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
