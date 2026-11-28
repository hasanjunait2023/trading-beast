import { buildPairs } from './analysis-engine.js';

/**
 * Instrument catalog (B5, handoff §3 row 04 / §5).
 *
 * Derived directly from the analysis engine's buildPairs() definitions so
 * the API can never drift from the instruments the engine actually scans.
 * ONLY fields that genuinely exist on PairConfig are exposed:
 *   pair (display label), code (canonical catalog label — the same string
 *   watchlist/journal normalization resolves to), kind, name, decimals
 *   (PairConfig.dec), the Yahoo symbol the market-data layer fetches, and —
 *   only where the engine defines them — base/quote (FX) and group/sessions
 *   (assets).
 *
 * Contract metadata (contract size, tick value, lot step, margin rate) does
 * NOT exist anywhere in the engine, so it is deliberately ABSENT here —
 * never null-filled with guesses. That absence is exactly why the
 * contract-dependent risk tools report MISSING_CONTRACT_METADATA
 * (see services/tools.ts).
 */
export interface Instrument {
  /** Display label, e.g. "EUR/USD" or "Gold". */
  pair: string;
  /** Canonical catalog code — identical to `pair` today; kept distinct so
   *  the code/display distinction (handoff §4, /pairs) survives a future
   *  rename of display labels. */
  code: string;
  kind: 'fx' | 'asset';
  name: string;
  /** Price decimal places used by the engine for this instrument. */
  decimals: number;
  /** Market-data symbol the snapshot service fetches for this instrument. */
  yahoo: string;
  base?: string;
  quote?: string;
  group?: string;
  sessions?: string[] | null;
}

export function listInstruments(): Instrument[] {
  return buildPairs().map((p) => {
    const instrument: Instrument = {
      pair: p.pair,
      code: p.pair,
      kind: p.kind,
      name: p.name,
      decimals: p.dec,
      yahoo: p.yahoo,
    };
    if (p.base !== undefined) instrument.base = p.base;
    if (p.quote !== undefined) instrument.quote = p.quote;
    if (p.group !== undefined) instrument.group = p.group;
    if (p.sessions !== undefined) instrument.sessions = p.sessions;
    return instrument;
  });
}
