const STORAGE_KEY = 'ms2026_player'

const PLAYERS = [
  'Levis', 'Schmutzik', 'Kečup', 'Šruby',
  'Šinďa', 'Luki', 'Dvory', 'Miky'
]

export function getPlayers() {
  return PLAYERS
}

export function getPlayerName() {
  return localStorage.getItem(STORAGE_KEY)
}

export function setPlayerName(name) {
  localStorage.setItem(STORAGE_KEY, name)
}

export function clearPlayer() {
  localStorage.removeItem(STORAGE_KEY)
}

export function renderPlayerModal() {
  const current = getPlayerName()
  return `
    <div class="modal-overlay" id="player-modal">
      <div class="modal">
        <h2>${current ? 'Přepnout hráče' : 'Kdo jsi?'}</h2>
        <div class="player-grid">
          ${PLAYERS.map(name => `
            <button class="player-option ${name === current ? 'current' : ''}" data-player="${name}">${name}</button>
          `).join('')}
        </div>
        ${current ? '<button class="modal-close" id="player-modal-close">Zavřít</button>' : ''}
      </div>
    </div>
  `
}

export function initPlayerModal(onSelect) {
  const modal = document.getElementById('player-modal')
  if (!modal) return

  modal.querySelectorAll('.player-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.player
      setPlayerName(name)
      modal.classList.remove('visible')
      // Překresli modal aby měl správný stav (current player)
      const newModal = renderPlayerModal()
      modal.outerHTML = newModal
      // Re-init pro nový modal
      initPlayerModal(onSelect)
      if (onSelect) onSelect(name)
    })
  })

  // Zavírací tlačítko (jen když už je vybraný hráč)
  const closeBtn = document.getElementById('player-modal-close')
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('visible')
    })
  }

  // Zavřít kliknutím na overlay
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('visible')
  })
}
