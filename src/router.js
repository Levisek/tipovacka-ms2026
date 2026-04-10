const routes = {}
let currentCleanup = null

export function route(path, handler) {
  routes[path] = handler
}

export function navigate(path) {
  window.location.hash = path
}

export function currentRoute() {
  const hash = window.location.hash.slice(1) || '/'
  return hash
}

function matchRoute(hash) {
  // Přesná shoda
  if (routes[hash]) return { handler: routes[hash], params: {} }

  // Parametrická shoda (např. /match/:id)
  for (const [pattern, handler] of Object.entries(routes)) {
    const patternParts = pattern.split('/')
    const hashParts = hash.split('/')
    if (patternParts.length !== hashParts.length) continue

    const params = {}
    let match = true
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = hashParts[i]
      } else if (patternParts[i] !== hashParts[i]) {
        match = false
        break
      }
    }
    if (match) return { handler, params }
  }
  return null
}

function handleRoute() {
  const rawHash = window.location.hash.slice(1) || '/'
  const hash = rawHash.split('?')[0] // Odstraň query params pro matching
  const container = document.getElementById('view')
  if (!container) return

  if (currentCleanup) {
    currentCleanup()
    currentCleanup = null
  }

  const result = matchRoute(hash)
  if (result) {
    const maybePromise = result.handler(container, result.params)
    // Podpora async handlerů
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(cleanup => {
        if (typeof cleanup === 'function') currentCleanup = cleanup
      }).catch(e => {
        console.error('Route error:', e)
        container.innerHTML = '<h2>Chyba</h2><p>Něco se pokazilo.</p>'
      })
    } else if (typeof maybePromise === 'function') {
      currentCleanup = maybePromise
    }
  } else {
    container.innerHTML = '<h2>404</h2><p>Stránka nenalezena</p>'
  }

  // Aktualizuj aktivní odkaz v navigaci
  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href')
    a.classList.toggle('active', href === '#' + hash || (hash === '/' && href === '#/'))
  })
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute)
  handleRoute()
}
