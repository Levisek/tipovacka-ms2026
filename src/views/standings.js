import { getPlayers } from '../services/auth.js'

export function renderStandings(container) {
  const players = getPlayers()
  const standings = players.map(name => ({
    name, balance: 0, correctTips: 0, totalBet: 0
  }))

  const podium = standings.slice(0, 3)

  container.innerHTML = `
    <div class="section-header">
      <h1>Žebříček</h1>
    </div>

    <div class="podium">
      ${podium.length >= 2 ? renderPodiumCard(podium[1], 2) : ''}
      ${podium.length >= 1 ? renderPodiumCard(podium[0], 1) : ''}
      ${podium.length >= 3 ? renderPodiumCard(podium[2], 3) : ''}
    </div>

    <table class="standings-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Hráč</th>
          <th>Správné tipy</th>
          <th>Bilance</th>
        </tr>
      </thead>
      <tbody>
        ${standings.map((p, i) => `
          <tr>
            <td class="rank rank-${i + 1}">${i + 1}.</td>
            <td style="font-weight: 600; color: var(--color-text);">${p.name}</td>
            <td>${p.correctTips}</td>
            <td style="color: ${p.balance > 0 ? 'var(--color-open)' : p.balance < 0 ? 'var(--color-locked)' : 'var(--color-text)'}; font-weight: 600;">
              ${p.balance > 0 ? '+' : ''}${p.balance} Kč
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <p style="color: var(--color-text-dim); text-align: center; margin-top: 24px;">
      Turnaj ještě nezačal. Žebříček se aktualizuje po prvním zápase.
    </p>
  `
}

function renderPodiumCard(player, rank) {
  const heights = { 1: '140px', 2: '100px', 3: '80px' }
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return `
    <div class="podium-card podium-${rank}">
      <div class="podium-medal">${medals[rank]}</div>
      <div class="podium-name">${player.name}</div>
      <div class="podium-balance">${player.balance > 0 ? '+' : ''}${player.balance} Kč</div>
      <div class="podium-bar" style="height: ${heights[rank]}"></div>
    </div>
  `
}
