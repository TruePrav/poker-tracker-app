/** Format cents to BBD dollar string */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `BBD $${dollars.toFixed(2)}`;
}

/** Format cents to short dollar string (no decimals if whole) */
export function formatCurrencyShort(cents: number): string {
  const dollars = cents / 100;
  if (dollars === Math.floor(dollars)) {
    return `$${dollars}`;
  }
  return `$${dollars.toFixed(2)}`;
}
