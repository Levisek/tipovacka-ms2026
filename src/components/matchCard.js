import { getTeam, flagImg, HOME_TEAM } from '../config/teams.js'
import { formatDateShort, formatTime, isPastDeadline, timeUntilDeadline, getDeadlineTime, bettingDayOf } from '../utils/date.js'
import { STAGE_NAMES } from '../config/schedule.js'
import { MAX_SCORE } from '../config/constants.js'

/**
 * Label live badge: "Živě 57'" / "Poločas" / "Prodloužení 105'" / "Penalty".
 * U čistě číselné minuty přičítá čas uplynulý od posledního syncu (updatedAt),
 * ať badge mezi syncy (~4 min throttle) nezamrzá. Přesné nastavení neznáme,
 * takže po překročení hranice půle ukazuje "45'+" / "90'+" / "120'+".
 */
export function liveBadgeLabel(minute, updatedAt) {
  if (minute === 'HT') return 'Poločas'
  if (minute === 'PEN') return 'Penalty'
  if (!minute) return 'Živě'
  const m = /^(\d+)'$/.exec(minute)
  if (!m) return `Živě ${minute}` // "45'+2'" apod. — netikat
  const synced = parseInt(m[1], 10)
  let shown = synced
  if (updatedAt) {
    const elapsedMin = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)
    if (elapsedMin > 0 && elapsedMin < 60) shown += elapsedMin // sanity cap — starý updatedAt netikat do nesmyslů
  }
  let label = `${shown}'`
  if (synced <= 45 && shown > 45) label = "45'+"
  else if (synced > 45 && synced <= 90 && shown > 90) label = "90'+"
  else if (shown > 120) label = "120'+"
  return (synced > 90 ? 'Prodloužení ' : 'Živě ') + label
}

/**
 * Globální ticker: jednou za 30 s přepočítá texty všech live badge na
 * stránce z data atributů — bez re-renderu dashboardu (ten by znovu
 * odpálil Firestore loady, viz incident 2026-04-11).
 */
export function initLiveMinuteTicker() {
  setInterval(() => {
    document.querySelectorAll('.badge-live[data-minute]').forEach(el => {
      el.textContent = liveBadgeLabel(el.dataset.minute || null, el.dataset.updated || null)
    })
  }, 30 * 1000)
}

/**
 * Vykreslí kartu zápasu
 * @param {Object} match - data zápasu (z schedule.js nebo Firestore)
 * @param {Object} options - { showBetForm, bet, onBet, allBets }
 */
