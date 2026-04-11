import { db } from '../config/firebase.js'
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import { isPastDeadline } from '../utils/date.js'

/**
 * Smaže všechny tipy na konkrétní zápas
 */
export async function deleteAllBetsForMatch(matchId) {
  const snap = await getDocs(collection(db, 'matches', matchId, 'bets'))
  const deletes = []
  snap.forEach(d => {
    deletes.push(deleteDoc(doc(db, 'matches', matchId, 'bets', d.id)))
  })
  await Promise.all(deletes)
  return deletes.length
}

/**
 * Smaže všechny tipy ze všech zápasů (RESET)
 */
export async function deleteAllBets(matchIds) {
  let total = 0
  for (const id of matchIds) {
    try {
      total += await deleteAllBetsForMatch(id)
    } catch (e) {}
  }
  return total
}

/**
 * Smaže všechny tipy na vítěze
 */
export async function deleteAllWinnerBets() {
  const snap = await getDocs(collection(db, 'winnerBets'))
  const deletes = []
  snap.forEach(d => {
    deletes.push(deleteDoc(doc(db, 'winnerBets', d.id)))
  })
  await Promise.all(deletes)
  return deletes.length
}

/**
 * Uloží tip hráče na zápas
 */
export async function placeBet(matchId, playerId, homeScore, awayScore) {
  const betRef = doc(db, 'matches', matchId, 'bets', playerId)
  await setDoc(betRef, {
    homeScore,
    awayScore,
    timestamp: new Date().toISOString(),
    locked: false
  })
}

/**
 * Načte tip hráče na zápas
 */
export async function getPlayerBet(matchId, playerId) {
  try {
    const snap = await getDoc(doc(db, 'matches', matchId, 'bets', playerId))
    if (snap.exists()) {
      const data = snap.data()
      return { home: data.homeScore, away: data.awayScore }
    }
  } catch (e) {
    // Offline
  }
  return null
}

/**
 * Načte všechny tipy na zápas (pro zobrazení po deadline)
 */
export async function getAllBets(matchId) {
  try {
    const snap = await getDocs(collection(db, 'matches', matchId, 'bets'))
    const bets = {}
    snap.forEach(d => {
      const data = d.data()
      bets[d.id] = { home: data.homeScore, away: data.awayScore }
    })
    return bets
  } catch (e) {
    return {}
  }
}

/**
 * Načte tipy hráče na všechny zápasy
 */
export async function getPlayerBets(playerId) {
  // Pro optimalizaci: načteme všechny zápasy a z nich tipy
  // V reálu by se dal použít collectionGroup query
  return {}
}

/**
 * Realtime listener na tipy pro zápas
 */
export function onBetsChange(matchId, callback) {
  try {
    return onSnapshot(collection(db, 'matches', matchId, 'bets'), snap => {
      const bets = {}
      snap.forEach(d => {
        const data = d.data()
        bets[d.id] = { home: data.homeScore, away: data.awayScore }
      })
      callback(bets)
    })
  } catch (e) {
    callback({})
    return () => {}
  }
}

/**
 * Uloží tip na celkového vítěze
 */
export async function placeWinnerBet(playerId, team) {
  await setDoc(doc(db, 'winnerBets', playerId), {
    team,
    timestamp: new Date().toISOString()
  })
}

/**
 * Načte tipy na celkového vítěze
 */
export async function getWinnerBets() {
  try {
    const snap = await getDocs(collection(db, 'winnerBets'))
    const bets = {}
    snap.forEach(d => { bets[d.id] = d.data().team })
    return bets
  } catch (e) {
    return {}
  }
}
