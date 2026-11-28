// Pure flag-mapping helpers (no React) — the data half of PairFlags,
// split out so it is unit-testable without a DOM/React environment.

export type FlagCode = 'EU' | 'US' | 'GB' | 'JP' | 'CH' | 'AU' | 'NZ' | 'CA';

const CURRENCY_TO_FLAG: Record<string, FlagCode> = {
  EUR: 'EU',
  USD: 'US',
  GBP: 'GB',
  JPY: 'JP',
  CHF: 'CH',
  AUD: 'AU',
  NZD: 'NZ',
  CAD: 'CA',
};

/** Resolve the two currency codes for a pair, preferring payload fields. */
export function parsePairCurrencies(
  pair: string,
  base?: string | null,
  quote?: string | null,
): [string, string] | null {
  if (base && quote) return [base.toUpperCase(), quote.toUpperCase()];
  const parts = pair.split('/').map((s) => s.trim().toUpperCase());
  if (parts.length === 2 && parts[0] && parts[1]) return [parts[0], parts[1]];
  return null;
}

/** Flag art code for a currency, or null when no art exists (the UI then
 *  falls back to an initials medallion — never a wrong flag). */
export function flagForCurrency(currency: string): FlagCode | null {
  return CURRENCY_TO_FLAG[currency.toUpperCase()] ?? null;
}
