/**
 * Statistiky pro profil hráče — agreguje data z aktuálního MS 2026 i z archivů.
 */
import * as store from './matchStore.js'
import { getAllBets, getWinnerBets } from './betService.js'
import { computeLiveStandings, RULES_2026 } from './standingsService.js'
import archive2022 from '../config/archive2022.json'
import archiveEuro2024 from '../config/archiveEuro2024.json'

/**
 * Vrátí komplexní statistiky pro hráče.
 */
export async function computePlayerStats(playerName) {
  // 1) AKTUÁLNÍ MS 2026 — z živých dat
  const allMatches = store.getAllMatches()
  const allBetsMap = {}
  await Promise.all(allMatches.map(async (m) => {
    try { allBetsMap[m.id] = await getAllBets(m.id) } catch (e) { allBetsMap[m.id] = {} }
  }))

  let tipsCount = 0
  let correctCount = 0
  let coWinCounts = {} // player -> kolikrát jsme spolu trefili stejný zápas
  const matchesTipped = []

  for (const m of allMatches) {
    const bets = allBetsMap[m.id] || {}
    const myBet = bets[playerName]
    if (!myBet) continue
    tipsCount++
    matchesTipped.push({ match: m, bet: myBet })

    if (m.homeScore !== null && m.homeScore !== undefined) {
      const correct = myBet.home === m.homeScore && myBet.away === m.awayScore
      if (correct) {
        correctCount++
        // Najdi spolu-vítěze
        Object.entries(bets).forEach(([p, b]) => {
          if (p === playerName) return
          if (b.home === m.homeScore && b.away === m.awayScore) {
            coWinCounts[p] = (coWinCounts[p] || 0) + 1
          }
        })
      }
    }
  }

  // Najdi top spolu-vítěze (se kým jsem se dělil nejvíc)
  const topCoWinner = Object.entries(coWinCounts).sort((a, b) => b[1] - a[1])[0]

  // 2) Žebříček — pozice, bilance
  let rank = null
  let standingsEntry = null
  let totalPlayers = 0
  let winnerBet2026 = null
  try {
    const live = await computeLiveStandings()
    totalPlayers = live.standings.length
    const idx = live.standings.findIndex(p => p.name === playerName)
    if (idx >= 0) {
      rank = idx + 1
      standingsEntry = live.standings[idx]
    }
    winnerBet2026 = live.winnerBets?.[playerName] || null
  } catch (e) {}

  // 3) ARCHIV — MS 2022 + Euro 2024
  const computeArchiveStats = (data, label) => {
    const allArchiveMatches = [...(data.groupMatches || []), ...(data.koMatches || [])]
    let tCount = 0, cCount = 0
    allArchiveMatches.forEach(m => {
      const t = m.tips?.[playerName]
      if (!t) return
      tCount++
      if (t.home === m.homeScore && t.away === m.awayScore) cCount++
    })
    const groupMoney = data.groupTotals?.[playerName]?.money || 0
    const koTotalMoney = data.koTotals?.[playerName]?.money || 0
    // V archivech KO sloupec obsahuje group + KO součet
    const winnerTip = data.winnerBets?.[playerName] || null
    const winnerCorrect = winnerTip?.trim() === data.actualWinner
    return {
      label,
      participated: tCount > 0,
      tips: tCount,
      correct: cCount,
      successRate: tCount > 0 ? (cCount / tCount * 100).toFixed(1) : '0',
      totalWon: koTotalMoney,
      groupWon: groupMoney,
      koWon: Math.max(0, koTotalMoney - groupMoney),
      winnerTip,
      winnerCorrect,
      actualWinner: data.actualWinner,
    }
  }

  const ms2022 = computeArchiveStats(archive2022, 'MS 2022')
  const euro2024 = computeArchiveStats(archiveEuro2024, 'Euro 2024')

  // 4) NEJHORŠÍ TIP — z historie + aktuálního MS 2026
  let worstTip = null
  const checkBet = (m, bet, source) => {
    if (m.homeScore === null || m.homeScore === undefined) return
    const diff = Math.abs(bet.home - m.homeScore) + Math.abs(bet.away - m.awayScore)
    if (!worstTip || diff > worstTip.diff) {
      worstTip = {
        diff,
        tip: `${bet.home}:${bet.away}`,
        result: `${m.homeScore}:${m.awayScore}`,
        match: `${m.home} vs ${m.away}`,
        source,
      }
    }
  }

  // 2022
  archive2022.groupMatches.concat(archive2022.koMatches || []).forEach(m => {
    const t = m.tips?.[playerName]; if (t) checkBet(m, t, 'MS 2022')
  })
  // 2024
  archiveEuro2024.groupMatches.concat(archiveEuro2024.koMatches || []).forEach(m => {
    const t = m.tips?.[playerName]; if (t) checkBet(m, t, 'Euro 2024')
  })
  // 2026 (live)
  matchesTipped.forEach(({ match, bet }) => checkBet(match, bet, 'MS 2026'))

  // 5) OBLÍBENÝ VÝSLEDEK — co tipuji nejčastěji
  const allTipsCounts = {}
  const recordTip = (bet) => {
    const key = `${bet.home}:${bet.away}`
    allTipsCounts[key] = (allTipsCounts[key] || 0) + 1
  }
  archive2022.groupMatches.concat(archive2022.koMatches || []).forEach(m => {
    if (m.tips?.[playerName]) recordTip(m.tips[playerName])
  })
  archiveEuro2024.groupMatches.concat(archiveEuro2024.koMatches || []).forEach(m => {
    if (m.tips?.[playerName]) recordTip(m.tips[playerName])
  })
  matchesTipped.forEach(({ bet }) => recordTip(bet))
  const favoriteResult = Object.entries(allTipsCounts).sort((a, b) => b[1] - a[1])[0]

  return {
    name: playerName,
    current: {
      tipsCount,
      correctCount,
      successRate: tipsCount > 0 ? (correctCount / tipsCount * 100).toFixed(1) : '0',
      rank,
      totalPlayers,
      standingsEntry,
      topCoWinner: topCoWinner ? { name: topCoWinner[0], count: topCoWinner[1] } : null,
      winnerBet2026,
    },
    history: { ms2022, euro2024 },
    worstTip,
    favoriteResult: favoriteResult ? { score: favoriteResult[0], count: favoriteResult[1] } : null,
  }
}
