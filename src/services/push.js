// Web Push odběr: požádá o povolení, zaregistruje se u push služby a uloží
// odběr do Firestore (kolekce `pushSubs`). Rozesílání řeší serverový cron
// (public/api/notify-deadlines.php) — pošle contentless push ~1–2 h před deadlinem.
//
// iOS: funguje JEN když je appka přidaná na plochu (standalone, iOS 16.4+).

import { db } from '../config/firebase.js'
import { doc, setDoc } from 'firebase/firestore'
import { getPlayerName } from './auth.js'

// Veřejný VAPID klíč (applicationServerKey). Soukromý protějšek je v secrets.php.
const VAPID_PUBLIC =
  'BCg3V5GIAxaPi8AM6LV56adaUlE1HC3AH2VV_F2zc0-Ey58vpYx3nUluuCiYkUY1QQiNrfmt-t8CFO9jOKoIuio'

const DISMISS_KEY = 'push-prompt-dismissed'

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
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

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

async function endpointId(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

// Hlavní akce: povolit + zaregistrovat + uložit odběr.
export async function enablePush() {
  if (!pushSupported()) throw new Error('Push není v tomto prohlížeči podporovaný.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifikace nebyly povoleny.')

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    })
  }

  const json = sub.toJSON()
  const id = await endpointId(json.endpoint)
  await setDoc(doc(db, 'pushSubs', id), {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh || '',
    auth: json.keys?.auth || '',
    player: getPlayerName() || '',
    ua: navigator.userAgent.slice(0, 120),
    updatedAt: new Date().toISOString(),
  })
  return true
}

// Banner s výzvou „Zapnout připomínky". Ukáže se jen když to dává smysl.
export function initPushUI() {
  if (!pushSupported()) return
  if (Notification.permission === 'granted') return // už povoleno
  if (Notification.permission === 'denied') return // nemá smysl otravovat
  if (localStorage.getItem(DISMISS_KEY)) return
  if (!getPlayerName()) return // hráč ještě nevybraný → počkáme
  // iOS: push jede jen v nainstalované appce (standalone). V Safari tabu nemá smysl.
  if (isiOS() && !isStandalone()) return

  setTimeout(() => showBanner(), 3500)
}

function showBanner() {
  if (document.getElementById('push-prompt-banner')) return
  const el = document.createElement('div')
  el.id = 'push-prompt-banner'
  el.className = 'pwa-banner'
  el.innerHTML = `
    <span class="pwa-banner-text">🔔 Zapnout připomínky na <b>deadline</b>?</span>
    <span class="pwa-banner-actions">
      <button class="pwa-banner-cta">Zapnout</button>
      <button class="pwa-banner-close" aria-label="Zavřít">✕</button>
    </span>
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('visible'))

  el.querySelector('.pwa-banner-cta').addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.disabled = true
    btn.textContent = '…'
    try {
      await enablePush()
      el.querySelector('.pwa-banner-text').innerHTML = '✅ Připomínky zapnuté!'
      el.querySelector('.pwa-banner-cta').remove()
      setTimeout(() => removeBanner(), 2000)
    } catch (err) {
      btn.disabled = false
      btn.textContent = 'Zapnout'
      alert(err.message || 'Nepodařilo se zapnout notifikace.')
    }
  })
  el.querySelector('.pwa-banner-close').addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1')
    removeBanner()
  })
}

function removeBanner() {
  const el = document.getElementById('push-prompt-banner')
  if (el) {
    el.classList.remove('visible')
    setTimeout(() => el.remove(), 250)
  }
}
