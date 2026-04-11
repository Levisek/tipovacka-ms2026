import { computePlayerStats } from '../services/playerStatsService.js'
import { getPlayers } from '../services/auth.js'
import { HOME_TEAM } from '../config/teams.js'
import archive2022 from '../config/archive2022.json'
import archiveEuro2024 from '../config/archiveEuro2024.json'
import * as store from '../services/matchStore.js'
import { onBetsChange } from '../services/betService.js'

let _profileUnsub = null
let _profileBetUnsubs = []

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

      ${stats.longestMissStreak > 0 ? `
        <div class="profile-fun-item">
          <span class="profile-fun-icon">💀</span>
          <div>
            <div class="profile-fun-label">Nejdelší šňůra netrefení</div>
            <div class="profile-fun-value">
              <strong>${stats.longestMissStreak} zápasů</strong> v řadě bez přesného tipu
              ${stats.currentMissStreak > 0 ? `<span style="color: var(--color-text-dim);"> · aktuálně netrefil ${stats.currentMissStreak}×</span>` : ''}
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

  // ===== LIVE UPDATES =====
  // Vyčisti staré subscriptions (pokud byly z předchozího renderu)
  if (_profileUnsub) { _profileUnsub(); _profileUnsub = null }
  _profileBetUnsubs.forEach(u => { try { u() } catch (e) {} })
  _profileBetUnsubs = []

  // 1) Sleduj změny matchStore (zadání výsledků)
  _profileUnsub = store.onChange(() => renderPlayerProfile(container, params))

  // 2) Sleduj změny tipů přes Firebase live listenery (jen pro MS 2026 zápasy)
  if (isCurrentPlayer) {
    const allMatches = store.getAllMatches()
    let pending = false
    allMatches.forEach(m => {
      try {
        const unsub = onBetsChange(m.id, () => {
          if (pending) return
          pending = true
          // Throttle: re-render až po 500ms aby se neudělalo 100 renderů zaráz
          setTimeout(() => {
            pending = false
            renderPlayerProfile(container, params)
          }, 500)
        })
        _profileBetUnsubs.push(unsub)
      } catch (e) {}
    })
  }

  // Cleanup return — router ho zavolá při změně routy
  return () => {
    if (_profileUnsub) { _profileUnsub(); _profileUnsub = null }
    _profileBetUnsubs.forEach(u => { try { u() } catch (e) {} })
    _profileBetUnsubs = []
  }
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
