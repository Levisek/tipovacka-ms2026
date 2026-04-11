import { getPlayerName } from '../services/auth.js'
import { APP_BRAND_NAME, APP_SUBTITLE } from '../config/constants.js'

export function renderNav() {
  const player = getPlayerName()
  return `
    <nav role="navigation" aria-label="Hlavní navigace">
      <a href="#/" class="nav-brand">
        <span class="nav-title">${APP_BRAND_NAME}<span class="nav-subtitle">${APP_SUBTITLE}</span></span>
      </a>
      <ul class="nav-links" id="navLinks">
        <li><a href="#/">Tipovačka</a></li>
        <li><a href="#/standings">Žebříček</a></li>
        <li><a href="#/winner">Vítěz</a></li>
        <li><a href="#/schedule">Rozpis</a></li>
        <li><a href="#/rules">Pravidla</a></li>
        <li><a href="#/archive">Archiv</a></li>
        <li><a href="#/admin">Admin</a></li>
      </ul>
      <div class="nav-player" id="nav-player">
        ${player
          ? `<button class="player-badge" id="player-badge" title="Přepnout hráče">${player} <span style="opacity: 0.6; font-size: 11px;">▾</span></button>`
          : `<button class="btn-select-player" id="btn-select-player">Vyber hráče</button>`
        }
      </div>
      <button class="nav-hamburger" id="navHamburger"
              aria-label="Otevřít menu" aria-expanded="false" aria-controls="navLinks">
        <span></span><span></span><span></span>
      </button>
    </nav>
  `
}

export function initNavEvents() {
  const navHamburger = document.getElementById('navHamburger')
  const navLinks = document.getElementById('navLinks')

  function closeMenu() {
    if (!navLinks) return
    navLinks.classList.remove('open')
    if (navHamburger) {
      navHamburger.setAttribute('aria-expanded', 'false')
      navHamburger.setAttribute('aria-label', 'Otevřít menu')
    }
    document.body.style.overflow = ''
  }

  function toggleMenu() {
    if (!navLinks) return
    const isOpen = navLinks.classList.toggle('open')
    if (navHamburger) {
      navHamburger.setAttribute('aria-expanded', String(isOpen))
      navHamburger.setAttribute('aria-label', isOpen ? 'Zavřít menu' : 'Otevřít menu')
    }
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }

  if (navHamburger) {
    navHamburger.addEventListener('click', toggleMenu)
  }

  // Zavři menu po kliknutí na odkaz
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu)
    })
  }

  // Esc zavře menu
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks?.classList.contains('open')) {
      closeMenu()
      navHamburger?.focus()
    }
  })

  // Click outside zavře menu
  document.addEventListener('click', (e) => {
    if (navLinks?.classList.contains('open')) {
      if (!e.target.closest('nav') && !e.target.closest('.nav-hamburger')) {
        closeMenu()
      }
    }
  })

  // Resize zavře menu pokud se zvětší okno
  let resizeTimer
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth > 768 && navLinks?.classList.contains('open')) {
        closeMenu()
      }
    }, 150)
  })

  // Player select button (když není vybraný hráč)
  const selectBtn = document.getElementById('btn-select-player')
  if (selectBtn) {
    selectBtn.addEventListener('click', () => {
      document.getElementById('player-modal').classList.add('visible')
    })
  }

  // Player badge — klik otevře modal pro přepnutí hráče
  const playerBadge = document.getElementById('player-badge')
  if (playerBadge) {
    playerBadge.addEventListener('click', () => {
      document.getElementById('player-modal').classList.add('visible')
    })
  }
}
