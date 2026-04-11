import { MAX_SCORE } from '../config/constants.js'

/**
 * Inicializuje event listenery pro bet formuláře v kontejneru
 * @param {HTMLElement} container
 * @param {Function} onSubmit - callback(matchId, homeScore, awayScore)
 */
export function initBetForms(container, onSubmit) {
  // Tlačítko tužky — přepne lock na editovatelný formulář
  container.querySelectorAll('.bet-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.matchId
      const lockedForm = container.querySelector(`.bet-form.bet-locked[data-match-id="${matchId}"]`)
      if (!lockedForm) return
      // Načti aktuální hodnoty z lock divu
      const scores = lockedForm.querySelectorAll('.bet-locked-score')
      const homeVal = scores[0]?.textContent?.trim() || ''
      const awayVal = scores[1]?.textContent?.trim() || ''
      // Nahraď formulářem
      lockedForm.outerHTML = `
        <div class="bet-form" data-match-id="${matchId}">
          <div style="text-align: right">
            <input type="number" class="bet-input" data-side="home" min="0" max="${MAX_SCORE}"
              value="${homeVal}" placeholder="-">
          </div>
          <button class="bet-submit" data-match-id="${matchId}">Tipni</button>
          <div>
            <input type="number" class="bet-input" data-side="away" min="0" max="${MAX_SCORE}"
              value="${awayVal}" placeholder="-">
          </div>
        </div>
      `
      // Re-init event listeners pro nový formulář
      initBetForms(container, onSubmit)
    })
  })

  container.querySelectorAll('.bet-submit').forEach(btn => {
    btn.addEventListener('click', () => {
      const matchId = btn.dataset.matchId
      const form = container.querySelector(`.bet-form[data-match-id="${matchId}"]`)
      if (!form) return

      const homeInput = form.querySelector('.bet-input[data-side="home"]')
      const awayInput = form.querySelector('.bet-input[data-side="away"]')

      const homeScore = parseInt(homeInput.value)
      const awayScore = parseInt(awayInput.value)

      if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        homeInput.style.borderColor = isNaN(homeScore) ? 'var(--color-locked)' : ''
        awayInput.style.borderColor = isNaN(awayScore) ? 'var(--color-locked)' : ''
        return
      }

      // Vizuální feedback
      btn.textContent = '✓'
      btn.disabled = true
      homeInput.disabled = true
      awayInput.disabled = true

      onSubmit(matchId, homeScore, awayScore)
    })
  })

  // Enter key submits
  container.querySelectorAll('.bet-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const form = input.closest('.bet-form')
        const btn = form?.querySelector('.bet-submit')
        if (btn) btn.click()
      }
    })
  })
}
