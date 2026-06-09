/* Service worker — Tipovačka MS 2026
 *
 * Dvě role:
 *  1) PWA shell: umožní instalaci na plochu. Cache je ZÁMĚRNĚ minimální /
 *     network-first — appka má historii potíží se stale cache (viz vite.config),
 *     takže nikdy neservírujeme starý HTML/bundle z cache, když je síť.
 *  2) Push notifikace na deadline (plní krok 2 — VAPID push z cronu).
 */

const CACHE = 'tipovacka-v1'
const SCOPE = '/tipovacka/'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Network-first pro navigace (vždy nejnovější HTML), s offline fallbackem na cache.
// Ostatní GET requesty: nech projít na síť, jen do cache ukládej úspěšné odpovědi
// pro případný offline režim. Hashované /assets/ jsou immutable, takže bezpečné.
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const isNavigation = req.mode === 'navigate'
  if (isNavigation) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((r) => r || caches.match(SCOPE)))
    )
    return
  }

  // Ostatní: cache jako offline fallback, ale síť má přednost.
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req))
  )
})

// --- Push (krok 2: VAPID push z cronu) ---
// Posíláme contentless push (bez payloadu), text je tady napevno.
// Pokud payload přijde (data push), použij ho.
self.addEventListener('push', (e) => {
  let data = {}
  try { data = e.data ? e.data.json() : {} } catch { data = {} }

  const title = data.title || '⚽ Tipovačka — deadline se blíží!'
  const body = data.body || 'Za chvíli se uzavírají tipy. Máš tipnuto? Ještě můžeš změnit tip!'

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/tipovacka/icon-192.png',
      badge: '/tipovacka/icon-192.png',
      tag: data.tag || 'deadline',
      renotify: true,
      data: { url: data.url || '/tipovacka/' },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/tipovacka/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(SCOPE) && 'focus' in c) return c.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
