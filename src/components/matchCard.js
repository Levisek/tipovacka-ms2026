import { getTeam, flagImg } from '../config/teams.js'
import { formatDateShort, formatTime, isPastDeadline, timeUntilDeadline, getDeadlineTime } from '../utils/date.js'
import { STAGE_NAMES } from '../config/schedule.js'

/**
 * Vykreslí kartu zápasu
 * @param {Object} match - data zápasu (z schedule.js nebo Firestore)
 * @param {Object} options - { showBetForm, bet, onBet, allBets }
 */
export function renderMatchCard(match, options = {}) {
  const home = getTeam(match.home)
  const away = getTeam(match.away)
  const hasResult = match.homeScore !== null && match.homeScore !== undefined
  const pastDeadline = isPastDeadline(match.date)
  const isLive = match.status === 'live'

  let statusBadge = ''
  if (hasResult && !isLive) {
    statusBadge = '<span class="badge badge-finished">Hotovo</span>'
  } else if (isLive) {
    statusBadge = '<span class="badge badge-live">Živě</span>'
  } else if (pastDeadline) {
    statusBadge = '<span class="badge badge-locked">Uzavřeno</span>'
  } else {
    const dlTime = getDeadlineTime(match.date)
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
        <div class="bet-locked-label">
          <span class="bet-check">✓</span> Tvůj tip
        </div>
        <div class="bet-locked-score">${options.bet.away}</div>
        ${canEdit ? `<button class="bet-edit-btn" data-match-id="${match.id}" title="Upravit tip" aria-label="Upravit">✎</button>` : ''}
      </div>
    `
  } else if (canEdit) {
    // Formulář pro nový tip
    betHtml = `
      <div class="bet-form" data-match-id="${match.id}">
        <div style="text-align: right">
          <input type="number" class="bet-input" data-side="home" min="0" max="20"
            value="" placeholder="-">
        </div>
        <button class="bet-submit" data-match-id="${match.id}">Tipni</button>
        <div>
          <input type="number" class="bet-input" data-side="away" min="0" max="20"
            value="" placeholder="-">
        </div>
      </div>
    `
  }

  // All bets — viditelné po deadline nebo když je výsledek
  let allBetsHtml = ''
  if (options.allBets && (pastDeadline || hasResult)) {
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
  }

  return `
    <div class="match-card" data-match-id="${match.id}">
      <div class="match-card-header">
        <span class="group-label">${stageLabel} · ${formatTime(match.kickoff)}</span>
        ${statusBadge}
      </div>
      <div class="match-teams">
        <div class="match-team home">
          <span class="flag">${flagImg(home.flag)}</span>
          <span class="name">${match.home}</span>
        </div>
        ${scoreHtml}
        <div class="match-team away">
          <span class="name">${match.away}</span>
          <span class="flag">${flagImg(away.flag)}</span>
        </div>
      </div>
      ${betHtml}
      ${allBetsHtml}
    </div>
  `
}
