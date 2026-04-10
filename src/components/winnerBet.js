import { TEAMS } from '../config/teams.js'
import { MATCHES } from '../config/schedule.js'
import { isPastDeadline } from '../utils/date.js'
import { placeWinnerBet, getWinnerBets } from '../services/betService.js'
import { getPlayerName } from '../services/auth.js'

const TOURNAMENT_BET = 100 // Kč

/**
 * Vrátí true pokud už proběhl deadline prvního zápasu turnaje
 */
function isWinnerLocked() {
  const firstMatch = [...MATCHES].sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0]
  if (!firstMatch) return false
  return isPastDeadline(firstMatch.date)
}

/**
 * Vykreslí sekci s tipem na vítěze
 * @param {string|null} myBet - aktuální tip hráče
 * @param {Object} allBets - všechny tipy { hráč: tým }
 */
export function renderWinnerBet(myBet, allBets) {
  const player = getPlayerName()
  const locked = isWinnerLocked()
  const teams = Object.keys(TEAMS).sort()

  const allBetsEntries = Object.entries(allBets || {})

  if (locked) {
    // Po deadline — rozbalovací s tabulkou všech tipů
    return `
      <details class="winner-bet winner-bet-locked">
        <summary>
          <span class="winner-bet-icon">🏆</span>
          <span>Tipy na vítěze turnaje</span>
          ${myBet ? `<span class="winner-bet-mine">Tvůj: <strong>${myBet}</strong></span>` : ''}
        </summary>
        <div class="winner-bet-content">
          ${allBetsEntries.length > 0 ? `
            <div class="winner-bets-list">
              ${allBetsEntries.map(([p, t]) => `
                <div class="winner-bet-row ${p === player ? 'mine' : ''}">
                  <span class="winner-bet-player">${p}</span>
                  <span class="winner-bet-team">${t}</span>
                </div>
              `).join('')}
            </div>
          ` : '<p style="color: var(--color-text-dim); padding: 12px;">Zatím žádné tipy.</p>'}
        </div>
      </details>
    `
  }

  // Před deadline — výrazné okno s dropdown
  return `
    <div class="winner-bet winner-bet-active">
      <div class="winner-bet-header">
        <span class="winner-bet-icon">🏆</span>
        <h2>Tip na vítěze turnaje</h2>
        <span class="winner-bet-price">${TOURNAMENT_BET} Kč</span>
      </div>
      <p class="winner-bet-desc">
        Tipni si, který tým vyhraje MS 2026. Tip lze měnit do začátku prvního zápasu.
        ${myBet ? `<br>Aktuální tip: <strong style="color: var(--color-gold);">${myBet}</strong>` : ''}
      </p>
      ${player ? `
        <div class="winner-bet-form">
          <select id="winner-team-select" class="bet-input">
            <option value="">— vyber tým —</option>
            ${teams.map(t => `<option value="${t}" ${t === myBet ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <button class="btn-admin btn-gold" id="winner-bet-submit">${myBet ? 'Změnit' : 'Tipnout'}</button>
        </div>
      ` : '<p style="color: var(--color-text-dim);">Pro tipnutí se přihlas jako hráč.</p>'}
      <div id="winner-bet-status"></div>
    </div>
  `
}

/**
 * Inicializuje event listenery pro tip na vítěze
 */
export function initWinnerBet(container, onChange) {
  const submitBtn = container.querySelector('#winner-bet-submit')
  if (!submitBtn) return
  submitBtn.addEventListener('click', async () => {
    const select = container.querySelector('#winner-team-select')
    const status = container.querySelector('#winner-bet-status')
    const team = select.value
    if (!team) {
      status.textContent = '✗ Vyber tým'
      status.style.color = 'var(--color-locked)'
      return
    }
    const player = getPlayerName()
    if (!player) return
    try {
      await placeWinnerBet(player, team)
      status.textContent = '✓ Uloženo'
      status.style.color = 'var(--color-open)'
      if (onChange) onChange()
    } catch (e) {
      status.textContent = '✗ Chyba: ' + e.message
      status.style.color = 'var(--color-locked)'
    }
  })
}
