import archive2022 from '../config/archive2022.json'
import archiveEuro2024 from '../config/archiveEuro2024.json'

// Pravidla sázek
const RULES = {
  'MS 2022': { groupBet: 10, koDailyBet: 40, winnerBet: 100 },
  'Euro 2024': { groupBet: 20, koDailyBet: 40, winnerBet: 100 },
}

// Počet hracích dnů pro každou fázi (pro výpočet vkladu)
// MS 2022: osmifinále 4 dny, čtvrtfinále 2, semifinále 2, o 3. místo 1, finále 1 = 10 dnů
// Euro 2024: osmifinále 4 dny, čtvrtfinále 2, semifinále 2, finále 1 = 9 dnů
const STAGE_DAYS = {
  'MS 2022': {
    'Osmifinále': 4,
    'Čtvrtfinále': 2,
    'Semifinále': 2,
    'O 3. místo': 1,
    'Finále': 1,
  },
  'Euro 2024': {
    'Osmifinále': 4,
    'Čtvrtfinále': 2,
    'Semifinále': 2,
    'Finále': 1,
  },
}

export function renderArchive(container) {
  container.innerHTML = `
    <div class="section-header">
      <h1>Archiv</h1>
    </div>
    <div class="archive-tabs">
      <button class="schedule-tab active" data-archive="euro2024">Euro 2024</button>
      <button class="schedule-tab" data-archive="ms2022">MS 2022</button>
    </div>
    <div id="archive-content"></div>
  `

  renderTournament(container.querySelector('#archive-content'), archiveEuro2024, 'Euro 2024')

  container.querySelectorAll('.archive-tabs .schedule-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.archive-tabs .schedule-tab').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const content = container.querySelector('#archive-content')
      if (btn.dataset.archive === 'ms2022') {
        renderTournament(content, archive2022, 'MS 2022')
      } else {
        renderTournament(content, archiveEuro2024, 'Euro 2024')
      }
    })
  })
}

