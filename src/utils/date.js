import { MATCHES } from '../config/schedule.js'

// Cache: nejranější kickoff pro každý hrací den
const firstKickoffByDate = {}
MATCHES.forEach(m => {
  if (!firstKickoffByDate[m.date] || m.kickoff < firstKickoffByDate[m.date]) {
    firstKickoffByDate[m.date] = m.kickoff
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
 * Vrátí deadline pro daný hrací den = 1.5h před prvním zápasem dne
 */
export function getDeadline(dateStr) {
  const firstKickoff = firstKickoffByDate[dateStr] || '21:00'
  const [h, m] = firstKickoff.split(':').map(Number)
  const d = new Date(dateStr)
  d.setHours(h, m, 0, 0)
  d.setMinutes(d.getMinutes() - 90) // minus 1.5 hodiny
  return d
}

/**
 * Vrátí deadline jako čitelný string "19:30"
 */
export function getDeadlineTime(dateStr) {
  const dl = getDeadline(dateStr)
  return `${String(dl.getHours()).padStart(2, '0')}:${String(dl.getMinutes()).padStart(2, '0')}`
}

/**
 * Je po deadline?
 */
export function isPastDeadline(dateStr) {
  return new Date() >= getDeadline(dateStr)
}

/**
 * Vrátí zbývající čas do deadline jako string
 */
export function timeUntilDeadline(dateStr) {
  const deadline = getDeadline(dateStr)
  const now = new Date()
  const diff = deadline - now

  if (diff <= 0) return 'Uzavřeno'

  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
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
