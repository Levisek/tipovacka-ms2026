import { STAGE_NAMES } from '../config/schedule.js'
import * as store from '../services/matchStore.js'
import { GROUPS, getTeam, flagImg, HOME_TEAM } from '../config/teams.js'
import { formatDateShort, formatDateFull } from '../utils/date.js'

export function renderSchedule(container) {
  const tabs = [
    { id: 'groups', label: 'Skupiny' },
    { id: 'R32', label: '1/16 finále' },
    { id: 'R16', label: 'Osmifinále' },
    { id: 'QF', label: 'Čtvrtfinále' },
    { id: 'SF', label: 'Semifinále' },
    { id: 'finals', label: 'Finále' },
  ]

  container.innerHTML = `
    <div class="section-header">
      <h1>Rozpis zápasů</h1>
    </div>
    <div class="schedule-tabs">
      ${tabs.map((t, i) => `
        <button class="schedule-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
      `).join('')}
    </div>
    <div id="schedule-content"></div>
  `

  renderGroups(container.querySelector('#schedule-content'))

  container.querySelectorAll('.schedule-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.schedule-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const content = container.querySelector('#schedule-content')
      switch (btn.dataset.tab) {
        case 'groups': renderGroups(content); break
        case 'R32': renderStage(content, 'R32'); break
        case 'R16': renderStage(content, 'R16'); break
        case 'QF': renderStage(content, 'QF'); break
        case 'SF': renderStage(content, 'SF'); break
        case 'finals': renderFinals(content); break
      }
    })
  })
}

function renderGroups(content) {
  content.innerHTML = `
    <div class="groups-grid">
      ${GROUPS.map(group => {
        const matches = store.getMatchesByGroup(group)
        const isOurGroup = matches.some(m => m.home === HOME_TEAM || m.away === HOME_TEAM)
        return `
          <div class="group-card${isOurGroup ? ' our-group' : ''}">
            <h3 class="group-card-title">Skupina ${group}</h3>
            <div class="group-matches">
              ${matches.map(m => {
                const home = getTeam(m.home)
                const away = getTeam(m.away)
                const hasResult = m.homeScore !== null && m.homeScore !== undefined
                const isOurMatch = m.home === HOME_TEAM || m.away === HOME_TEAM
                return `
                  <a href="#/match/${m.id}" class="group-match-row${isOurMatch ? ' our-team' : ''}">
                    <span class="gm-date">${formatDateShort(m.date)}</span>
                    <span class="gm-home">${m.home} ${flagImg(home.flag, 16)}</span>
                    <span class="gm-score">${hasResult ? `${m.homeScore} : ${m.awayScore}` : m.kickoff}</span>
                    <span class="gm-away">${flagImg(away.flag, 16)} ${m.away}</span>
                  </a>
                `
              }).join('')}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
}

function renderStage(content, stage) {
  const matches = store.getMatchesByStage(stage)
  content.innerHTML = `
    <h2 style="margin-bottom: 16px;">${STAGE_NAMES[stage]}</h2>
    <div class="knockout-grid">
      ${matches.map(m => renderKnockoutCard(m)).join('')}
    </div>
  `
}

function renderFinals(content) {
  const sf = store.getMatchesByStage('SF')
  const third = store.getMatchesByStage('3rd')
  const final = store.getMatchesByStage('F')

  content.innerHTML = `
    <h2 style="margin-bottom: 16px;">Semifinále</h2>
    <div class="knockout-grid">
      ${sf.map(m => renderKnockoutCard(m)).join('')}
    </div>
    <h2 style="margin: 24px 0 16px;">O 3. místo</h2>
    <div class="knockout-grid">
      ${third.map(m => renderKnockoutCard(m)).join('')}
    </div>
    <h2 style="margin: 24px 0 16px;">Finále</h2>
    <div class="knockout-grid finale">
      ${final.map(m => renderKnockoutCard(m)).join('')}
    </div>
  `
}

function renderKnockoutCard(match) {
  const home = getTeam(match.home)
  const away = getTeam(match.away)
  const hasResult = match.homeScore !== null && match.homeScore !== undefined
  const isOurMatch = match.home === HOME_TEAM || match.away === HOME_TEAM

  return `
    <a href="#/match/${match.id}" class="knockout-card${isOurMatch ? ' our-team' : ''}">
      <div class="kc-header">
        <span>${formatDateShort(match.date)} · ${match.kickoff}</span>
        <span class="kc-city">${match.city}</span>
      </div>
      <div class="kc-team">${flagImg(home.flag, 20)} ${match.home}</div>
      <div class="kc-vs">${hasResult ? `${match.homeScore} : ${match.awayScore}` : 'vs'}</div>
      <div class="kc-team">${flagImg(away.flag, 20)} ${match.away}</div>
    </a>
  `
}