function renderTournament(content, data, title) {
  const players = data.players
  const rules = RULES[title]

  // Spočítej správné tipy per hráč
  const correctTips = {}
  const correctGroupTips = {}
  const correctKoTips = {}
  players.forEach(p => {
    correctTips[p] = 0
    correctGroupTips[p] = 0
    correctKoTips[p] = 0
  })

  data.groupMatches.forEach(m => {
    Object.entries(m.tips).forEach(([p, t]) => {
      if (t.home === m.homeScore && t.away === m.awayScore) {
        correctTips[p]++
        correctGroupTips[p]++
      }
    })
  })

  data.koMatches.forEach(m => {
    Object.entries(m.tips).forEach(([p, t]) => {
      if (t.home === m.homeScore && t.away === m.awayScore) {
        correctTips[p]++
        correctKoTips[p]++
      }
    })
  })

  // Spočítej hrací dny ve vyřazovačce (pro výpočet vkladu)
  const koDays = new Set(data.koMatches.map(m => m.stage)).size // přibližně
  // Přesnější: kolik hracích dnů měl hráč tipy
  // Z excelu: každý hrací den = 40 Kč, ale hráč nemusel tipovat každý den
  // Použijeme počet zápasů kde měl hráč tip
  const koMatchCounts = {}
  players.forEach(p => {
    koMatchCounts[p] = data.koMatches.filter(m => m.tips[p]).length
  })

  // Vklady: skupiny = počet tipnutých zápasů × sázka, KO = počet tipnutých zápasů × (40/počet zápasů v den)
  // Zjednodušení: z excelu máme groupTotals a koTotals (výhry), vklady spočítáme z tipnutých zápasů
  const groupMatchCounts = {}
  players.forEach(p => {
    groupMatchCounts[p] = data.groupMatches.filter(m => m.tips[p]).length
  })

  // Tabulka 1: TIPY (seřazeno dle správných tipů)
  const tipTable = players.map(p => ({
    name: p,
    total: correctTips[p],
    groups: correctGroupTips[p],
    ko: correctKoTips[p],
    winnerTip: data.winnerBets[p] || '-',
    winnerCorrect: data.winnerBets[p]?.trim() === data.actualWinner
  })).sort((a, b) => b.total - a.total)

  // Tabulka 2: KEŠ (výhry - vklady)
  const cashTable = players.map(p => {
    const gWin = (data.groupTotals[p] || {}).money || 0
    const kWin = (data.koTotals[p] || {}).money || 0
    const gDeposit = groupMatchCounts[p] * rules.groupBet
    const kDeposit = koMatchCounts[p] * rules.groupBet // ve vyřazovačce se platilo 40/den, ale zjednodušíme na per-zápas stejnou sazbu
    // Reálně: ve vyřazovačce 40 Kč/den. Spočítej hrací dny kde hráč tipoval.
    // Pro každou fázi co hráč tipoval, započítej skutečný počet dnů
    const koTipStages = new Set()
    data.koMatches.forEach(m => {
      if (m.tips[p]) koTipStages.add(m.stage)
    })
    const stageDays = STAGE_DAYS[title] || {}
    const koTipDaysCount = [...koTipStages].reduce((sum, stage) => sum + (stageDays[stage] || 1), 0)
    const kDepositReal = koTipDaysCount * rules.koDailyBet
    const winnerDeposit = data.winnerBets[p] ? rules.winnerBet : 0
    const totalDeposit = gDeposit + kDepositReal + winnerDeposit
    const totalWin = gWin + kWin + (data.winnerBets[p]?.trim() === data.actualWinner ? rules.winnerBet * players.length : 0)
    const profit = totalWin - totalDeposit

    return {
      name: p,
      groupWin: gWin,
      koWin: kWin,
      groupDeposit: gDeposit,
      koDeposit: kDepositReal,
      winnerDeposit,
      totalWin,
      totalDeposit,
      profit
    }
  }).sort((a, b) => b.profit - a.profit)

  // Zkontroluj jestli někdo trefil vítěze
  const anyoneGotWinner = players.some(p => data.winnerBets[p]?.trim() === data.actualWinner)

  // Spočítej dny vyřazovačky pro popis
  const totalKoDays = Object.values(STAGE_DAYS[title] || {}).reduce((a, b) => a + b, 0)

  content.innerHTML = `
    <div class="archive-header">
      <h2>${title}</h2>
      <p style="color: var(--color-text-dim)">
        Vítěz turnaje: <strong style="color: var(--color-gold)">${data.actualWinner}</strong>
        ${!anyoneGotWinner ? ' — <span style="color: var(--color-locked)">nikdo netipnul!</span>' : ''}
      </p>
    </div>

    <!-- PRAVIDLA -->
    <details class="archive-rules">
      <summary>Pravidla a výpočet sázek</summary>
      <div class="archive-rules-content">
        <p><strong>Sázky:</strong></p>
        <ul>
          <li>Základní skupiny: <strong>${rules.groupBet} Kč</strong> za zápas (${data.groupMatches.length} zápasů → max <strong>${data.groupMatches.length * rules.groupBet} Kč</strong>)</li>
          <li>Vyřazovací fáze: <strong>${rules.koDailyBet} Kč</strong> za hrací den (${totalKoDays} dnů → max <strong>${totalKoDays * rules.koDailyBet} Kč</strong>)</li>
          <li>Tip na celkového vítěze: <strong>${rules.winnerBet} Kč</strong></li>
        </ul>
        <p><strong>Maximální vklad na hráče:</strong> ${data.groupMatches.length * rules.groupBet + totalKoDays * rules.koDailyBet + rules.winnerBet} Kč</p>
        <p><strong>Jak se vyhrává:</strong></p>
        <ul>
          <li>Peníze se hází do banku — vyhrává hráč, který tipne přesný výsledek zápasu</li>
          <li>Pokud nikdo netrefí výsledek, bank přechází do dalšího zápasu</li>
          <li>Pokud trefí výsledek víc hráčů, bank se mezi ně dělí</li>
          <li>Při správném tipu na vítěze turnaje vyhrává hráč ${rules.winnerBet} Kč × počet hráčů</li>
        </ul>
        <p style="color: var(--color-text-dim); font-size: 12px;">
          Vklad za vyřazovačku se počítá za hrací dny, ne za jednotlivé zápasy:
          ${Object.entries(STAGE_DAYS[title] || {}).map(([s, d]) => `${s} ${d}d`).join(', ')}
        </p>
      </div>
    </details>

    <!-- TABULKA 1: TIPY -->
    <div class="archive-stats">
      <h3>Správné tipy</h3>
      <div class="table-scroll">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hráč</th>
              <th>Skupiny</th>
              <th>Vyřazovačka</th>
              <th>Celkem</th>
              <th>Tip na vítěze</th>
            </tr>
          </thead>
          <tbody>
            ${tipTable.map((p, i) => `
              <tr>
                <td class="rank rank-${i + 1}">${i + 1}.</td>
                <td style="font-weight: 600; color: var(--color-text);">${p.name}</td>
                <td>${p.groups}</td>
                <td>${p.ko}</td>
                <td style="font-weight: 700; color: var(--color-text);">${p.total}</td>
                <td style="color: ${p.winnerCorrect ? 'var(--color-gold)' : 'var(--color-text-dim)'}">
                  ${p.winnerTip}${p.winnerCorrect ? ' ✓' : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TABULKA 2: KEŠ -->
    <div class="archive-stats">
      <h3>Finanční bilance</h3>
      <p style="color: var(--color-text-dim); font-size: 13px; margin-bottom: 12px;">
        Skupiny: ${rules.groupBet} Kč/zápas · Vyřazovačka: ${rules.koDailyBet} Kč/den · Tip na vítěze: ${rules.winnerBet} Kč
      </p>
      <div class="table-scroll">
        <table class="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hráč</th>
              <th>Skupiny</th>
              <th>Vyřazovačka</th>
              <th>Vklad</th>
              <th>Výhra</th>
              <th>Zisk</th>
            </tr>
          </thead>
          <tbody>
            ${cashTable.map((p, i) => `
              <tr>
                <td class="rank rank-${i + 1}">${i + 1}.</td>
                <td style="font-weight: 600; color: var(--color-text);">${p.name}</td>
                <td style="color: var(--color-gold);">${p.groupWin} Kč</td>
                <td style="color: var(--color-gold);">${p.koWin} Kč</td>
                <td style="color: var(--color-text-dim);">${p.totalDeposit} Kč</td>
                <td style="color: var(--color-gold); font-weight: 600;">${p.totalWin} Kč</td>
                <td style="color: ${p.profit > 0 ? 'var(--color-open)' : p.profit < 0 ? 'var(--color-locked)' : 'var(--color-text)'}; font-weight: 700;">
                  ${p.profit > 0 ? '+' : ''}${p.profit} Kč
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ZÁPASY -->
    <div class="archive-matches">
      <h3>Základní skupiny</h3>
      <div class="archive-grid">
        ${data.groupMatches.map(m => renderArchiveMatch(m)).join('')}
      </div>

      <h3 style="margin-top: 24px;">Vyřazovací fáze</h3>
      <div class="archive-grid">
        ${data.koMatches.map(m => renderArchiveMatch(m)).join('')}
      </div>
    </div>
  `
}

function renderArchiveMatch(match) {
  const tips = Object.entries(match.tips || {})
  const correctTippers = tips.filter(([, t]) =>
    t.home === match.homeScore && t.away === match.awayScore
  )

  return `
    <div class="archive-match">
      <div class="archive-match-header">
        <span class="archive-match-round">${match.round || match.stage || ''}</span>
        ${correctTippers.length > 0
          ? `<span class="badge badge-finished">${correctTippers.map(([n]) => n).join(', ')}</span>`
          : ''}
      </div>
      <div class="archive-match-result">
        <span class="archive-team">${match.home}</span>
        <span class="archive-score">${match.homeScore} : ${match.awayScore}</span>
        <span class="archive-team">${match.away}</span>
      </div>
      <div class="archive-tips">
        ${tips.map(([player, tip]) => {
          const correct = tip.home === match.homeScore && tip.away === match.awayScore
          return `<span class="archive-tip ${correct ? 'correct' : ''}">${player}: ${tip.home}-${tip.away}</span>`
        }).join('')}
      </div>
    </div>
  `
}
