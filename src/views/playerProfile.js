import { computePlayerStats } from '../services/playerStatsService.js'
import { getPlayers } from '../services/auth.js'
import { HOME_TEAM } from '../config/teams.js'
import archive2022 from '../config/archive2022.json'
import archiveEuro2024 from '../config/archiveEuro2024.json'

export async function renderPlayerProfile(container, params) {
  const playerName = decodeURIComponent(params.name || '')

  // Validace — hráč musí existovat alespoň v jednom z archivů nebo aktuálním seznamu
  const allKnownPlayers = new Set([
    ...getPlayers(),
    ...(archive2022.players || []),
    ...(archiveEuro2024.players || []),
  ])
  if (!allKnownPlayers.has(playerName)) {
    container.innerHTML = `
      <div class="section-header"><h1>Hráč nenalezen</h1></div>
      <p style="color: var(--color-text-dim);">Hráč "${playerName}" neexistuje. <a href="#/standings">Zpět na žebříček</a></p>
    `
    return
  }
  const isCurrentPlayer = getPlayers().includes(playerName)

  container.innerHTML = `
    <div class="section-header">
      <h1>Profil: ${playerName}</h1>
    </div>
    <p style="color: var(--color-text-dim); text-align: center; margin: 40px 0;">Načítám statistiky…</p>
  `

  let stats
  try {
    stats = await computePlayerStats(playerName)
  } catch (e) {
    container.innerHTML = `
      <div class="section-header"><h1>Profil: ${playerName}</h1></div>
      <p style="color: var(--color-locked);">Chyba: ${e.message}</p>
    `
    return
  }

  const fmt = (n) => `${Math.round(n)} Kč`
  const cur = stats.current
  const balance = cur.standingsEntry?.balance ?? 0

  container.innerHTML = `
    <div class="section-header">
      <h1>👤 ${stats.name}</h1>
      <a href="#/standings" style="color: var(--color-text-dim); font-size: 13px;">← zpět</a>
    </div>

    <!-- AKTUÁLNÍ MS 2026 -->
    ${isCurrentPlayer ? `
    <div class="profile-section">
      <h2>🏆 MS 2026 — aktuální</h2>
      <div class="profile-stats-grid">
        <div class="profile-stat">
          <div class="profile-stat-label">Pozice</div>
          <div class="profile-stat-value">${cur.rank ? `${cur.rank}.` : '–'}<span class="profile-stat-sub"> z ${cur.totalPlayers}</span></div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-label">Bilance</div>
          <div class="profile-stat-value" style="color: ${balance > 0 ? 'var(--color-open)' : balance < 0 ? 'var(--color-locked)' : 'var(--color-text)'};">
            ${balance > 0 ? '+' : ''}${fmt(balance)}
          </div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-label">Tipnuto</div>
          <div class="profile-stat-value">${cur.tipsCount}<span class="profile-stat-sub"> zápasů</span></div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-label">Trefeno</div>
          <div class="profile-stat-value">${cur.correctCount}<span class="profile-stat-sub"> · ${cur.successRate}%</span></div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-label">Výhry</div>
          <div class="profile-stat-value" style="color: var(--color-gold);">${fmt(cur.standingsEntry?.totalWin ?? 0)}</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-label">Vklad</div>
          <div class="profile-stat-value" style="color: var(--color-text-dim);">${fmt(cur.standingsEntry?.deposit ?? 0)}</div>
        </div>
      </div>

      ${cur.winnerBet2026 ? `
        <p style="margin-top: 12px; font-size: 14px;">
          <strong>Tip na vítěze MS 2026:</strong>
          <span style="color: var(--color-gold);">${cur.winnerBet2026}${cur.winnerBet2026 === HOME_TEAM ? ' 🇨🇿' : ''}</span>
        </p>
      ` : '<p style="margin-top: 12px; font-size: 13px; color: var(--color-text-dim);">Zatím netipnul vítěze turnaje.</p>'}

      ${cur.topCoWinner ? `
        <p style="margin-top: 8px; font-size: 14px;">
          <strong>👯 Nejčastější parťák do banku:</strong>
          <span style="color: var(--color-accent);">${cur.topCoWinner.name}</span>
          <span style="color: var(--color-text-dim);">(spolu trefili ${cur.topCoWinner.count}× zápas)</span>
        </p>
      ` : ''}
    </div>
    ` : `
    <div class="profile-section">
      <p style="color: var(--color-text-dim); text-align: center; padding: 12px;">
        Tento hráč se MS 2026 neúčastní — historické statistiky níže.
      </p>
    </div>
    `}

    <!-- HISTORIE -->
    <div class="profile-section">
      <h2>📜 Historie</h2>
      <div class="profile-history">
        ${renderArchiveBox(stats.history.ms2022)}
        ${renderArchiveBox(stats.history.euro2024)}
      </div>
    </div>

    <!-- SRANDA -->
    <div class="profile-section profile-fun">
      <h2>😄 Sranda statistiky</h2>

      ${stats.worstTip ? `
        <div class="profile-fun-item">
          <span class="profile-fun-icon">💀</span>
          <div>
            <div class="profile-fun-label">Nejhorší tip ever</div>
            <div class="profile-fun-value">
              ${stats.worstTip.match}: tipnul <strong>${stats.worstTip.tip}</strong>,
              skutečnost <strong>${stats.worstTip.result}</strong>
              <span style="color: var(--color-text-dim);">(rozdíl ${stats.worstTip.diff} branek · ${stats.worstTip.source})</span>
            </div>
          </div>
        </div>
      ` : ''}

      ${stats.favoriteResult ? `
        <div class="profile-fun-item">
          <span class="profile-fun-icon">🎯</span>
          <div>
            <div class="profile-fun-label">Oblíbený výsledek</div>
            <div class="profile-fun-value"><strong>${stats.favoriteResult.score}</strong> — tipnuto ${stats.favoriteResult.count}×</div>
          </div>
        </div>
      ` : ''}
    </div>
  `
}

function renderArchiveBox(arch) {
  if (!arch.participated) {
    return `
      <div class="profile-archive-box">
        <h3>${arch.label}</h3>
        <p style="color: var(--color-text-dim); font-size: 13px;">Nehrál.</p>
      </div>
    `
  }
  return `
    <div class="profile-archive-box">
      <h3>${arch.label}</h3>
      <div class="profile-archive-row"><span>Tipy</span><strong>${arch.tips} <span style="color: var(--color-text-dim);">(${arch.correct} správně · ${arch.successRate}%)</span></strong></div>
      <div class="profile-archive-row"><span>Výhry skupiny</span><strong style="color: var(--color-gold);">${arch.groupWon} Kč</strong></div>
      <div class="profile-archive-row"><span>Výhry vyřazovačka</span><strong style="color: var(--color-gold);">${arch.koWon} Kč</strong></div>
      <div class="profile-archive-row"><span>Celkem</span><strong style="color: var(--color-gold);">${arch.totalWon} Kč</strong></div>
      ${arch.winnerTip ? `
        <div class="profile-archive-row">
          <span>Tip na vítěze</span>
          <strong style="color: ${arch.winnerCorrect ? 'var(--color-gold)' : 'var(--color-text-dim)'};">
            ${arch.winnerTip}${arch.winnerCorrect ? ' 🏆' : ` (skutečně ${arch.actualWinner})`}
          </strong>
        </div>
      ` : ''}
    </div>
  `
}
