import { MATCHES, STAGE_NAMES } from '../config/schedule.js'
import { getPlayers } from '../services/auth.js'
import { formatDateShort } from '../utils/date.js'
import { getAllBets } from '../services/betService.js'
import { getTeam } from '../config/teams.js'
import * as store from '../services/matchStore.js'

// Pravidla MS 2026
const GROUP_BET = 10    // Kč za zápas
const KO_DAILY = 40     // Kč za den
const WINNER_BET = 100  // Kč za tip na vítěze

const groupMatches = MATCHES.filter(m => m.stage === 'group')
const koMatches = MATCHES.filter(m => m.stage !== 'group')

// Spočítej hrací dny ve vyřazovačce
const koDays = new Set(koMatches.map(m => m.date)).size

const ADMIN_PIN = '2026'
const ADMIN_KEY = 'ms2026_admin_auth'

export function renderAdmin(container) {
  // Kontrola hesla
  if (sessionStorage.getItem(ADMIN_KEY) !== 'true') {
    container.innerHTML = `
      <div class="section-header">
        <h1>Admin</h1>
      </div>
      <div class="admin-section" style="max-width: 320px; margin: 40px auto; text-align: center;">
        <h2>Zadej heslo</h2>
        <div class="admin-form" style="margin-top: 16px;">
          <input type="password" id="admin-pin" class="bet-input" style="width: 100%; font-size: 16px;" placeholder="PIN">
          <button class="btn-admin btn-gold" id="btn-admin-login">Vstoupit</button>
          <div id="pin-error" style="color: var(--color-locked); font-size: 13px;"></div>
        </div>
      </div>
    `
    document.getElementById('btn-admin-login').addEventListener('click', () => {
      const pin = document.getElementById('admin-pin').value
      if (pin === ADMIN_PIN) {
        sessionStorage.setItem(ADMIN_KEY, 'true')
        renderAdmin(container)
      } else {
        document.getElementById('pin-error').textContent = 'Špatné heslo'
      }
    })
    document.getElementById('admin-pin').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('btn-admin-login').click()
    })
    return
  }

  const players = getPlayers()
  const groupDeposit = groupMatches.length * GROUP_BET // 48 × 10 = 480
  const koDeposit = koDays * KO_DAILY
  const totalDeposit = groupDeposit + koDeposit + WINNER_BET

  container.innerHTML = `
    <div class="section-header">
      <h1>Admin</h1>
    </div>

    <!-- PLATBY -->
    <div class="admin-section">
      <h2>Přehled plateb</h2>
      <p style="color: var(--color-text-dim); margin-bottom: 12px;">
        Skupiny: ${groupMatches.length} zápasů × ${GROUP_BET} Kč = <strong>${groupDeposit} Kč</strong><br>
        Vyřazovačka: ${koDays} hracích dnů × ${KO_DAILY} Kč = <strong>${koDeposit} Kč</strong><br>
        Tip na vítěze: <strong>${WINNER_BET} Kč</strong><br>
        <br>
        Celkem na hráče: <strong style="color: var(--color-gold);">${totalDeposit} Kč</strong>
        (platba ve 2 částech)
      </p>

      <h3 style="margin: 16px 0 8px;">1. platba — Základní skupiny + vítěz</h3>
      <p style="color: var(--color-text-dim); margin-bottom: 8px;">
        ${groupDeposit + WINNER_BET} Kč (${groupDeposit} skupiny + ${WINNER_BET} vítěz) — splatné do začátku turnaje
      </p>
      <div class="payment-grid">
        ${players.map(p => `
          <div class="payment-row">
            <span>${p}</span>
            <span class="payment-amount">${groupDeposit + WINNER_BET} Kč</span>
            <label class="payment-check">
              <input type="checkbox" data-player="${p}" data-phase="groups">
              <span>Zaplaceno</span>
            </label>
          </div>
        `).join('')}
      </div>

      <h3 style="margin: 16px 0 8px;">2. platba — Vyřazovací fáze</h3>
      <p style="color: var(--color-text-dim); margin-bottom: 8px;">
        ${koDeposit} Kč — splatné do začátku vyřazovačky
      </p>
      <div class="payment-grid">
        ${players.map(p => `
          <div class="payment-row">
            <span>${p}</span>
            <span class="payment-amount">${koDeposit} Kč</span>
            <label class="payment-check">
              <input type="checkbox" data-player="${p}" data-phase="knockout">
              <span>Zaplaceno</span>
            </label>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- SEED -->
    <div class="admin-section">
      <h2>Stáhnout výsledky z API</h2>
      <p style="color: var(--color-text-dim); margin-bottom: 12px;">
        Stáhne aktuální výsledky z football-data.org a aktualizuje rozpis.
      </p>
      <button class="btn-admin" id="btn-seed">Stáhnout výsledky</button>
      <div id="seed-status"></div>
    </div>

    <!-- TIPY HRÁČŮ -->
    <div class="admin-section">
      <h2>Tipy hráčů</h2>
      <p style="color: var(--color-text-dim); font-size: 13px; margin-bottom: 12px;">
        Všechny uložené tipy z Firebase
        <button class="btn-admin" id="btn-load-bets" style="margin-left: 8px; padding: 4px 10px; font-size: 12px;">Obnovit</button>
      </p>
      <div id="bets-log" class="admin-log" style="margin-top: 12px;">
        <p style="color: var(--color-text-dim);">Načítám...</p>
      </div>
    </div>

    <!-- RUČNÍ ZADÁNÍ VÝSLEDKU -->
    <div class="admin-section">
      <h2>Zadat výsledek ručně</h2>
      <p style="color: var(--color-text-dim); font-size: 13px; margin-bottom: 12px;">
        Vyber zápas a zadej skóre.
      </p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <select id="result-match-select" class="bet-input" style="flex: 1; min-width: 240px;">
          <option value="">— vyber zápas —</option>
          ${[...store.getAllMatches()].sort((a,b) => (a.date||'').localeCompare(b.date||'') || a.kickoff.localeCompare(b.kickoff)).map(m => {
            const hasResult = m.homeScore !== null && m.homeScore !== undefined
            const label = `${formatDateShort(m.date)} ${m.kickoff} — ${m.home} vs ${m.away}${hasResult ? ` (${m.homeScore}:${m.awayScore})` : ''}`
            return `<option value="${m.id}">${label}</option>`
          }).join('')}
        </select>
        <input type="number" id="result-home" class="bet-input" min="0" max="20" placeholder="0" style="width: 60px;">
        <span style="font-weight: 700;">:</span>
        <input type="number" id="result-away" class="bet-input" min="0" max="20" placeholder="0" style="width: 60px;">
        <button class="btn-admin btn-gold" id="btn-save-result">Uložit</button>
      </div>
      <div id="result-status" style="margin-top: 8px; font-size: 13px;"></div>
    </div>

  `

  // Ruční zadání výsledku
  document.getElementById('btn-save-result').addEventListener('click', () => {
    const select = document.getElementById('result-match-select')
    const homeEl = document.getElementById('result-home')
    const awayEl = document.getElementById('result-away')
    const status = document.getElementById('result-status')
    const matchId = select.value
    const home = parseInt(homeEl.value)
    const away = parseInt(awayEl.value)

    if (!matchId) {
      status.textContent = '✗ Vyber zápas'
      status.style.color = 'var(--color-locked)'
      return
    }
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      status.textContent = '✗ Zadej platné skóre'
      status.style.color = 'var(--color-locked)'
      return
    }

    const match = store.getMatch(matchId)
    if (!match) {
      status.textContent = '✗ Zápas nenalezen'
      status.style.color = 'var(--color-locked)'
      return
    }

    store.updateResult(matchId, home, away, 'finished')
    status.textContent = `✓ Uloženo: ${match.home} ${home} : ${away} ${match.away}`
    status.style.color = 'var(--color-open)'
    homeEl.value = ''
    awayEl.value = ''
    select.value = ''
  })

  // Načíst tipy hráčů z Firebase
  async function loadBets() {
    const logEl = document.getElementById('bets-log')
    if (!logEl) return
    logEl.innerHTML = '<p style="color: var(--color-text-dim);">Načítám...</p>'
    try {
      const results = await Promise.all(MATCHES.map(async (m) => {
        const bets = await getAllBets(m.id)
        return { match: m, bets }
      }))
      const withBets = results.filter(r => Object.keys(r.bets).length > 0)
      if (withBets.length === 0) {
        logEl.innerHTML = '<p style="color: var(--color-text-dim); font-size: 13px;">Zatím žádné tipy.</p>'
        return
      }
      // Seřaď podle data
      withBets.sort((a, b) => (a.match.date || '').localeCompare(b.match.date || ''))
      logEl.innerHTML = withBets.map(({ match, bets }) => {
        const matchLabel = `${match.home} vs ${match.away}`
        const dateLabel = formatDateShort(match.date)
        return `
          <div class="log-entry" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="display: flex; gap: 10px; width: 100%;">
              <span class="log-time">${dateLabel}</span>
              <span class="log-match">${matchLabel}</span>
            </div>
            <div style="padding-left: 8px; font-size: 12px;">
              ${Object.entries(bets).map(([player, b]) => `
                <div><strong style="color: var(--color-text);">${player}</strong>: ${b.home} : ${b.away}</div>
              `).join('')}
            </div>
          </div>
        `
      }).join('')
    } catch (e) {
      logEl.innerHTML = `<p style="color: var(--color-locked);">Chyba: ${e.message}</p>`
    }
  }
  document.getElementById('btn-load-bets').addEventListener('click', loadBets)
  loadBets() // automaticky při otevření

  // Stáhnout výsledky z API
  document.getElementById('btn-seed').addEventListener('click', async () => {
    const status = document.getElementById('seed-status')
    status.textContent = 'Stahuji z API...'
    try {
      const { fetchAllResults } = await import('../services/resultService.js')
      const result = await fetchAllResults()
      if (result.error) {
        status.textContent = '✗ ' + result.error
        status.style.color = 'var(--color-locked)'
      } else {
        status.textContent = `✓ Spárováno ${result.matched} zápasů, aktualizováno ${result.updated} výsledků.`
        status.style.color = 'var(--color-open)'
      }
    } catch (e) {
      status.textContent = '✗ Chyba: ' + e.message
      status.style.color = 'var(--color-locked)'
    }
  })

}
