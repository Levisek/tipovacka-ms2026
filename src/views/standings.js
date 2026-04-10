import { computeLiveStandings } from '../services/standingsService.js'
import * as store from '../services/matchStore.js'

export async function renderStandings(container) {
  // Skeleton hned
  container.innerHTML = `
    <div class="section-header">
      <h1>Žebříček</h1>
    </div>
    <p style="color: var(--color-text-dim); text-align: center; margin: 40px 0;">Načítám…</p>
  `

  let result
  try {
    result = await computeLiveStandings()
  } catch (e) {
    container.innerHTML = `
      <div class="section-header"><h1>Žebříček</h1></div>
      <p style="color: var(--color-locked);">Chyba načítání: ${e.message}</p>
    `
    return
  }

  const { standings, currentBank, totalDeposit, totalWon, actualWinner, tournamentFinished, winnerBets, winnerBank, eliminations } = result
  const podium = standings.slice(0, 3)
  const anyTipsYet = standings.some(p => p.correctTips > 0 || p.deposit > 0)

  const formatKc = (n) => `${Math.round(n)} Kč`

  container.innerHTML = `
    <div class="section-header">
      <h1>Žebříček</h1>
    </div>

    <div class="bank-hero">
      <div class="bank-hero-label">💰 Aktuální bank</div>
      <div class="bank-hero-amount">${formatKc(currentBank)}</div>
      <div class="bank-hero-sub">čeká na příští správný tip</div>
    </div>

    ${renderWinnerSection(winnerBank, winnerBets, eliminations, actualWinner, tournamentFinished)}

    <div class="standings-summary">
      <div class="standings-summary-item">
        <span class="label">Vyplaceno</span>
        <span class="value">${formatKc(totalWon)}</span>
      </div>
      <div class="standings-summary-item">
        <span class="label">Celkem vsazeno</span>
        <span class="value">${formatKc(totalDeposit)}</span>
      </div>
    </div>

    ${anyTipsYet ? `
      <div class="podium">
        ${podium.length >= 2 ? renderPodiumCard(podium[1], 2) : ''}
        ${podium.length >= 1 ? renderPodiumCard(podium[0], 1) : ''}
        ${podium.length >= 3 ? renderPodiumCard(podium[2], 3) : ''}
      </div>

      <!-- TABULKA 1: TIPY -->
      <div class="archive-stats">
        <h3>Správné tipy</h3>
        <div class="table-scroll">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Hráč</th>
                <th>Skupiny</th>
                <th>Vyřazovačka</th>
                <th>Celkem</th>
              </tr>
            </thead>
            <tbody>
              ${[...standings].sort((a,b) => b.correctTips - a.correctTips).map((p, i) => `
                <tr>
                  <td class="rank rank-${i + 1}">${i + 1}.</td>
                  <td style="font-weight: 600; color: var(--color-text);">${p.name}</td>
                  <td>${p.correctGroup}</td>
                  <td>${p.correctKo}</td>
                  <td style="font-weight: 700; color: var(--color-text);">${p.correctTips}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- TABULKA 2: KEŠ -->
      <div class="archive-stats">
        <h3>Finanční bilance</h3>
        <div class="table-scroll">
          <table class="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Hráč</th>
                <th>Skupiny</th>
                <th>Vyřazovačka</th>
                <th>Vklad</th>
                <th>Výhra</th>
                <th>Bilance</th>
              </tr>
            </thead>
            <tbody>
              ${standings.map((p, i) => `
                <tr>
                  <td class="rank rank-${i + 1}">${i + 1}.</td>
                  <td style="font-weight: 600; color: var(--color-text);">${p.name}</td>
                  <td style="color: var(--color-gold);">${formatKc(p.groupWin)}</td>
                  <td style="color: var(--color-gold);">${formatKc(p.koWin)}</td>
                  <td style="color: var(--color-text-dim);">${formatKc(p.deposit)}</td>
                  <td style="color: var(--color-gold); font-weight: 600;">${formatKc(p.totalWin)}</td>
                  <td style="color: ${p.balance > 0 ? 'var(--color-open)' : p.balance < 0 ? 'var(--color-locked)' : 'var(--color-text)'}; font-weight: 700;">
                    ${p.balance > 0 ? '+' : ''}${formatKc(p.balance)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${tournamentFinished && actualWinner ? `
        <p style="margin-top: 20px; text-align: center; color: var(--color-text-dim);">
          Vítěz turnaje: <strong style="color: var(--color-gold);">${actualWinner}</strong>
        </p>
      ` : ''}
    ` : `
      <p style="color: var(--color-text-dim); text-align: center; margin-top: 32px;">
        Turnaj ještě nezačal. Žebříček se aktualizuje po prvním zápase.
      </p>
    `}
  `

  // Auto-update při změně výsledků
  const unsubscribe = store.onChange(() => renderStandings(container))
  return () => unsubscribe()
}

function renderWinnerSection(winnerBank, winnerBets, eliminations, actualWinner, tournamentFinished) {
  const entries = Object.entries(winnerBets || {})
  return `
    <div class="winner-section">
      <div class="winner-section-header">
        <span class="winner-section-icon">🏆</span>
        <div class="winner-section-title-group">
          <h2>Tip na vítěze turnaje</h2>
          <span class="winner-section-sub">samostatný bank · 700 Kč carry-over z Eura 2024 + 100 Kč/hráč</span>
        </div>
        <div class="winner-section-bank">
          ${Math.round(winnerBank)} Kč
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
            ${entries.map(([player, team]) => {
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
              return `
                <tr class="${isEliminated ? 'eliminated' : ''}">
                  <td><strong>${player}</strong></td>
                  <td>${team}</td>
                  <td>${statusHtml}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>
      ` : '<p style="color: var(--color-text-dim); text-align: center; padding: 16px;">Zatím nikdo netipnul vítěze.</p>'}
    </div>
  `
}

function renderPodiumCard(player, rank) {
  const heights = { 1: '140px', 2: '100px', 3: '80px' }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return `
    <div class="podium-card podium-${rank}">
      <div class="podium-medal">${medals[rank]}</div>
      <div class="podium-name">${player.name}</div>
      <div class="podium-balance">${player.balance > 0 ? '+' : ''}${Math.round(player.balance)} Kč</div>
      <div class="podium-bar" style="height: ${heights[rank]}"></div>
    </div>
  `
}
