import { timeUntilDeadline, isPastDeadline, getDeadline } from '../utils/date.js'

/**
 * Spustí countdown pro nejbližší deadline
 * @param {string} dateStr - datum hracího dne
 * @param {HTMLElement} element - element kde zobrazit countdown
 * @returns {Function} cleanup funkce pro zastavení intervalu
 */
export function startCountdown(dateStr, element) {
  if (!element) return () => {}

  // Zapamatuj si původní třídy aby se nepřepsaly
  const baseClass = element.className || ''

  function update() {
    const text = timeUntilDeadline(dateStr)
    const past = isPastDeadline(dateStr)

    element.textContent = past ? '🔒 Uzavřeno' : `⏱ ${text}`
    const stateClass = past
      ? 'locked'
      : (getDeadline(dateStr) - new Date() < 3600000) ? 'urgent' : ''
    element.className = (baseClass + ' ' + stateClass).trim()
  }

  update()
  const interval = setInterval(update, 1000)

  return () => clearInterval(interval)
}
