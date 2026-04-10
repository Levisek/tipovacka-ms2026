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
  // Carry-over banku na vítěze z minulého turnaje (Euro 2024)
  winnerBankCarryOver: 700,
}

/**
 * Spočítá který tým je eliminovaný (prohrál KO nebo nepostoupil ze skupiny).
 * Vrací mapu { teamName: 'eliminated' | 'in' | 'unknown' }
 */
export function computeEliminations(allMatches) {
  const status = {}

  // KO eliminace — kdo prohrál KO zápas, je out
  const koMatches = allMatches.filter(m => m.stage !== 'group')
  for (const m of koMatches) {
    if (m.homeScore === null || m.homeScore === undefined) continue
    const homeWon = m.homeScore > m.awayScore
    const awayWon = m.awayScore > m.homeScore
    // Při remíze v KO vyhrává jeden po penaltách — bez dat to nevíme, bereme jako pokračující oba
    if (homeWon) status[m.away] = 'eliminated'
    if (awayWon) status[m.home] = 'eliminated'
  }

  // Skupinová eliminace — pokud má skupina všechny zápasy odehrané
  // a tým nemá top-2 umístění, je out (zjednodušeně podle bodů)
  const groupMatches = allMatches.filter(m => m.stage === 'group')
  const groups = {}
  for (const m of groupMatches) {
    if (!m.group) continue
    if (!groups[m.group]) groups[m.group] = { matches: [], teams: new Set() }
    groups[m.group].matches.push(m)
    groups[m.group].teams.add(m.home)
    groups[m.group].teams.add(m.away)
  }

  for (const [groupName, data] of Object.entries(groups)) {
    const teamCount = data.teams.size
    const expectedMatches = teamCount * (teamCount - 1) / 2
    const playedMatches = data.matches.filter(m => m.homeScore !== null && m.homeScore !== undefined)
    if (playedMatches.length < expectedMatches) continue // skupina nedohrána

    // Spočítej body / skóre
    const stats = {}
    for (const t of data.teams) stats[t] = { pts: 0, gd: 0, gf: 0 }
    for (const m of playedMatches) {
      const gh = m.homeScore, ga = m.awayScore
      stats[m.home].gf += gh; stats[m.home].gd += (gh - ga)
      stats[m.away].gf += ga; stats[m.away].gd += (ga - gh)
      if (gh > ga) stats[m.home].pts += 3
      else if (ga > gh) stats[m.away].pts += 3
      else { stats[m.home].pts += 1; stats[m.away].pts += 1 }
    }

    const sorted = [...data.teams].sort((a, b) => {
      if (stats[b].pts !== stats[a].pts) return stats[b].pts - stats[a].pts
      if (stats[b].gd !== stats[a].gd) return stats[b].gd - stats[a].gd
      return stats[b].gf - stats[a].gf
    })

    // Top 2 postupují, ostatní out (zjednodušeně — neřešíme nejlepší 3. místa)
    sorted.slice(2).forEach(t => {
      if (!status[t]) status[t] = 'eliminated'
    })
  }

  return status
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
  const winnerBetsCount = Object.keys(winnerBets).length
  Object.keys(winnerBets).forEach(p => {
    if (stats[p]) {
      stats[p].deposit += RULES_2026.winnerBet
      totalDeposit += RULES_2026.winnerBet
    }
  })

  // Bank na vítěze = carry-over z loňska + vklady všech tipujících
  const winnerBank = RULES_2026.winnerBankCarryOver + winnerBetsCount * RULES_2026.winnerBet

  // Eliminace týmů
  const eliminations = computeEliminations(allMatches)

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
    winnerBets,
    winnerBank,
    eliminations,
  }
}
