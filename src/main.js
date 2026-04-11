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
})

// Pokud hráč není vybraný, zobraz modal
if (!getPlayerName()) {
  document.getElementById('player-modal').classList.add('visible')
}

// Start router
startRouter()

// Auto-sync s football-data.org API
import { startPolling, fetchSchedule } from './services/resultService.js'

// 1) Při startu stáhni aktuální rozpis (časy + týmy po losování)
fetchSchedule().catch(() => {})

// 2) Auto-polling výsledků (každých 60s)
startPolling()

// Build marker — změna tohoto řetězce vynutí nový hash v názvu bundlu
// (řeší občasnou corruptnutou cache entry v ATS edge cachi).
console.log('[tipovacka] build 2026-04-11-a')
