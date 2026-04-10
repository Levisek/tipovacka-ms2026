import * as store from '../services/matchStore.js'
import { renderMatchCard } from '../components/matchCard.js'
import { initBetForms } from '../components/betForm.js'
import { renderBankTicker } from '../components/bankTicker.js'
import { renderWinnerBet, initWinnerBet } from '../components/winnerBet.js'
import { getPlayerName } from '../services/auth.js'
import { formatDateFull, getDeadlineTime, isPastDeadline } from '../utils/date.js'
import { getPlayerBet, getAllBets, getWinnerBets, onBetsChange } from '../services/betService.js'
import { computeLiveStandings } from '../services/standingsService.js'
import { startCountdown } from '../components/countdown.js'

// Cache tipů (přežije mezi renders)
const _betCache = {}
const _allBetsCache = {}
let _winnerBets = {}
let _currentBank = 0
let _storeUnsubscribe = null

export function renderDashboard(container) {
  const player = getPlayerName()

  const hashParts = window.location.hash.split('?')
  const params = new URLSearchParams(hashParts[1] || '')
  const phase = params.get('phase') || 'group'

  const allMatches = store.getAllMatches()
  const matches = phase === 'knockout'
    ? allMatches.filter(m => m.stage !== 'group')
    : allMatches.filter(m => m.stage === 'group')

  const today = new Date().toISOString().slice(0, 10)

  // Rozděl na: odehrané / aktuální den / nadcházející
  const finished = []
  const current = []
  const upcoming = []

  // Najdi nejbližší den s neodehranými zápasy
  const unplayedDates = [...new Set(
    matches
      .filter(m => m.status !== 'finished' && m.homeScore === null)
      .map(m => m.date)
  )].sort()
  const currentDay = unplayedDates[0] || null

  for (const m of matches) {
    if (m.status === 'finished' || (m.homeScore !== null && m.homeScore !== undefined)) {
      finished.push(m)
    } else if (currentDay && m.date === currentDay) {
      current.push(m)
    } else {
      upcoming.push(m)
    }
  }

  // Seskup po dnech
  const groupByDate = (arr) => {
    const map = new Map()
    arr.forEach(m => {
      if (!map.has(m.date)) map.set(m.date, [])
      map.get(m.date).push(m)
    })
    return map
  }

  const finishedByDate = groupByDate(finished)
  const finishedDays = [...finishedByDate.keys()].sort().reverse()
  const upcomingByDate = groupByDate(upcoming)
  const upcomingDays = [...upcomingByDate.keys()].sort()

  const cardOptions = (m) => ({
    showBetForm: !!player,
    bet: _betCache[m.id] || null,
    allBets: _allBetsCache[m.id] || null
  })

  container.innerHTML = `
    <div class="section-header">
      <h1>Tipovačka</h1>
    </div>
    ${renderBankTicker(_currentBank)}
    ${currentDay && !isPastDeadline(currentDay) ? `
      <div class="deadline-banner" id="deadline-banner">
        <span class="deadline-banner-icon">⏱</span>
        <div class="deadline-banner-text">
          <div class="deadline-banner-label">Do uzávěrky tipů zbývá</div>
          <div class="deadline-banner-time" id="deadline-countdown">…</div>
          <div class="deadline-banner-day">${currentDay === today ? 'Dnes' : formatDateFull(currentDay)} · deadline ${getDeadlineTime(currentDay)}</div>
        </div>
      </div>
    ` : ''}
    ${renderWinnerBet(_winnerBets[player] || null, _winnerBets)}
    <div class="phase-tabs">
      <button class="phase-tab ${phase === 'group' ? 'active' : ''}" data-phase="group">
        Základní skupiny <span class="phase-count">${allMatches.filter(m => m.stage === 'group').length}</span>
      </button>
      <button class="phase-tab ${phase === 'knockout' ? 'active' : ''}" data-phase="knockout">
        Vyřazovací fáze <span class="phase-count">${allMatches.filter(m => m.stage !== 'group').length}</span>
      </button>
    </div>

    <!-- AKTUÁLNÍ DEN -->
    ${current.length > 0 ? `
      <div class="tip-section">
        <div class="tip-section-title tip-section-next">
          ${currentDay === today ? 'Dnes' : formatDateFull(currentDay)}
          <span style="float:right; font-size:12px; opacity:0.7;">${current.length} zápasů</span>
        </div>
        <div class="tip-day-matches">
          ${current.map(m => renderMatchCard(m, cardOptions(m))).join('')}
        </div>
      </div>
    ` : `
      <div class="tip-section">
        <div class="tip-section-title" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-dim);">
          ${finished.length === matches.length && matches.length > 0
            ? (phase === 'group' ? 'Skupiny odehrány' : 'Vyřazovací fáze odehrána')
            : 'Turnaj začíná 11. června 2026'}
        </div>
      </div>
    `}

    <!-- NADCHÁZEJÍCÍ -->
    ${upcomingDays.length > 0 ? `
      <details class="tip-section-collapsible" ${current.length === 0 ? 'open' : ''}>
        <summary class="tip-section-toggle">
          Nadcházející
          <span class="tip-section-count">${upcoming.length} zápasů</span>
        </summary>
        <div class="tip-collapsible-content">
          ${upcomingDays.map(date => `
            <div class="tip-day">
              <div class="tip-day-header">${formatDateFull(date)} <span class="tip-deadline">Deadline: ${getDeadlineTime(date)}</span></div>
              <div class="tip-day-matches">
                ${upcomingByDate.get(date).map(m =>
                  renderMatchCard(m, cardOptions(m))
                ).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}

    <!-- ODEHRÁNO -->
    ${finishedDays.length > 0 ? `
      <details class="tip-section-collapsible">
        <summary class="tip-section-toggle tip-section-played">
          Odehráno
          <span class="tip-section-count">${finished.length} zápasů</span>
        </summary>
        <div class="tip-collapsible-content">
          ${finishedDays.map(date => `
            <div class="tip-day">
              <div class="tip-day-header">${formatDateFull(date)} <span class="tip-deadline">Deadline: ${getDeadlineTime(date)}</span></div>
              <div class="tip-day-matches">
                ${finishedByDate.get(date).map(m =>
                  renderMatchCard(m, { ...cardOptions(m), showBetForm: false })
                ).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    ` : ''}
  `

  // Phase tabs
  container.querySelectorAll('.phase-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = `/?phase=${btn.dataset.phase}`
      renderDashboard(container)
    })
  })

  // Bet forms
  if (player) {
    initBetForms(container, async (matchId, homeScore, awayScore) => {
      try {
        const betService = await import('../services/betService.js')
        await betService.placeBet(matchId, player, homeScore, awayScore)
        // Překresli dashboard s aktuálními tipy
        renderDashboard(container)
      } catch (e) {
        console.warn('Firebase offline')
      }
    })
  }

  // Spusť countdown pro aktuální den (pokud existuje a deadline ještě neuplynul)
  let countdownCleanup = null
  if (currentDay && !isPastDeadline(currentDay)) {
    const el = container.querySelector('#deadline-countdown')
    if (el) countdownCleanup = startCountdown(currentDay, el)
  }

  // Init tip na vítěze
  if (player) {
    initWinnerBet(container, () => loadWinnerBetsAndRerender(container))
  }

  // Načti tipy z Firebase na pozadí (po renderu) a překresli
  if (player && matches.length > 0) {
    loadBetsAndRerender(matches, player, container)
  }
  loadWinnerBetsAndRerender(container)
  loadBankAndRerender(container)

  // Live Firebase listenery na tipy aktuálního dne (instant updates)
  if (current.length > 0) {
    setupLiveBetListeners(current, container)
  }

  // Auto-update — vyčisti starou subscription před přidáním nové
  if (_storeUnsubscribe) _storeUnsubscribe()
  _storeUnsubscribe = store.onChange(() => renderDashboard(container))

  return () => {
    if (_storeUnsubscribe) {
      _storeUnsubscribe()
      _storeUnsubscribe = null
    }
    if (countdownCleanup) countdownCleanup()
    // Vyčisti i live Firebase listenery
    for (const [id, unsub] of _liveListeners) {
      try { unsub() } catch (e) {}
      _liveListeners.delete(id)
    }
  }
}

let _bankLoadInProgress = false
async function loadBankAndRerender(container) {
  if (_bankLoadInProgress) return
  _bankLoadInProgress = true
  try {
    const result = await computeLiveStandings()
    const newBank = Math.round(result.currentBank)
    if (newBank !== _currentBank) {
      _currentBank = newBank
      renderDashboard(container)
    }
  } catch (e) {} finally {
    _bankLoadInProgress = false
  }
}

let _winnerLoadInProgress = false
async function loadWinnerBetsAndRerender(container) {
  if (_winnerLoadInProgress) return
  _winnerLoadInProgress = true
  try {
    const bets = await getWinnerBets()
    if (JSON.stringify(_winnerBets) !== JSON.stringify(bets)) {
      _winnerBets = bets
      renderDashboard(container)
    }
  } catch (e) {} finally {
    _winnerLoadInProgress = false
  }
}

let _loadInProgress = false
async function loadBetsAndRerender(matches, player, container) {
  if (_loadInProgress) return
  _loadInProgress = true
  let changed = false
  try {
    await Promise.all(matches.map(async (m) => {
      try {
        const [bet, allBets] = await Promise.all([
          getPlayerBet(m.id, player),
          getAllBets(m.id),
        ])
        if (bet && JSON.stringify(_betCache[m.id]) !== JSON.stringify(bet)) {
          _betCache[m.id] = bet
          changed = true
        }
        if (allBets && Object.keys(allBets).length > 0) {
          if (JSON.stringify(_allBetsCache[m.id]) !== JSON.stringify(allBets)) {
            _allBetsCache[m.id] = allBets
            changed = true
          }
        }
      } catch (e) {}
    }))
  } finally {
    _loadInProgress = false
  }
  if (changed) renderDashboard(container)
}

// Live listenery na bets pro current day matches
const _liveListeners = new Map()
function setupLiveBetListeners(matches, container) {
  // Vyčisti staré listenery které tu už nepatří
  for (const [matchId, unsub] of _liveListeners) {
    if (!matches.find(m => m.id === matchId)) {
      unsub()
      _liveListeners.delete(matchId)
    }
  }
  // Přidej nové
  matches.forEach(m => {
    if (_liveListeners.has(m.id)) return
    try {
      const unsub = onBetsChange(m.id, (bets) => {
        if (JSON.stringify(_allBetsCache[m.id]) !== JSON.stringify(bets)) {
          _allBetsCache[m.id] = bets
          renderDashboard(container)
        }
      })
      _liveListeners.set(m.id, unsub)
    } catch (e) {}
  })
}
