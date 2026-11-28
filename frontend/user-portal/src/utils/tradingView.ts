/**
 * TradingView free-widget symbol mapping (Onboarding + Conversion chapter).
 *
 * The portal's instrument codes come from the analysis engine: FX pairs in
 * "EUR/USD" form and assets by display name ("Gold", "Silver", "Oil",
 * "Bitcoin"). The Advanced Real-Time Chart widget needs an exchange-
 * prefixed symbol, so this module is the single place that translation
 * happens. Anything it cannot map returns null and the caller keeps the
 * honest unavailable chart state — never a guessed symbol.
 */

const ASSET_SYMBOLS: Record<string, string> = {
  GOLD: 'OANDA:XAUUSD',
  XAUUSD: 'OANDA:XAUUSD',
  SILVER: 'OANDA:XAGUSD',
  XAGUSD: 'OANDA:XAGUSD',
  OIL: 'TVC:USOIL',
  WTIOIL: 'TVC:USOIL',
  WTI: 'TVC:USOIL',
  USOIL: 'TVC:USOIL',
  BITCOIN: 'BITSTAMP:BTCUSD',
  BTCUSD: 'BITSTAMP:BTCUSD',
  BTC: 'BITSTAMP:BTCUSD',
};

/** Portal timeframe → TradingView widget interval code. */
export const TV_INTERVALS = {
  '15m': '15',
  '1H': '60',
  '4H': '240',
} as const;

export type PortalTimeframe = keyof typeof TV_INTERVALS;

/**
 * Map a portal instrument code ("EUR/USD", "Gold", "XAUUSD", …) to the
 * TradingView widget symbol, or null when there is no validated mapping.
 */
export function tradingViewSymbol(code: string): string | null {
  if (!code) return null;
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const asset = ASSET_SYMBOLS[normalized];
  if (asset) return asset;
  // FX pairs are exactly two 3-letter currency codes once normalized.
  if (/^[A-Z]{6}$/.test(normalized)) return `FX:${normalized}`;
  return null;
}
