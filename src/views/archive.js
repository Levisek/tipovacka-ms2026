import archive2022 from '../config/archive2022.json'
import archiveEuro2024 from '../config/archiveEuro2024.json'

// Pravidla sázek (sázka je vždy za zápas)
const RULES = {
  'MS 2022': { groupBet: 10, koMatchBet: 40, winnerBet: 100 },
  'Euro 2024': { groupBet: 20, koMatchBet: 40, winnerBet: 100 },
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
  // POZN.: Sloupec "Součet peněz" v Excelu listu Vyřazovací fáze obsahuje
  // celkový součet (skupiny + vyřazovačka), takže koTotals.money už zahrnuje gWin.
  const cashTable = players.map(p => {
    const gWin = (data.groupTotals[p] || {}).money || 0
    const kTotalFromExcel = (data.koTotals[p] || {}).money || 0
    const koOnlyWin = Math.max(0, kTotalFromExcel - gWin) // čistá výhra z KO

    const gDeposit = groupMatchCounts[p] * rules.groupBet
    const kDeposit = koMatchCounts[p] * rules.koMatchBet // 40 Kč za zápas
    const winnerDeposit = data.winnerBets[p] ? rules.winnerBet : 0
    const totalDeposit = gDeposit + kDeposit + winnerDeposit

    const winnerBonus = data.winnerBets[p]?.trim() === data.actualWinner
      ? rules.winnerBet * players.length
      : 0
    const totalWin = kTotalFromExcel + winnerBonus
    const profit = totalWin - totalDeposit

    return {
      name: p,
      groupWin: gWin,
      koWin: koOnlyWin,
      groupDeposit: gDeposit,
      koDeposit: kDeposit,
      winnerDeposit,
      totalWin,
      totalDeposit,
      profit
    }
  }).sort((a, b) => b.profit - a.profit)

  // Zkontroluj jestli někdo trefil vítěze
  const anyoneGotWinner = players.some(p => data.winnerBets[p]?.trim() === data.actualWinner)

  const totalKoMatches = data.koMatches.length

  content.innerHTML = `
    <div class="archive-header">
      <h2>${title}</h2>
      <p style="color: var(--color-text-dim)">
        Vítěz turnaje: <strong style="color: var(--color-gold)">${data.actualWinner}</strong>
        ${!anyoneGotWinner ? ' — <span style="color: var(--color-locked)">nikdo netipoval!</span>' : ''}
      </p>
    </div>

    <!-- PRAVIDLA -->
    <details class="archive-rules">
      <summary>Pravidla a výpočet sázek</summary>
      <div class="archive-rules-content">
        <p><strong>Sázky (vždy za zápas):</strong></p>
        <ul>
          <li>Základní skupiny: <strong>${rules.groupBet} Kč</strong> za zápas (${data.groupMatches.length} zápasů → max <strong>${data.groupMatches.length * rules.groupBet} Kč</strong>)</li>
          <li>Vyřazovací fáze: <strong>${rules.koMatchBet} Kč</strong> za zápas (${totalKoMatches} zápasů → max <strong>${totalKoMatches * rules.koMatchBet} Kč</strong>)</li>
          <li>Tip na celkového vítěze: <strong>${rules.winnerBet} Kč</strong></li>
        </ul>
        <p><strong>Maximální vklad na hráče:</strong> ${data.groupMatches.length * rules.groupBet + totalKoMatches * rules.koMatchBet + rules.winnerBet} Kč</p>
        <p><strong>Jak se vyhrává:</strong></p>
        <ul>
          <li>Bank zápasu = ${players.length} hráčů × sázka (${rules.groupBet} Kč ve skupinách / ${rules.koMatchBet} Kč v KO)</li>
          <li>Vyhrává hráč, který tipne přesný výsledek zápasu — bere celý bank</li>
          <li>Pokud trefí víc hráčů, bank se mezi ně rovnoměrně dělí</li>
          <li>Pokud nikdo netrefí, bank přechází do dalšího zápasu (kumuluje se)</li>
          <li>Bank z neúspěšných tipů ve skupinách se na konci přenese do vyřazovací fáze</li>
          <li>Při správném tipu na vítěze turnaje vyhrává hráč ${rules.winnerBet} Kč × počet hráčů</li>
        </ul>
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
        Skupiny: ${rules.groupBet} Kč/zápas · Vyřazovačka: ${rules.koMatchBet} Kč/zápas · Tip na vítěze: ${rules.winnerBet} Kč
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
            ${(() => {
              const sumGroupWin = cashTable.reduce((s, p) => s + p.groupWin, 0)
              const sumKoWin = cashTable.reduce((s, p) => s + p.koWin, 0)
              const sumDep = cashTable.reduce((s, p) => s + p.totalDeposit, 0)
              const sumWin = cashTable.reduce((s, p) => s + p.totalWin, 0)
              const sumProfit = sumWin - sumDep
              return `
                <tr style="border-top: 2px solid var(--color-border); font-weight: 700;">
                  <td colspan="2" style="text-align: right; color: var(--color-text-dim);">Σ celkem</td>
                  <td style="color: var(--color-gold);">${sumGroupWin} Kč</td>
                  <td style="color: var(--color-gold);">${sumKoWin} Kč</td>
                  <td style="color: var(--color-text-dim);">${sumDep} Kč</td>
                  <td style="color: var(--color-gold);">${sumWin} Kč</td>
                  <td style="color: ${sumProfit >= 0 ? 'var(--color-open)' : 'var(--color-locked)'};">
                    ${sumProfit > 0 ? '+' : ''}${sumProfit} Kč
                  </td>
                </tr>
              `
            })()}
          </tbody>
        </table>
      </div>
      <p style="color: var(--color-text-dim); font-size: 12px; margin-top: 8px;">
        Pozn.: Bank z neúspěšných tipů ve skupinách přechází do vyřazovací fáze, takže celkové výhry mohou převyšovat vlastní vklady hráčů.
      </p>
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
