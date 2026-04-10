import { getMatch as getMatchById } from '../services/matchStore.js'
import { renderMatchCard } from '../components/matchCard.js'
import { initBetForms } from '../components/betForm.js'
import { startCountdown } from '../components/countdown.js'
import { getPlayerName } from '../services/auth.js'
import { placeBet, getPlayerBet, getAllBets } from '../services/betService.js'
import { navigate } from '../router.js'

export async function renderMatchDetail(container, params) {
  const match = getMatchById(params.id)
  if (!match) {
    container.innerHTML = '<h2>Zápas nenalezen</h2><a href="#/">Zpět</a>'
    return
  }

  const player = getPlayerName()
  let bet = null
  let allBets = {}

  if (player) {
    try {
      bet = await getPlayerBet(match.id, player)
      allBets = await getAllBets(match.id)
    } catch (e) {}
  }

  container.innerHTML = `
    <div class="match-detail-back">
      <a href="#/" class="back-link">← Zpět</a>
      <div id="countdown"></div>
    </div>
    <div class="match-detail-card">
      ${renderMatchCard(match, {
        showBetForm: !!player,
        bet,
        allBets
      })}
    </div>
    ${Object.keys(allBets).length > 0 ? `
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
                ${isCorrect ? '<span class="badge badge-finished">Správně!</span>' : ''}
              </div>
            `
          }).join('')}
        </div>
      </div>
    ` : ''}
  `

  const cleanupCountdown = startCountdown(match.date, document.getElementById('countdown'))

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
