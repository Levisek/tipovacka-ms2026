import { db } from '../config/firebase.js'
import { collection, doc, getDocs, setDoc } from 'firebase/firestore'

/**
 * Evidence plateb: payments/{player} = { groups: bool, knockout: bool }.
 * Sdílené přes Firestore, ať to admin vidí z libovolného zařízení.
 */

export async function getPayments() {
  try {
    const snap = await getDocs(collection(db, 'payments'))
    const out = {}
    snap.forEach(d => { out[d.id] = d.data() })
    return out
  } catch (e) {
    console.error('getPayments selhal:', e)
    return {}
  }
}

export async function setPayment(player, phase, paid) {
  // phase = 'groups' | 'knockout'
  await setDoc(doc(db, 'payments', player), { [phase]: !!paid }, { merge: true })
}
