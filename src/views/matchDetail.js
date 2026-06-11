import { getMatch as getMatchById } from '../services/matchStore.js'
import { isPastDeadline, bettingDayOf } from '../utils/date.js'
import { renderMatchCard } from '../components/matchCard.js'
import { initBetForms } from '../components/betForm.js'
import { startCountdown } from '../components/countdown.js'
import { getPlayerName } from '../services/auth.js'
import { placeBet, getPlayerBet, getAllBets } from '../services/betService.js'
import { computeLiveStandings } from '../services/standingsService.js'
import { navigate } from '../router.js'

export async function renderMatchDetail(container, params) {
  const match = getMatchById(params.id)
  if (!match) {
    container.innerHTML = '<h2>Zápas nenalezen</h2><a href="#/">Zpět</a>'
    return
  }

  const hasResult = match.homeScore !== null && match.homeScore !== undefined
  const revealed = isPastDeadline(bettingDayOf(match.date, match.kickoff)) || hasResult

  const player = getPlayerName()
  let bet = null
  let allBets = {}

  if (player) {
    try {
      bet = await getPlayerBet(match.id, player)
      allBets = await getAllBets(match.id)
    } catch (e) {}
  }

  // Historie banku — jen u dohraných zápasů (odvozeno z live výpočtu)
  let bankEvent = null
  if (match.status === 'finished') {
    try {
      const { bankEvents } = await computeLiveStandings()
      bankEvent = bankEvents[match.id] || null
    } catch (e) {}
  }
  const formatKc = (n) => `${Math.round(n)} Kč`

  container.innerHTML = `
    <div class="match-detail-back">
      <a href="#/" class="back-link">← Zpět</a>
      <div id="countdown" class="countdown-pill"></div>
    </div>
    <div class="match-detail-card">
      ${renderMatchCard(match, {
        showBetForm: !!player,
        bet,
        allBets
      })}
    </div>
    ${bankEvent ? `
      <div class="bank-history ${bankEvent.winners.length ? 'won' : 'carried'}">
        ${bankEvent.winners.length
          ? `💰 Bank <strong>${formatKc(bankEvent.pool)}</strong> bere <strong>${bankEvent.winners.join(' + ')}</strong>${bankEvent.winners.length > 1 ? ` (po ${formatKc(bankEvent.share)})` : ''}`
          : `💰 Bank ${formatKc(bankEvent.pool)} nikdo netrefil — přechází do dalšího zápasu`}
      </div>
    ` : ''}
    ${revealed && Object.keys(allBets).length > 0 ? `
      <div class="match-detail-section">
        <h3>Všechny tipy</h3>
        <div class="all-bets-detail">
          ${Object.entries(allBets).map(([p, b]) => {
            const isCorrect = match.homeScore !== null &&
              b.home === match.homeScore && b.away === match.awayScore
            return `
              <div class="bet-detail-row ${isCorrect ? 'correct' : ''}">
                <span class="bet-player">${p}</span>
                <span class="bet-tip">${b.home} : ${b.away}</span>
                ${isCorrect ? `<span class="badge badge-finished">Správně!${bankEvent ? ` +${formatKc(bankEvent.share)}` : ''}</span>` : ''}
              </div>
            `
          }).join('')}
        </div>
      </div>
    ` : ''}
  `

  const cleanupCountdown = startCountdown(bettingDayOf(match.date, match.kickoff), document.getElementById('countdown'))

  if (player) {
    initBetForms(container, async (matchId, homeScore, awayScore) => {
      try {
        await placeBet(matchId, player, homeScore, awayScore)
      } catch (e) {
        alert('Nepodařilo se uložit tip.')
      }
    })
  }

  return () => cleanupCountdown()
}
