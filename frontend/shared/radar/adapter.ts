// TradingBeast RadarResult adapter — shared, pure TypeScript (no React).
//
// Normalizes the raw POST /api/analysis/focus payload (handoff §4) into the
// view model every surface renders from:
//   - status comes from LIST MEMBERSHIP (focus/watch/avoid arrays) only;
//   - bias is text mapped from the payload's BUY/SELL/null — never derived
//     from the score;
//   - score is kept as points, untouched (no rescaling, no implied %);
//   - timestamps are normalized to epoch MILLISECONDS with unit detection
//     (values < 1e12 are treated as seconds);
//   - stale / marketClosed / warnings / skippedCount / orReady pass through.
//
// The sessions adapter converts GET /api/analysis/sessions epoch SECONDS to
// milliseconds at the boundary (handoff §4).

import type { Bias, MarketStatus } from '../design-tokens';

export type { Bias, MarketStatus };

/** Raw pair as returned inside a FocusResult list (subset the UI relies on;
 *  every other payload field is preserved untouched on `raw`). */
export interface RawAnalyzedPair {
  pair: string;
  name?: string;
  kind?: 'fx' | 'asset';
  base?: string;
  quote?: string;
  /** Real hourly-close series for sparklines (backend `spark`); absent when
   *  the run's candle data could not supply one — never synthesized. */
  spark?: number[];
  /** Engine's latest 15m close at scan time (backend `live`); absent in
   *  older persisted payloads — never derived from other fields. */
  live?: number;
  dec?: number;
  score: number;
  bias: 'BUY' | 'SELL' | null;
  stale?: boolean;
  orHigh?: number | null;
  orLow?: number | null;
  orHave?: boolean;
  orConfirmed?: boolean;
  orLive?: boolean;
  adrPct?: number | null;
  rsi?: number;
  atr15?: number;
  d4?: number;
  d1?: number;
  d15?: number;
  div?: 'BULLISH' | 'BEARISH' | null;
  obstacle?: number | null;
  roomATR?: number | null;
  cramped?: boolean;
  stretched?: boolean;
  divAgainst?: boolean;
  extended?: boolean;
  ts4?: number;
  ts1?: number;
  ts15?: number;
  [key: string]: unknown;
}

export interface RawFocusResult {
  session: string;
  /** ISO string, epoch seconds, or epoch ms — normalized by the adapter. */
  timestamp: string | number;
  scope: string;
  focus: RawAnalyzedPair[];
  watch: RawAnalyzedPair[];
  avoid: RawAnalyzedPair[];
  warnings?: string[];
  marketClosed?: boolean;
  closedAssets?: string[];
  skippedCount?: number;
  orReady?: boolean;
}

export interface RadarPairView {
  /** Display name, normalized consistently with the API types: assets show
   *  their `name`, FX pairs show their `pair` code. */
  pair: string;
  displayName: string;
  kind: 'fx' | 'asset';
  /** Currency codes when the payload carries them (flag rendering). */
  base: string | null;
  quote: string | null;
  /** Real sparkline series (hourly closes); null when the payload has none. */
  spark: number[] | null;
  /** Scan-time price (latest 15m close); null when the payload has none. */
  live: number | null;
  dec: number;
  status: MarketStatus;
  bias: Bias;
  /** Score in points — exactly as the API returned it. */
  score: number;
  stale: boolean;
  orHigh: number | null;
  orLow: number | null;
  orHave: boolean;
  orConfirmed: boolean;
  orLive: boolean;
  adrPct: number | null;
  rsi: number | null;
  atr15: number | null;
  d4: number | null;
  d1: number | null;
  d15: number | null;
  div: 'BULLISH' | 'BEARISH' | null;
  obstacle: number | null;
  roomATR: number | null;
  cramped: boolean;
  stretched: boolean;
  divAgainst: boolean;
  extended: boolean;
  /** Candle timestamps normalized to epoch ms (null when absent). */
  ts4: number | null;
  ts1: number | null;
  ts15: number | null;
  raw: RawAnalyzedPair;
}

export interface RadarResultView {
  /** Persisted run ID when this view came from run history; null for a
   *  fresh in-memory POST result that has not been linked to a run. */
  runId: string | null;
  session: string;
  scope: string;
  /** Scan timestamp, epoch ms. */
  timestampMs: number;
  focus: RadarPairView[];
  watch: RadarPairView[];
  avoid: RadarPairView[];
  /** All pairs in focus → watch → avoid order, each with its list status. */
  all: RadarPairView[];
  warnings: string[];
  marketClosed: boolean;
  closedAssets: string[];
  skippedCount: number;
  orReady: boolean;
}

