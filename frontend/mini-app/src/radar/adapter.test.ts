import { describe, expect, it } from 'vitest';
import {
  adaptFocusResult,
  adaptSessions,
  mapBias,
  toEpochMs,
  type RawAnalyzedPair,
  type RawFocusResult,
} from '@shared/radar/adapter';

function pair(overrides: Partial<RawAnalyzedPair>): RawAnalyzedPair {
  return {
    pair: 'EUR/USD',
    name: 'EUR/USD',
    kind: 'fx',
    dec: 5,
    score: 50,
    bias: null,
    stale: false,
    ts4: 1_700_000_000, // seconds
    ts1: 1_700_000_000_000, // ms
    ts15: 1_700_000_900, // seconds
    ...overrides,
  };
}

function result(overrides: Partial<RawFocusResult>): RawFocusResult {
  return {
    session: 'London',
    timestamp: '2023-11-14T22:13:20.000Z',
    scope: 'watchlist',
    focus: [],
    watch: [],
    avoid: [],
    warnings: [],
    marketClosed: false,
    closedAssets: [],
    skippedCount: 0,
    orReady: true,
    ...overrides,
  };
}

describe('status from list membership', () => {
  it('assigns focus/watch/avoid strictly by which array contains the pair', () => {
    const view = adaptFocusResult(
      result({
        focus: [pair({ pair: 'EUR/USD', score: 10 })],
        watch: [pair({ pair: 'GBP/USD', score: 99 })],
        avoid: [pair({ pair: 'USD/JPY', score: 88 })],
      }),
    );
    // Score must not influence status: the 99-point pair stays "watch".
    expect(view.focus[0].status).toBe('focus');
    expect(view.watch[0].status).toBe('watch');
    expect(view.avoid[0].status).toBe('avoid');
    expect(view.all.map((p) => p.status)).toEqual(['focus', 'watch', 'avoid']);
  });
});

describe('bias mapping', () => {
  it('maps BUY/SELL/null to bullish/bearish/neutral', () => {
    expect(mapBias('BUY')).toBe('bullish');
    expect(mapBias('SELL')).toBe('bearish');
    expect(mapBias(null)).toBe('neutral');
    expect(mapBias(undefined)).toBe('neutral');
  });

  it('keeps bias independent of score', () => {
    const view = adaptFocusResult(
      result({ focus: [pair({ score: 95, bias: null })] }),
    );
    expect(view.focus[0].bias).toBe('neutral');
  });
});

describe('score handling', () => {
  it('keeps the score untouched (points, no rescaling)', () => {
    const view = adaptFocusResult(
      result({ focus: [pair({ score: 73.5 })] }),
    );
    expect(view.focus[0].score).toBe(73.5);
  });
});

describe('timestamp unit detection', () => {
  it('treats values < 1e12 as seconds and larger values as ms', () => {
    expect(toEpochMs(1_700_000_000)).toBe(1_700_000_000_000);
    expect(toEpochMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('normalizes the result timestamp from ISO, seconds and ms', () => {
    expect(adaptFocusResult(result({ timestamp: 1_700_000_000 })).timestampMs).toBe(
      1_700_000_000_000,
    );
    expect(
      adaptFocusResult(result({ timestamp: 1_700_000_000_000 })).timestampMs,
    ).toBe(1_700_000_000_000);
    expect(
      adaptFocusResult(result({ timestamp: '2023-11-14T22:13:20.000Z' })).timestampMs,
    ).toBe(1_700_000_000_000);
  });

  it('normalizes per-pair candle timestamps (ts4/ts1/ts15) per-field', () => {
    const view = adaptFocusResult(result({ focus: [pair({})] }));
    const p = view.focus[0];
    expect(p.ts4).toBe(1_700_000_000_000); // was seconds
    expect(p.ts1).toBe(1_700_000_000_000); // was already ms
    expect(p.ts15).toBe(1_700_000_900_000); // was seconds
  });

  it('returns null for absent pair timestamps', () => {
    const view = adaptFocusResult(
      result({ focus: [pair({ ts4: undefined, ts1: undefined, ts15: undefined })] }),
    );
    expect(view.focus[0].ts4).toBeNull();
    expect(view.focus[0].ts1).toBeNull();
    expect(view.focus[0].ts15).toBeNull();
  });
});

describe('sessions adapter (seconds -> ms)', () => {
  const rawSessions = {
    asOf: '2023-11-14T22:13:20.000Z',
    fxWeekOpen: true,
    selected: 'London',
    active: ['London'],
    overlap: false,
    calendarPolicy: 'standard-week-no-holidays',
    sessions: [
      {
        session: 'London',
        zone: 'Europe/London',
        sessionDate: '2023-11-14',
        sessionStartTs: 1_699_948_800,
        sessionEndTs: 1_699_981_200,
        orEndTs: 1_699_952_400,
        nextStartTs: 1_700_035_200,
        orDone: true,
        active: true,
      },
      {
        session: 'New York',
        zone: 'America/New_York',
        sessionDate: '2023-11-14',
        sessionStartTs: 1_699_970_400,
        sessionEndTs: 1_700_002_800,
        orEndTs: 1_699_974_000,
        nextStartTs: 1_700_056_800,
        orDone: false,
        active: false,
      },
    ],
  };

  it('converts every session epoch-seconds field to ms', () => {
    const view = adaptSessions(rawSessions);
    const london = view.sessions[0];
    expect(london.sessionStartMs).toBe(1_699_948_800_000);
    expect(london.sessionEndMs).toBe(1_699_981_200_000);
    expect(london.orEndMs).toBe(1_699_952_400_000);
    expect(london.nextStartMs).toBe(1_700_035_200_000);
    expect(view.asOfMs).toBe(1_700_000_000_000);
  });

  it('derives the next transition from converted times', () => {
    const view = adaptSessions(rawSessions);
    // asOf = 1_700_000_000s; New York closes at 1_700_002_800s (active? no —
    // it is inactive, so its next start 1_700_056_800s competes with London's
    // close at 1_699_981_200s which is in the past). Next = NY opens.
    expect(view.nextTransition).toEqual({
      session: 'New York',
      atMs: 1_700_056_800_000,
      kind: 'opens',
    });
  });
});

describe('passthrough fields', () => {
  it('passes stale through per pair and result-level quality fields through', () => {
    const view = adaptFocusResult(
      result({
        focus: [pair({ stale: true })],
        warnings: ['Feed delayed'],
        marketClosed: true,
        closedAssets: ['Gold'],
        skippedCount: 3,
        orReady: false,
      }),
    );
    expect(view.focus[0].stale).toBe(true);
    expect(view.warnings).toEqual(['Feed delayed']);
    expect(view.marketClosed).toBe(true);
    expect(view.closedAssets).toEqual(['Gold']);
    expect(view.skippedCount).toBe(3);
    expect(view.orReady).toBe(false);
  });

  it('normalizes the display name: assets by name, FX by pair code', () => {
    const view = adaptFocusResult(
      result({
        focus: [
          pair({ pair: 'EUR/USD', name: 'Euro / US Dollar', kind: 'fx' }),
          pair({ pair: 'Gold', name: 'Gold', kind: 'asset' }),
        ],
      }),
    );
    expect(view.focus[0].displayName).toBe('EUR/USD');
    expect(view.focus[1].displayName).toBe('Gold');
  });
});
