/**
 * TradingView free-widget symbol mapping (owner chapter: in-app charts via
 * TradingView's embeddable Advanced Real-Time Chart widget).
 *
 * Inputs are the app's own instrument identifiers: FX pairs arrive as
 * "EUR/USD" (display) or "EURUSD"; assets arrive by display name ("Gold",
 * "Silver", "Oil", "Bitcoin") or canonical code (XAUUSD, XAGUSD, OIL,
 * BTCUSD). Anything unrecognized maps to null so the caller can fall back
 * to the honest chart-unavailable card instead of showing a wrong chart.
 */

const ASSET_SYMBOLS: Record<string, string> = {
  GOLD: 'OANDA:XAUUSD',
  XAUUSD: 'OANDA:XAUUSD',
  SILVER: 'OANDA:XAGUSD',
  XAGUSD: 'OANDA:XAGUSD',
  OIL: 'TVC:USOIL',
  WTIOIL: 'TVC:USOIL',
  USOIL: 'TVC:USOIL',
  BITCOIN: 'BITSTAMP:BTCUSD',
  BTC: 'BITSTAMP:BTCUSD',
  BTCUSD: 'BITSTAMP:BTCUSD',
};

export interface SymbolInput {
  /** Pair code / display label as stored in scan results, e.g. "EUR/USD" or "Gold". */
  pair: string;
  kind?: 'fx' | 'asset';
  base?: string | null;
  quote?: string | null;
}

/** Canonical 6-letter FX code ("EUR/USD" / "EURUSD" / base+quote) or null. */
function fxCode(input: SymbolInput): string | null {
  if (input.base && input.quote) {
    const code = `${input.base}${input.quote}`.toUpperCase();
    return /^[A-Z]{6}$/.test(code) ? code : null;
  }
  const compact = input.pair.toUpperCase().replace(/[^A-Z]/g, '');
  return /^[A-Z]{6}$/.test(compact) ? compact : null;
}

export function tradingViewSymbol(input: SymbolInput): string | null {
  const compact = input.pair.toUpperCase().replace(/[^A-Z]/g, '');
  const asset = ASSET_SYMBOLS[compact];
  if (asset) return asset;
  if (input.kind === 'asset') return null;
  const code = fxCode(input);
  return code ? `FX:${code}` : null;
}

/** TradingView widget interval codes for the app's timeframe selector. */
export function tradingViewInterval(timeframe: '15m' | '1H' | '4H'): string {
  switch (timeframe) {
    case '15m':
      return '15';
    case '1H':
      return '60';
    case '4H':
      return '240';
  }
}

export const TRADINGVIEW_WIDGET_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
