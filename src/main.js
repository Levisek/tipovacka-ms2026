import './style.css'
import { route, startRouter } from './router.js'
import { renderNav, initNavEvents } from './components/nav.js'
import { getPlayerName, renderPlayerModal, initPlayerModal } from './services/auth.js'
import { renderDashboard } from './views/dashboard.js'
import { renderSchedule } from './views/schedule.js'
import { renderStandings } from './views/standings.js'
import { renderMatchDetail } from './views/matchDetail.js'
import { renderArchive } from './views/archive.js'
import { renderAdmin } from './views/admin.js'
import { renderRules } from './views/rules.js'
import { renderWinner } from './views/winner.js'
import { renderPlayerProfile } from './views/playerProfile.js'

// Registrace rout
route('/', renderDashboard)
route('/schedule', renderSchedule)
route('/standings', renderStandings)
route('/match/:id', renderMatchDetail)
route('/archive', renderArchive)
route('/admin', renderAdmin)
route('/rules', renderRules)
route('/winner', renderWinner)
route('/player/:name', renderPlayerProfile)

// Render app shell
const app = document.getElementById('app')
app.innerHTML = `
  ${renderNav()}
  <main id="view"></main>
  ${renderPlayerModal()}
`

// Inicializace eventů
initNavEvents()
initPlayerModal(() => {
  // Po výběru hráče překresli nav a aktuální view
  const navEl = document.querySelector('nav')
  navEl.outerHTML = renderNav()
  initNavEvents()
  startRouter()
  // Teď když známe hráče, můžeme nabídnout připomínky.
  import('./services/push.js').then((m) => m.initPushUI())
})

// Start router POUZE pokud hráč už existuje. Pokud ne, ukázat modal
// a nechat dashboard nevykreslený dokud si nevybere — jinak se renderuje
// 72 karet + 313 Firestore dotazů na pozadí pod modal oknem a sekne to telefon
// (incident 2026-04-11).
if (!getPlayerName()) {
  document.getElementById('player-modal').classList.add('visible')
} else {
  startRouter()
}

// Výsledky: realtime z Firestore (plní je serverový cron sync-results.php).
// Klient už netahá výsledky z football-data přímo — odpadl manuál button
// i rozjeté výsledky per-zařízení.
import { initResultsSync } from './services/matchStore.js'
initResultsSync()

// Rozpis (časy + týmy po losování KO) zatím pořád z API na klientovi.
import { fetchSchedule } from './services/resultService.js'
fetchSchedule().catch(() => {})

// Build marker — změna tohoto řetězce vynutí nový hash v názvu bundlu
// (řeší občasnou corruptnutou cache entry v ATS edge cachi).
console.log('[tipovacka] build 2026-04-11-d defer-loads')

// PWA: registrace service workeru + výzva k instalaci na plochu.
import { initPWA } from './services/pwa.js'
initPWA()

// Push notifikace na deadline — výzva „Zapnout připomínky" (jen když dává smysl).
import { initPushUI } from './services/push.js'
initPushUI()

// Signál pro inline error reporter v index.html (timeout watchdog)
window.__tipovackaBooted = true
