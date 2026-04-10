import { computeLiveStandings } from '../services/standingsService.js'
import * as store from '../services/matchStore.js'

let _standingsUnsub = null

const STANDINGS_SNAPSHOT_KEY = 'ms2026_standings_snapshot'

function loadPrevSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(STANDINGS_SNAPSHOT_KEY) || '{}')
  } catch (e) { return {} }
}

function saveSnapshot(standings) {
  const snapshot = {}
  standings.forEach((p, i) => { snapshot[p.name] = i + 1 })
  localStorage.setItem(STANDINGS_SNAPSHOT_KEY, JSON.stringify(snapshot))
}

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

  // Pohyby v žebříčku — porovnání s předchozím snapshotem
  const prevSnapshot = loadPrevSnapshot()
  const movements = {}
  standings.forEach((p, i) => {
    const currentRank = i + 1
    const prevRank = prevSnapshot[p.name]
    if (prevRank == null) movements[p.name] = 'new'
    else if (prevRank > currentRank) movements[p.name] = 'up'
    else if (prevRank < currentRank) movements[p.name] = 'down'
    else movements[p.name] = 'same'
  })
  // Ulož aktuální snapshot pro příští srovnání
  if (anyTipsYet) saveSnapshot(standings)

  const renderMovement = (name) => {
    const m = movements[name]
    if (m === 'up') return '<span class="rank-mov up">▲</span>'
    if (m === 'down') return '<span class="rank-mov down">▼</span>'
    if (m === 'new') return '<span class="rank-mov new">●</span>'
    return '<span class="rank-mov same">–</span>'
  }

  const formatKc = (n) => `${Math.round(n)} Kč`

  container.innerHTML = `
    <div class="section-header">
      <h1>Žebříček</h1>
    </div>

    <div class="bank-hero">
      <div class="bank-hero-label">💰 Aktuální bank</div>
      <div class="bank-hero-amount">${formatKc(currentBank)}</div>
      <div class="bank-hero-sub">čeká na další správný tip</div>
    </div>

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
                <th></th>
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
                  <td>${renderMovement(p.name)}</td>
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
                <th></th>
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
                  <td>${renderMovement(p.name)}</td>
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

  // Auto-update při změně výsledků — vyčisti starou subscription
  if (_standingsUnsub) _standingsUnsub()
  _standingsUnsub = store.onChange(() => renderStandings(container))
  return () => {
    if (_standingsUnsub) { _standingsUnsub(); _standingsUnsub = null }
  }
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
