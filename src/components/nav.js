import { getPlayerName } from '../services/auth.js'

export function renderNav() {
  const player = getPlayerName()
  return `
    <nav>
      <a href="#/" class="nav-brand">
        <span class="nav-title">Pískové doly<span class="nav-subtitle">Tipovačka MS 2026</span></span>
      </a>
      <div class="nav-links">
        <a href="#/">Tipovačka</a>
        <a href="#/schedule">Rozpis</a>
        <a href="#/standings">Žebříček</a>
        <a href="#/archive">Archiv</a>
        <a href="#/admin">Admin</a>
      </div>
      <div class="nav-player" id="nav-player">
        ${player
          ? `<span class="player-badge">${player}</span>`
          : `<button class="btn-select-player" id="btn-select-player">Vyber hráče</button>`
        }
      </div>
      <button class="nav-burger" id="nav-burger" aria-label="Menu">☰</button>
    </nav>
  `
}

export function initNavEvents() {
  const burger = document.getElementById('nav-burger')
  if (burger) {
    burger.addEventListener('click', () => {
      document.querySelector('.nav-links').classList.toggle('open')
    })
  }

  const selectBtn = document.getElementById('btn-select-player')
  if (selectBtn) {
    selectBtn.addEventListener('click', () => {
      document.getElementById('player-modal').classList.add('visible')
    })
  }

  // Zavři menu po kliknutí na odkaz
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelector('.nav-links').classList.remove('open')
    })
  })
}
