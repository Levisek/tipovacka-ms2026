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

// Registrace rout
route('/', renderDashboard)
route('/schedule', renderSchedule)
route('/standings', renderStandings)
route('/match/:id', renderMatchDetail)
route('/archive', renderArchive)
route('/admin', renderAdmin)

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

// Auto-polling výsledků z API (každých 5 min)
import { startPolling } from './services/resultService.js'
startPolling()
