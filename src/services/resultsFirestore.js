import { db } from '../config/firebase.js'
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore'

/**
 * Výsledky zápasů ve Firestore (kolekce `results`, doc id = naše match ID, např. 'A1').
 *
 * Single source of truth pro výsledky — plní je serverový cron
 * (public/api/sync-results.php) z football-data.org, klient je jen čte.
 * Ruční zadání v adminu sem taky zapisuje, takže ho vidí všichni.
 */

/**
 * Realtime listener na všechny výsledky.
 * @param {(results: Record<string, {homeScore:number|null, awayScore:number|null, status:string}>) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribeResults(callback) {
  try {
    return onSnapshot(
      collection(db, 'results'),
      snap => {
        const results = {}
        snap.forEach(d => {
          const x = d.data()
          results[d.id] = {
            homeScore: x.homeScore ?? null,
            awayScore: x.awayScore ?? null,
            status: x.status || 'finished',
            minute: x.minute ?? null, // "57'" / "45'+2'" / "HT" / "PEN" — jen u live
            updatedAt: x.updatedAt ?? null, // pro lokální tikání minuty mezi syncy
          }
        })
        callback(results)
      },
      err => console.error('Firestore results listener error:', err)
    )
  } catch (e) {
    console.error('subscribeResults selhal:', e)
    return () => {}
  }
}

/**
 * Zapíše/přepíše výsledek jednoho zápasu (ruční zadání v adminu).
 */
export async function writeResult(id, homeScore, awayScore, status = 'finished') {
  await setDoc(
    doc(db, 'results', id),
    { homeScore, awayScore, status, updatedAt: new Date().toISOString() },
    { merge: true }
  )
}
