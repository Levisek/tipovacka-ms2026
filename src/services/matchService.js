import { db } from '../config/firebase.js'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { MATCHES } from '../config/schedule.js'

const MATCHES_COL = 'matches'

/**
 * Seedne všechny zápasy do Firestore (jednorázově)
 */
export async function seedMatches() {
  const col = collection(db, MATCHES_COL)
  for (const match of MATCHES) {
    await setDoc(doc(col, match.id), {
      ...match,
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      bank: 0,
      winners: []
    })
  }
}

/**
 * Načte zápas z Firestore, fallback na lokální data
 */
export async function getMatch(matchId) {
  try {
    const snap = await getDoc(doc(db, MATCHES_COL, matchId))
    if (snap.exists()) return { id: snap.id, ...snap.data() }
  } catch (e) {
    // Firebase offline — fallback na lokální data
  }
  return MATCHES.find(m => m.id === matchId) || null
}

/**
 * Načte všechny zápasy
 */
export async function getAllMatches() {
  try {
    const snap = await getDocs(collection(db, MATCHES_COL))
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    }
  } catch (e) {
    // Fallback
  }
  return MATCHES.map(m => ({ ...m, homeScore: null, awayScore: null, status: 'scheduled', bank: 0, winners: [] }))
}

/**
 * Aktualizuje výsledek zápasu
 */
export async function updateMatchResult(matchId, homeScore, awayScore) {
  await updateDoc(doc(db, MATCHES_COL, matchId), {
    homeScore,
    awayScore,
    status: 'finished'
  })
}

/**
 * Realtime listener na zápasy
 */
export function onMatchesChange(callback) {
  try {
    return onSnapshot(collection(db, MATCHES_COL), snap => {
      const matches = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      callback(matches)
    })
  } catch (e) {
    // Fallback — zavolej callback s lokálními daty
    callback(MATCHES.map(m => ({ ...m, homeScore: null, awayScore: null, status: 'scheduled', bank: 0, winners: [] })))
    return () => {}
  }
}
