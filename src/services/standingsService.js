/**
 * Live výpočet žebříčku z reálných výsledků zápasů a tipů hráčů.
 *
 * Pravidla:
 * - Skupiny: 20 Kč/zápas, KO: 40 Kč/zápas, vítěz: 100 Kč
 * - Bank zápasu = počet tipnutých × sázka + carry z předchozího zápasu
 * - Trefa → výhra (rozdělená pokud trefí víc), bank se vynuluje
 * - Nikdo netrefí → bank přechází do dalšího zápasu
 * - Bank ze skupin přechází do vyřazovací fáze
 */
import * as store from './matchStore.js'
import { getAllBets, getWinnerBets } from './betService.js'
import { getPlayers } from './auth.js'

export const RULES_2026 = {
  groupBet: 20,
  koMatchBet: 40,
  winnerBet: 100,
}

/**
 * Vypočítá live žebříček.
 * @returns {Promise<{ standings: Array, currentBank: number, totalDeposit: number, totalWon: number }>}
 */
export async function computeLiveStandings() {
  const players = getPlayers()
  const allMatches = store.getAllMatches()

  // Inicializace statistik
  const stats = {}
  players.forEach(p => {
    stats[p] = {
      name: p,
      correctGroup: 0,
      correctKo: 0,
      groupWin: 0,
      koWin: 0,
      winnerBonus: 0,
      deposit: 0,
    }
  })

  // Seřadit zápasy: nejdřív skupiny, pak KO, chronologicky
  const groupMatches = allMatches
    .filter(m => m.stage === 'group')
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.kickoff || '').localeCompare(b.kickoff || ''))
  const koMatches = allMatches
    .filter(m => m.stage !== 'group')
    .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.kickoff || '').localeCompare(b.kickoff || ''))

  // Načti všechny tipy paralelně
  const allBetsMap = {}
  await Promise.all([...groupMatches, ...koMatches].map(async (m) => {
    try {
      allBetsMap[m.id] = await getAllBets(m.id)
    } catch (e) {
      allBetsMap[m.id] = {}
    }
  }))

  let bankCarry = 0
  let totalDeposit = 0
  let totalWon = 0

  // Zpracuj skupiny chronologicky
  for (const match of groupMatches) {
    const bets = allBetsMap[match.id] || {}
    const tippedPlayers = Object.keys(bets)
    // Vklady — každý kdo tipnul přispěje
    tippedPlayers.forEach(p => {
      if (stats[p]) {
        stats[p].deposit += RULES_2026.groupBet
        totalDeposit += RULES_2026.groupBet
      }
    })
    // Pokud má zápas výsledek, vyhodnoť
    const hasResult = match.homeScore !== null && match.homeScore !== undefined
    if (hasResult) {
      const matchPool = tippedPlayers.length * RULES_2026.groupBet + bankCarry
      const winners = tippedPlayers.filter(p => {
        const t = bets[p]
        return t && t.home === match.homeScore && t.away === match.awayScore
      })
      if (winners.length > 0) {
        const share = matchPool / winners.length
        winners.forEach(w => {
          if (stats[w]) {
            stats[w].groupWin += share
            stats[w].correctGroup++
            totalWon += share
          }
        })
        bankCarry = 0
      } else {
        bankCarry = matchPool
      }
    }
  }

  // Zpracuj KO chronologicky (bank carry pokračuje)
  for (const match of koMatches) {
    const bets = allBetsMap[match.id] || {}
    const tippedPlayers = Object.keys(bets)
    tippedPlayers.forEach(p => {
      if (stats[p]) {
        stats[p].deposit += RULES_2026.koMatchBet
        totalDeposit += RULES_2026.koMatchBet
      }
    })
    const hasResult = match.homeScore !== null && match.homeScore !== undefined
    if (hasResult) {
      const matchPool = tippedPlayers.length * RULES_2026.koMatchBet + bankCarry
      const winners = tippedPlayers.filter(p => {
        const t = bets[p]
        return t && t.home === match.homeScore && t.away === match.awayScore
      })
      if (winners.length > 0) {
        const share = matchPool / winners.length
        winners.forEach(w => {
          if (stats[w]) {
            stats[w].koWin += share
            stats[w].correctKo++
            totalWon += share
          }
        })
        bankCarry = 0
      } else {
        bankCarry = matchPool
      }
    }
  }

  // Tip na vítěze
  let winnerBets = {}
  try {
    winnerBets = await getWinnerBets()
  } catch (e) {}

  // Vklady za vítěze (každý kdo tipnul)
  Object.keys(winnerBets).forEach(p => {
    if (stats[p]) {
      stats[p].deposit += RULES_2026.winnerBet
      totalDeposit += RULES_2026.winnerBet
    }
  })

  // Pokud turnaj skončil a známe vítěze, vyhodnotit
  const finalMatch = koMatches.find(m => m.stage === 'F') || koMatches[koMatches.length - 1]
  const tournamentFinished = finalMatch && finalMatch.homeScore !== null
  let actualWinner = null
  if (tournamentFinished) {
    actualWinner = finalMatch.homeScore > finalMatch.awayScore ? finalMatch.home : finalMatch.away
    Object.entries(winnerBets).forEach(([p, team]) => {
      if (team === actualWinner && stats[p]) {
        const bonus = RULES_2026.winnerBet * Object.keys(winnerBets).length
        stats[p].winnerBonus = bonus
        totalWon += bonus
      }
    })
  }

  // Sestavení žebříčku
  const standings = Object.values(stats).map(s => ({
    ...s,
    correctTips: s.correctGroup + s.correctKo,
    totalWin: s.groupWin + s.koWin + s.winnerBonus,
    balance: s.groupWin + s.koWin + s.winnerBonus - s.deposit,
  })).sort((a, b) => b.balance - a.balance)

  return {
    standings,
    currentBank: bankCarry,
    totalDeposit,
    totalWon,
    actualWinner,
    tournamentFinished,
  }
}
