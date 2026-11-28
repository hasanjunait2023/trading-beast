/** Full currency names for the reference's "Euro / US Dollar" row
 *  subtitles. The catalog's FX `name` is the pair code itself, so names
 *  are formed locally for the eight catalog currencies (same map as the
 *  Mini App, R1). */
export const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  GBP: 'British Pound',
  USD: 'US Dollar',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar',
  CAD: 'Canadian Dollar',
};

export function fxFullName(base?: string | null, quote?: string | null): string | undefined {
  if (base && quote && CURRENCY_NAMES[base] && CURRENCY_NAMES[quote]) {
    return `${CURRENCY_NAMES[base]} / ${CURRENCY_NAMES[quote]}`;
  }
  return undefined;
}