export function renderMatchCard(match, options = {}) {
  const home = getTeam(match.home)
  const away = getTeam(match.away)
  const hasResult = match.homeScore !== null && match.homeScore !== undefined
  const bday = bettingDayOf(match.date, match.kickoff)
  const pastDeadline = isPastDeadline(bday)
  const isLive = match.status === 'live'
  const isHomeOurs = match.home === HOME_TEAM
  const isAwayOurs = match.away === HOME_TEAM
  const isOurMatch = isHomeOurs || isAwayOurs

  let statusBadge = ''
  if (hasResult && !isLive) {
    statusBadge = '<span class="badge badge-finished">Hotovo</span>'
  } else if (isLive) {
    // minute plní sync server; data atributy čte initLiveMinuteTicker
    statusBadge = `<span class="badge badge-live" data-minute="${match.minute || ''}" data-updated="${match.updatedAt || ''}">${liveBadgeLabel(match.minute, match.updatedAt)}</span>`
  } else if (pastDeadline) {
    statusBadge = '<span class="badge badge-locked">Uzavřeno</span>'
  } else {
    const dlTime = getDeadlineTime(bday)
    statusBadge = `<span class="badge badge-open">Tip do ${dlTime}</span>`
  }

  const stageLabel = match.group
    ? `Skupina ${match.group}`
    : (STAGE_NAMES[match.stage] || match.stage)

  const scoreHtml = hasResult
    ? `<div class="match-score">
        <span>${match.homeScore}</span>
        <span class="separator">:</span>
        <span>${match.awayScore}</span>
      </div>`
    : `<div class="match-score pending">vs</div>`

  // Bet form / locked tip
  let betHtml = ''
  const hasBet = options.bet && options.bet.home !== null && options.bet.home !== undefined
  const canEdit = options.showBetForm && !pastDeadline && !hasResult

  if (hasBet && (canEdit || pastDeadline || hasResult)) {
    // Zamčený tip — s tužkou pokud lze upravit
    betHtml = `
      <div class="bet-form bet-locked" data-match-id="${match.id}">
        <div class="bet-locked-score">${options.bet.home}</div>
        <div class="bet-locked-label">Tvůj tip</div>
        <div class="bet-locked-score">${options.bet.away} <span class="bet-check">✓</span></div>
        ${canEdit ? `<button class="bet-edit-btn" data-match-id="${match.id}" title="Upravit tip" aria-label="Upravit">✎</button>` : ''}
      </div>
    `
  } else if (canEdit) {
    // Formulář pro nový tip
    betHtml = `
      <div class="bet-form" data-match-id="${match.id}">
        <div style="text-align: right">
          <input type="number" class="bet-input" data-side="home" min="0" max="${MAX_SCORE}"
            value="" placeholder="-">
        </div>
        <button class="bet-submit" data-match-id="${match.id}">Tipni</button>
        <div>
          <input type="number" class="bet-input" data-side="away" min="0" max="${MAX_SCORE}"
            value="" placeholder="-">
        </div>
      </div>
    `
  }

  // Tipy ostatních: SKÓRE se ukáže až po deadline / při výsledku.
  // Před deadline jen KONTROLA ÚČASTI — kdo už tipnul, bez skóre.
  let allBetsHtml = ''
  const revealed = pastDeadline || hasResult
  if (options.allBets && revealed) {
    const betsEntries = Object.entries(options.allBets)
    if (betsEntries.length > 0) {
      // Pomocná funkce: může tento tip ještě trefit přesný výsledek?
      // Pravidlo: pokud aktuální skóre už přesahuje tip, nelze vyhrát.
      const canStillWin = (bet) => {
        if (!hasResult) return true
        if (isLive) {
          return bet.home >= match.homeScore && bet.away >= match.awayScore
        }
        return bet.home === match.homeScore && bet.away === match.awayScore
      }

      allBetsHtml = `
        <div class="all-bets">
          ${betsEntries.map(([player, bet]) => {
            const isCorrect = hasResult && !isLive && bet.home === match.homeScore && bet.away === match.awayScore
            const eliminated = (isLive || hasResult) && !canStillWin(bet) && !isCorrect
            return `<div class="bet-row ${isCorrect ? 'correct' : ''} ${eliminated ? 'eliminated' : ''}">
              <span class="bet-player">${player}${eliminated ? ' ❌' : ''}</span>
              <span class="bet-tip">${bet.home} : ${bet.away}</span>
            </div>`
          }).join('')}
        </div>
      `
    }
  } else if (options.allBets) {
    const tipped = Object.keys(options.allBets)
    if (tipped.length > 0) {
      allBetsHtml = `
        <div class="all-bets bets-roster">
          ${tipped.map(p => `<span class="bet-row"><span class="bet-player">${p}</span><span class="bet-check">✓ tipnuto</span></span>`).join('')}
        </div>
      `
    }
  }

  return `
    <div class="match-card${isOurMatch ? ' our-team' : ''}" data-match-id="${match.id}">
      <div class="match-card-header">
        <span class="group-label">${stageLabel} · ${formatTime(match.kickoff)}</span>
        ${statusBadge}
      </div>
      <div class="match-teams">
        <div class="match-team home${isHomeOurs ? ' our-team-side' : ''}">
          <span class="flag">${flagImg(home.flag)}</span>
          <span class="name">${match.home}</span>
        </div>
        ${scoreHtml}
        <div class="match-team away${isAwayOurs ? ' our-team-side' : ''}">
          <span class="name">${match.away}</span>
          <span class="flag">${flagImg(away.flag)}</span>
        </div>
      </div>
      ${betHtml}
      ${allBetsHtml}
    </div>
  `
}
