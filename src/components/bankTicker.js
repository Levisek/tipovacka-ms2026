/**
 * Vykreslí bank ticker
 * @param {number} amount - aktuální bank v Kč
 */
export function renderBankTicker(amount) {
  return `
    <div class="bank-ticker">
      <span class="label">Bank</span>
      <span class="amount">${amount} Kč</span>
    </div>
  `
}
