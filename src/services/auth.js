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
  return `
    <div class="modal-overlay" id="player-modal">
      <div class="modal">
        <h2>Kdo jsi?</h2>
        <div class="player-grid">
          ${PLAYERS.map(name => `
            <button class="player-option" data-player="${name}">${name}</button>
          `).join('')}
        </div>
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
      if (onSelect) onSelect(name)
    })
  })

  // Zavřít kliknutím na overlay
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.remove('visible')
  })
}
