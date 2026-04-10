import { computeLiveStandings, RULES_2026 } from '../services/standingsService.js'
import { renderWinnerBet, initWinnerBet } from '../components/winnerBet.js'
import { getPlayerName } from '../services/auth.js'
import * as store from '../services/matchStore.js'

let _winnerUnsub = null

export async function renderWinner(container) {
  container.innerHTML = `
    <div class="section-header">
      <h1>Tip na vítěze turnaje</h1>
    </div>
    <p style="color: var(--color-text-dim); text-align: center; margin: 40px 0;">Načítám…</p>
  `

  let result
  try {
    result = await computeLiveStandings()
  } catch (e) {
    container.innerHTML = `
      <div class="section-header"><h1>Tip na vítěze turnaje</h1></div>
      <p style="color: var(--color-locked);">Chyba načítání: ${e.message}</p>
    `
    return
  }

  const { winnerBets, winnerBank, eliminations, actualWinner, tournamentFinished } = result
  const player = getPlayerName()
  const myBet = winnerBets[player] || null
  const entries = Object.entries(winnerBets || {})

  container.innerHTML = `
    <div class="section-header">
      <h1>Tip na vítěze turnaje</h1>
    </div>

    <!-- BANK NA VÍTĚZE -->
    <div class="bank-hero">
      <div class="bank-hero-label">🏆 Bank na vítěze</div>
      <div class="bank-hero-amount">${Math.round(winnerBank)} Kč</div>
      <div class="bank-hero-sub">přenos ${RULES_2026.winnerBankCarryOver} Kč z Eura 2024</div>
    </div>

    <!-- TIPOVÁNÍ (před deadline) / PŘEHLED (po deadline) -->
    <div id="winner-bet-area">
      ${renderWinnerBet(myBet, winnerBets)}
    </div>

    <!-- TABULKA TIPŮ -->
    <div class="winner-section">
      <div class="winner-section-header">
        <span class="winner-section-icon">📋</span>
        <div class="winner-section-title-group">
          <h2>Tipy hráčů</h2>
          <span class="winner-section-sub">${entries.length} tipů celkem</span>
        </div>
      </div>
      ${entries.length > 0 ? `
        <table class="winner-section-table">
          <thead>
            <tr>
              <th>Hráč</th>
              <th>Tipovaný tým</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([p, team]) => {
              const isCorrect = tournamentFinished && team === actualWinner
              const isEliminated = eliminations[team] === 'eliminated'
              let statusHtml
              if (isCorrect) {
                statusHtml = '<span class="winner-status correct">🏆 Vítěz!</span>'
              } else if (isEliminated) {
                statusHtml = '<span class="winner-status out">❌ Vypadl</span>'
              } else {
                statusHtml = '<span class="winner-status in">✓ Ve hře</span>'
              }
              const isMine = p === player
              return `
                <tr class="${isEliminated ? 'eliminated' : ''} ${isMine ? 'mine' : ''}">
                  <td><strong>${p}</strong>${isMine ? ' <span style="color: var(--color-text-dim); font-size: 11px;">(ty)</span>' : ''}</td>
                  <td>${team}</td>
                  <td>${statusHtml}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      ` : '<p style="color: var(--color-text-dim); text-align: center; padding: 16px;">Zatím nikdo netipoval vítěze.</p>'}
    </div>
  `

  // Aktivuj tipovací formulář (pokud je hráč přihlášený a deadline neuplynul)
  if (player) {
    initWinnerBet(container.querySelector('#winner-bet-area'), () => renderWinner(container))
  }

  // Auto-update při změně výsledků — vyčisti starou subscription
  if (_winnerUnsub) _winnerUnsub()
  _winnerUnsub = store.onChange(() => renderWinner(container))
  return () => {
    if (_winnerUnsub) { _winnerUnsub(); _winnerUnsub = null }
  }
}
