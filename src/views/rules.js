import { MATCHES } from '../config/schedule.js'
import { RULES_2026 } from '../services/standingsService.js'
import { getPlayers } from '../services/auth.js'

export function renderRules(container) {
  const groupCount = MATCHES.filter(m => m.stage === 'group').length
  const koCount = MATCHES.filter(m => m.stage !== 'group').length
  const players = getPlayers()
  const playerCount = players.length || 7
  const groupBank = playerCount * RULES_2026.groupBet
  const koBank = playerCount * RULES_2026.koMatchBet

  const groupMaxDeposit = groupCount * RULES_2026.groupBet
  const koMaxDeposit = koCount * RULES_2026.koMatchBet
  const totalMaxDeposit = groupMaxDeposit + koMaxDeposit + RULES_2026.winnerBet

  container.innerHTML = `
    <div class="section-header">
      <h1>Pravidla tipovačky</h1>
    </div>

    <div class="rules-page">
      <div class="rules-card">
        <h2>📋 Sázky</h2>
        <ul>
          <li>Základní skupiny: <strong>${RULES_2026.groupBet} Kč</strong> za zápas</li>
          <li>Vyřazovací fáze: <strong>${RULES_2026.koMatchBet} Kč</strong> za zápas</li>
          <li>Tip na celkového vítěze turnaje: <strong>${RULES_2026.winnerBet} Kč</strong> jednorázově</li>
        </ul>
        <p class="rules-note">Sázka je vždy <strong>za jeden zápas</strong>, ne za hrací den.</p>
      </div>

      <div class="rules-card">
        <h2>🏆 Jak se vyhrává</h2>
        <ul>
          <li>Vyhrává hráč, který tipne <strong>přesný výsledek</strong> zápasu — bere celý bank.</li>
          <li>Pokud trefí výsledek <strong>víc hráčů</strong>, bank se mezi ně rovnoměrně rozdělí.</li>
          <li>Pokud <strong>nikdo netrefí</strong>, bank se kumuluje a přechází do dalšího zápasu.</li>
          <li>Bank z neúspěšných tipů ve skupinách se na konci přenese do vyřazovací fáze.</li>
          <li>Při správném tipu na vítěze turnaje hráč bere celý winner bank (carry-over z minulého turnaje + 100 Kč × počet hráčů).</li>
        </ul>
      </div>

      <div class="rules-card">
        <h2>⏱ Deadline</h2>
        <ul>
          <li>Tipy lze podávat do <strong>1,5 hodiny před prvním zápasem</strong> daného hracího dne.</li>
          <li>Před deadline lze tip libovolně měnit (klikni na tužku ✎ u svého tipu).</li>
          <li>Po deadline se tipy uzamknou a všichni vidí tipy ostatních.</li>
          <li>Tip na celkového vítěze lze měnit <strong>do začátku prvního zápasu turnaje</strong>.</li>
        </ul>
      </div>

      <div class="rules-card">
        <h2>💰 MS 2026 — kalkulace</h2>
        <table class="rules-table">
          <tr>
            <td>Základní skupiny</td>
            <td>${groupCount} zápasů × ${RULES_2026.groupBet} Kč</td>
            <td><strong>${groupMaxDeposit} Kč</strong></td>
          </tr>
          <tr>
            <td>Vyřazovací fáze</td>
            <td>${koCount} zápasů × ${RULES_2026.koMatchBet} Kč</td>
            <td><strong>${koMaxDeposit} Kč</strong></td>
          </tr>
          <tr>
            <td>Tip na vítěze</td>
            <td>jednorázově</td>
            <td><strong>${RULES_2026.winnerBet} Kč</strong></td>
          </tr>
          <tr class="rules-table-total">
            <td colspan="2">Maximální vklad na hráče</td>
            <td><strong style="color: var(--color-gold);">${totalMaxDeposit} Kč</strong></td>
          </tr>
        </table>
      </div>

      <div class="rules-card">
        <h2>💳 Platba</h2>
        <p>Platba probíhá ve <strong>dvou částech</strong>:</p>
        <ul>
          <li><strong>1. platba</strong> — Základní skupiny + tip na vítěze (před začátkem turnaje)</li>
          <li><strong>2. platba</strong> — Vyřazovací fáze (před prvním zápasem KO)</li>
        </ul>
        <p class="rules-note">Stav plateb najdeš v sekci Admin.</p>
      </div>
    </div>
  `
}
