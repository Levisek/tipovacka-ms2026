import { timeUntilDeadline, isPastDeadline, getDeadline } from '../utils/date.js'
import { COUNTDOWN_UPDATE_INTERVAL_MS, URGENT_THRESHOLD_MS } from '../config/constants.js'

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
  // Najdi rodičovský banner pro nastavení červené třídy
  const banner = element.closest('.deadline-banner')
  const baseBannerClass = banner ? banner.className : ''

  function update() {
    const text = timeUntilDeadline(dateStr)
    const past = isPastDeadline(dateStr)

    element.textContent = past ? '🔒 Uzavřeno' : text
    const stateClass = past
      ? 'locked'
      : (getDeadline(dateStr) - new Date() < URGENT_THRESHOLD_MS) ? 'urgent' : ''
    element.className = (baseClass + ' ' + stateClass).trim()
    if (banner) {
      banner.className = (baseBannerClass + ' ' + stateClass).trim()
    }
  }

  update()
  const interval = setInterval(update, COUNTDOWN_UPDATE_INTERVAL_MS)

  return () => clearInterval(interval)
}
