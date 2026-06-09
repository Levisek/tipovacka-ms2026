import { MATCHES } from '../config/schedule.js'
import { DEADLINE_MINUTES_BEFORE_MATCH } from '../config/constants.js'

// Předěl fotbalového dne (SELČ). Zápasy s výkopem PŘED tímhle časem patří
// k předchozímu večeru. MS 2026 se hraje za louží → noční/ranní výkopy
// (00:00–~06:00) jsou ve skutečnosti zápasy "toho večera". Mezi ~08:00 a 18:00
// SELČ se nehraje, takže poledne je bezpečný předěl.
const FOOTBALL_DAY_CUTOFF_HOUR = 12

/**
 * "Fotbalový den" — zápas s výkopem před polednem SELČ patří k PŘEDCHOZÍMU
 * kalendářnímu dni (k tomu večeru), ne k novému dni.
 */
export function bettingDayOf(dateStr, kickoff) {
  const h = parseInt(kickoff.split(':')[0], 10)
  if (h < FOOTBALL_DAY_CUTOFF_HOUR) {
    // o den zpět — kotvíme na poledne UTC, ať to nepřeskočí přes TZ
    const d = new Date(dateStr + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  }
  return dateStr
}

/**
 * Relativní čas výkopu v rámci fotbalového dne (večer < noc).
 * Pro řazení uvnitř dne: 21:00 je dřív než 04:00 (druhý den ráno).
 */
export function bettingTime(kickoff) {
  const [h, m] = kickoff.split(':').map(Number)
  return (h < FOOTBALL_DAY_CUTOFF_HOUR ? h + 24 : h) * 60 + m
}

// Fotbalový den -> nejdřívější zápas dne { date, kickoff } (referenční pro deadline)
const firstMatchByBettingDay = {}
MATCHES.forEach(m => {
  const bd = bettingDayOf(m.date, m.kickoff)
  const cur = firstMatchByBettingDay[bd]
  if (!cur || bettingTime(m.kickoff) < bettingTime(cur.kickoff)) {
    firstMatchByBettingDay[bd] = { date: m.date, kickoff: m.kickoff }
  }
})

/**
 * Formátuje datum česky: "St 11. 6."
 */
export function formatDateShort(dateStr) {
  const d = new Date(dateStr)
  const days = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
  return `${days[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`
}

/**
 * Formátuje datum kompletně: "Středa 11. června 2026"
 */
export function formatDateFull(dateStr) {
  const d = new Date(dateStr)
  const days = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
  const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června',
    'července', 'srpna', 'září', 'října', 'listopadu', 'prosince']
  return `${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Formátuje čas: "21:00"
 */
export function formatTime(timeStr) {
  return timeStr
}

/**
 * Vrátí deadline pro daný fotbalový den = 1.5h před PRVNÍM zápasem toho dne.
 */
export function getDeadline(bettingDay) {
  const ref = firstMatchByBettingDay[bettingDay] || { date: bettingDay, kickoff: '21:00' }
  const [h, m] = ref.kickoff.split(':').map(Number)
  const d = new Date(ref.date + 'T00:00:00')
  d.setHours(h, m, 0, 0)
  d.setMinutes(d.getMinutes() - DEADLINE_MINUTES_BEFORE_MATCH)
  return d
}

/**
 * Vrátí deadline jako čitelný string "19:30"
 */
export function getDeadlineTime(bettingDay) {
  const dl = getDeadline(bettingDay)
  return `${String(dl.getHours()).padStart(2, '0')}:${String(dl.getMinutes()).padStart(2, '0')}`
}

/**
 * Je po deadline?
 */
export function isPastDeadline(bettingDay) {
  return new Date() >= getDeadline(bettingDay)
}

/**
 * Vrátí zbývající čas do deadline jako string
 */
export function timeUntilDeadline(bettingDay) {
  const deadline = getDeadline(bettingDay)
  const now = new Date()
  const diff = deadline - now

  if (diff <= 0) return 'Uzavřeno'

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')

  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`
  return `${seconds}s`
}

/**
 * Je dnes hrací den pro daný zápas?
 */
export function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}
