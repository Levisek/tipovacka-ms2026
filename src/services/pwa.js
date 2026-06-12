// PWA: registrace service workeru + výzva k instalaci na plochu.
// Android/Chrome: nativní `beforeinstallprompt` → tlačítko „Přidat".
// iOS Safari: nemá install API → ukážeme návod (Sdílet → Přidat na plochu).
// Notifikace na iPhonu fungují AŽ po přidání na plochu (iOS 16.4+).

const DISMISS_KEY = 'pwa-install-dismissed'

export function initPWA() {
  registerSW()
  setupInstallUI()
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    // ?v= obchází ATS edge cache — ta držela sw.js immutable rok (Age 130k+
    // při incidentu 2026-06-12), takže nasazené změny SW ke klientům nešly.
    // Při změně sw.js zvedni verzi. (.htaccess už má pro sw.js no-cache,
    // ale starou cache entry bez query to nezneplatní.)
    navigator.serviceWorker
      .register('/tipovacka/sw.js?v=20260612', { scope: '/tipovacka/' })
      .catch((err) => console.warn('[pwa] SW registrace selhala:', err))
  })
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isiOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function setupInstallUI() {
  if (isStandalone()) return // už nainstalováno
  if (localStorage.getItem(DISMISS_KEY)) return // uživatel zavřel

  let deferredPrompt = null

  // Android/Chrome: zachyť nativní prompt, ukaž vlastní banner
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    showBanner({
      text: '📲 Nainstaluj si Tipovačku na plochu',
      cta: 'Přidat',
      onCta: async () => {
        deferredPrompt.prompt()
        await deferredPrompt.userChoice
        deferredPrompt = null
        removeBanner()
      },
    })
  })

  // iOS: žádný prompt event → po chvíli ukaž návod
  if (isiOS()) {
    setTimeout(() => {
      if (!isStandalone()) {
        showBanner({
          text: '📲 Přidej na plochu: <b>Sdílet</b> → <b>Přidat na plochu</b>',
          cta: null,
        })
      }
    }, 2500)
  }
}

function showBanner({ text, cta, onCta }) {
  if (document.getElementById('pwa-install-banner')) return
  const el = document.createElement('div')
  el.id = 'pwa-install-banner'
  el.className = 'pwa-banner'
  el.innerHTML = `
    <span class="pwa-banner-text">${text}</span>
    <span class="pwa-banner-actions">
      ${cta ? `<button class="pwa-banner-cta">${cta}</button>` : ''}
      <button class="pwa-banner-close" aria-label="Zavřít">✕</button>
    </span>
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('visible'))

  if (cta && onCta) {
    el.querySelector('.pwa-banner-cta').addEventListener('click', onCta)
  }
  el.querySelector('.pwa-banner-close').addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1')
    removeBanner()
  })
}

function removeBanner() {
  const el = document.getElementById('pwa-install-banner')
  if (el) {
    el.classList.remove('visible')
    setTimeout(() => el.remove(), 250)
  }
}