/** Epoch unit detection: values below 1e12 are seconds, otherwise ms. */
export function toEpochMs(value: number): number {
  return value < 1e12 ? value * 1000 : value;
}

function timestampToMs(value: string | number): number {
  if (typeof value === 'number') return toEpochMs(value);
  const asNumber = Number(value);
  if (value.trim() !== '' && Number.isFinite(asNumber)) return toEpochMs(asNumber);
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pairTimestampToMs(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? toEpochMs(value) : null;
}

/** BUY → Bullish, SELL → Bearish, null/absent → Neutral. Text only. */
export function mapBias(raw: 'BUY' | 'SELL' | null | undefined): Bias {
  if (raw === 'BUY') return 'bullish';
  if (raw === 'SELL') return 'bearish';
  return 'neutral';
}

/** Display-name normalization, consistent with the existing API types:
 *  assets are labelled by `name`, FX pairs by their `pair` code. */
export function pairDisplayName(raw: RawAnalyzedPair): string {
  if (raw.kind === 'asset' && raw.name) return raw.name;
  return raw.pair;
}

function toPairView(raw: RawAnalyzedPair, status: MarketStatus): RadarPairView {
  return {
    pair: raw.pair,
    displayName: pairDisplayName(raw),
    kind: raw.kind ?? 'fx',
    base: raw.base ?? null,
    quote: raw.quote ?? null,
    spark:
      Array.isArray(raw.spark) && raw.spark.length >= 2 && raw.spark.every(Number.isFinite)
        ? raw.spark
        : null,
    live: typeof raw.live === 'number' && Number.isFinite(raw.live) ? raw.live : null,
    dec: raw.dec ?? 0,
    status,
    bias: mapBias(raw.bias),
    score: raw.score,
    stale: raw.stale ?? false,
    orHigh: raw.orHigh ?? null,
    orLow: raw.orLow ?? null,
    orHave: raw.orHave ?? false,
    orConfirmed: raw.orConfirmed ?? false,
    orLive: raw.orLive ?? false,
    adrPct: raw.adrPct ?? null,
    rsi: typeof raw.rsi === 'number' ? raw.rsi : null,
    atr15: typeof raw.atr15 === 'number' ? raw.atr15 : null,
    d4: typeof raw.d4 === 'number' ? raw.d4 : null,
    d1: typeof raw.d1 === 'number' ? raw.d1 : null,
    d15: typeof raw.d15 === 'number' ? raw.d15 : null,
    div: raw.div ?? null,
    obstacle: raw.obstacle ?? null,
    roomATR: raw.roomATR ?? null,
    cramped: raw.cramped ?? false,
    stretched: raw.stretched ?? false,
    divAgainst: raw.divAgainst ?? false,
    extended: raw.extended ?? false,
    ts4: pairTimestampToMs(raw.ts4),
    ts1: pairTimestampToMs(raw.ts1),
    ts15: pairTimestampToMs(raw.ts15),
    raw,
  };
}

/** Normalize a raw FocusResult payload into the Radar view model. */
export function adaptFocusResult(
  raw: RawFocusResult,
  opts?: { runId?: string | null },
): RadarResultView {
  const focus = (raw.focus ?? []).map((p) => toPairView(p, 'focus'));
  const watch = (raw.watch ?? []).map((p) => toPairView(p, 'watch'));
  const avoid = (raw.avoid ?? []).map((p) => toPairView(p, 'avoid'));
  return {
    runId: opts?.runId ?? null,
    session: raw.session,
    scope: raw.scope,
    timestampMs: timestampToMs(raw.timestamp),
    focus,
    watch,
    avoid,
    all: [...focus, ...watch, ...avoid],
    warnings: raw.warnings ?? [],
    marketClosed: raw.marketClosed ?? false,
    closedAssets: raw.closedAssets ?? [],
    skippedCount: raw.skippedCount ?? 0,
    orReady: raw.orReady ?? false,
  };
}

/** One mapped run from GET /api/analysis/runs* (backend radar-history). */
export interface RadarRunPayload {
  runId: string;
  session: string | null;
  scope: string | null;
  completedAt: string | null;
  startedAt: string;
  result: RawFocusResult | null;
}

/**
 * Normalize a history run into the Radar view model. The stored `result` is
 * a raw FocusResult, so this is the same normalization as a fresh POST
 * response — freshness therefore reflects the run's real scan timestamp,
 * never "now". Returns null when the payload carries no usable result.
 */
export function adaptRadarRun(run: RadarRunPayload): RadarResultView | null {
  if (!run.result || typeof run.result !== 'object') return null;
  if (typeof run.result.session !== 'string' || !run.result.session) return null;
  return adaptFocusResult(run.result, { runId: run.runId });
}

// ---------------------------------------------------------------------------
// Sessions adapter — GET /api/analysis/sessions (epoch SECONDS at the wire).
// ---------------------------------------------------------------------------

export interface RawSessionWindow {
  session: string;
  zone: string;
  sessionDate?: string;
  sessionStartTs: number;
  sessionEndTs: number;
  orEndTs: number;
  nextStartTs: number;
  orDone: boolean;
  active: boolean;
  fxWeekOpen?: boolean;
  [key: string]: unknown;
}

export interface RawSessionsOverview {
  asOf: string;
  fxWeekOpen: boolean;
  selected: string;
  active: string[];
  overlap: boolean;
  sessions: RawSessionWindow[];
  calendarPolicy?: string;
}

export interface SessionWindowView {
  session: string;
  zone: string;
  sessionDate: string | null;
  /** All timestamps epoch ms (converted from wire seconds). */
  sessionStartMs: number;
  sessionEndMs: number;
  orEndMs: number;
  nextStartMs: number;
  orDone: boolean;
  active: boolean;
}

export interface SessionsOverviewView {
  asOfMs: number;
  fxWeekOpen: boolean;
  selected: string;
  active: string[];
  overlap: boolean;
  sessions: SessionWindowView[];
  calendarPolicy: string | null;
  /** The next session transition (open or close) after asOf, epoch ms. */
  nextTransition: { session: string; atMs: number; kind: 'opens' | 'closes' } | null;
}

export function adaptSessions(raw: RawSessionsOverview): SessionsOverviewView {
  const asOfMs = timestampToMs(raw.asOf);
  const sessions: SessionWindowView[] = (raw.sessions ?? []).map((s) => ({
    session: s.session,
    zone: s.zone,
    sessionDate: s.sessionDate ?? null,
    sessionStartMs: toEpochMs(s.sessionStartTs),
    sessionEndMs: toEpochMs(s.sessionEndTs),
    orEndMs: toEpochMs(s.orEndTs),
    nextStartMs: toEpochMs(s.nextStartTs),
    orDone: s.orDone,
    active: s.active,
  }));

  let nextTransition: SessionsOverviewView['nextTransition'] = null;
  for (const s of sessions) {
    const candidates: { atMs: number; kind: 'opens' | 'closes' }[] = s.active
      ? [{ atMs: s.sessionEndMs, kind: 'closes' }]
      : [{ atMs: s.nextStartMs, kind: 'opens' }];
    for (const c of candidates) {
      if (c.atMs > asOfMs && (!nextTransition || c.atMs < nextTransition.atMs)) {
        nextTransition = { session: s.session, atMs: c.atMs, kind: c.kind };
      }
    }
  }

  return {
    asOfMs,
    fxWeekOpen: raw.fxWeekOpen,
    selected: raw.selected,
    active: raw.active ?? [],
    overlap: raw.overlap ?? false,
    sessions,
    calendarPolicy: raw.calendarPolicy ?? null,
    nextTransition,
  };
}

/**
 * The next session OPENING after the overview's as-of time — distinct from
 * `nextTransition`, which for an active session is its CLOSE. The Home hero
 * "Next:" row must name the next session that opens (reference 03), so it
 * uses this selector. The returned window's start/end are shifted to that
 * next occurrence (same duration and zone as the source window).
 */
export interface NextOpeningView {
  session: string;
  zone: string;
  startMs: number;
  endMs: number;
}

export function nextOpening(overview: SessionsOverviewView): NextOpeningView | null {
  let best: NextOpeningView | null = null;
  for (const s of overview.sessions) {
    if (s.nextStartMs <= overview.asOfMs) continue;
    if (best && s.nextStartMs >= best.startMs) continue;
    best = {
      session: s.session,
      zone: s.zone,
      startMs: s.nextStartMs,
      endMs: s.nextStartMs + (s.sessionEndMs - s.sessionStartMs),
    };
  }
  return best;
}

/**
 * Top-N shortlist for Home (reference 03): a copy of the result's pairs
 * sorted by score descending (stable for ties), truncated to `count`.
 * The stored result itself is never mutated.
 */
export function topShortlist(result: RadarResultView, count = 3): RadarPairView[] {
  return [...result.all].sort((a, b) => b.score - a.score).slice(0, count);
}
