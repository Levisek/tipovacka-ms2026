import { MATCHES } from '../config/schedule.js'
import { getPlayers } from './auth.js'
import * as store from './matchStore.js'

const GROUP_BET = 10    // Kč za zápas ve skupině
const KNOCKOUT_DAILY = 40 // Kč za den ve vyřazovačce
const WINNER_BET = 100   // Kč za tip na celkového vítěze

/**
 * Vypočítá sázku za zápas
 */
export function getMatchBet(match) {
  if (match.stage === 'group') return GROUP_BET
  // Ve vyřazovačce: 40 Kč / den, děleno počtem zápasů ten den
  const dayMatches = MATCHES.filter(m =>
    m.date === match.date && m.stage !== 'group'
  )
  return Math.round(KNOCKOUT_DAILY / Math.max(1, dayMatches.length))
}

/**
 * Zpracuje výsledek zápasu — spočítá bank, najde výherce, rozdělí peníze.
 *
 * PRAVIDLA DĚLBY:
 * - Bank se kumuluje za každý zápas (počet hráčů × sázka)
 * - Pokud nikdo netrefí → bank se přenese na další zápas
 * - Pokud trefí 1 hráč → vyhrává celý bank
 * - Pokud trefí N hráčů → bank se dělí rovným dílem (bank / N)
 * - Teoreticky se mohou trefit všichni → každý dostane bank / 8
 *
 * @param {string} matchId
 * @param {Object} bets - { playerId: { home: number, away: number } }
 * @param {number} currentBank - akumulovaný bank před tímto zápasem
 * @returns {{ winners: string[], payout: number, newBank: number }}
 */
export function processMatchResult(matchId, bets, currentBank = 0) {
  const match = store.getMatch(matchId)
  if (!match || match.homeScore === null) return null

  const numPlayers = Object.keys(bets).length || getPlayers().length
  const betAmount = getMatchBet(match)
  const matchPool = betAmount * numPlayers
  const totalBank = currentBank + matchPool

  // Najdi výherce — přesný výsledek
  const winners = []
  for (const [player, bet] of Object.entries(bets)) {
    if (bet.home === match.homeScore && bet.away === match.awayScore) {
      winners.push(player)
    }
  }

  if (winners.length === 0) {
    // Nikdo netrefil → bank roste
    return { winners: [], payout: 0, totalBank, newBank: totalBank }
  }

  // Dělba: bank / počet výherců (zaokrouhleno dolů, zbytek zůstane v banku)
  const payout = Math.floor(totalBank / winners.length)
  const remainder = totalBank - (payout * winners.length)

  return {
    winners,
    payout,         // kolik dostane KAŽDÝ výherce
    totalBank,
    newBank: remainder  // zbytek po dělení (většinou 0)
  }
}

/**
 * Spočítá aktuální bank ze všech odehraných zápasů (lokální výpočet)
 */
export function calculateBank(allBets = {}) {
  const matches = store.getAllMatches()
  let bank = 0

  // Projdi zápasy chronologicky
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.kickoff.localeCompare(b.kickoff))

  for (const match of sorted) {
    if (match.homeScore === null) continue // neodhraný

    const bets = allBets[match.id] || {}
    const numPlayers = Object.keys(bets).length || getPlayers().length
    const betAmount = getMatchBet(match)
    bank += betAmount * numPlayers

    // Najdi výherce
    const winners = Object.entries(bets).filter(([, b]) =>
      b.home === match.homeScore && b.away === match.awayScore
    )

    if (winners.length > 0) {
      // Bank se vyplatí a resetne (zbytek po dělení zůstane)
      const payout = Math.floor(bank / winners.length)
      bank = bank - (payout * winners.length)
    }
  }

  return bank
}

/**
 * Vrátí žebříček hráčů (lokální výpočet)
 */
export function getStandings(allBets = {}) {
  const players = getPlayers()
  const matches = store.getAllMatches()
  const sorted = [...matches].sort((a, b) => a.date.localeCompare(b.date))

  const stats = {}
  players.forEach(p => stats[p] = { name: p, won: 0, correctTips: 0, totalBet: 0 })

  let bank = 0
  for (const match of sorted) {
    if (match.homeScore === null) continue

    const bets = allBets[match.id] || {}
    const betAmount = getMatchBet(match)
    const numPlayers = Object.keys(bets).length || players.length
    bank += betAmount * numPlayers

    // Odečti vklad tipujícím
    for (const p of Object.keys(bets)) {
      if (stats[p]) stats[p].totalBet += betAmount
    }

    // Najdi výherce
    const winners = Object.entries(bets).filter(([, b]) =>
      b.home === match.homeScore && b.away === match.awayScore
    )

    if (winners.length > 0) {
      const payout = Math.floor(bank / winners.length)
      for (const [p] of winners) {
        if (stats[p]) {
          stats[p].won += payout
          stats[p].correctTips++
        }
      }
      bank = bank - (payout * winners.length)
    }
  }

  return Object.values(stats)
    .map(s => ({ ...s, balance: s.won - s.totalBet }))
    .sort((a, b) => b.balance - a.balance)
}
