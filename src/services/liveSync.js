/**
 * Live trigger serverového syncu výsledků.
 *
 * Wedos cron umí spouštět sync-results.php jen 1× za hodinu — na live skóre
 * nepoužitelné. Místo externího cronu si refresh řekne sama appka: dokud je
 * otevřená a běží (nebo za chvíli začíná) nějaký zápas, jednou za ~5 min
 * fire-and-forget pingne tokenless `?live=1` endpoint. Server má vlastní
 * throttle (240 s, lockfile), takže víc otevřených klientů kvótu nespálí —
 * první projde, ostatní dostanou `throttled`. Výsledek pak všem rozdá
 * realtime Firestore listener (matchStore.initResultsSync).
 */
import { getAllMatches } from './matchStore.js'

const SYNC_URL = '/tipovacka/api/sync-results.php?live=1'
const CHECK_INTERVAL_MS = 60 * 1000
const CALL_MIN_GAP_MS = 5 * 60 * 1000
const PRE_KICKOFF_MS = 10 * 60 * 1000        // začni těsně před výkopem
const POST_KICKOFF_MS = 150 * 60 * 1000      // 90' + pauza + nastavení ≈ 2,5 h

let _lastCall = 0

/** Hraje se teď (nebo za chvíli začíná) nějaký zápas? */
function liveWindowActive() {
  const now = Date.now()
  return getAllMatches().some(m => {
    if (m.status === 'finished') return false
    if (m.status === 'live') return true
    // kickoff je v SELČ (UTC+2) — viz config/schedule.js
    const kick = new Date(`${m.date}T${m.kickoff}:00+02:00`).getTime()
    return !isNaN(kick) && now >= kick - PRE_KICKOFF_MS && now <= kick + POST_KICKOFF_MS
  })
}

export function initLiveSync() {
  const tick = () => {
    if (document.visibilityState !== 'visible') return
    if (Date.now() - _lastCall < CALL_MIN_GAP_MS) return
    if (!liveWindowActive()) return
    _lastCall = Date.now()
    fetch(SYNC_URL).catch(() => {})
  }
  tick()
  setInterval(tick, CHECK_INTERVAL_MS)
  // Návrat do appky (PWA z pozadí) → hned zkus refresh, ať skóre nečeká minutu
  document.addEventListener('visibilitychange', tick)
}
