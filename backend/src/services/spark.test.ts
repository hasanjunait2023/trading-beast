import { describe, expect, it } from 'vitest';
import { attachSparks, sparkFromCloses } from './market-data.js';
import { buildPairs, type FocusResult } from './analysis-engine.js';
import type { Candle } from './yahoo.js';

const candle = (ts: number, c: number): Candle => ({ ts, o: c, h: c, l: c, c });
const series = (closes: number[]): Candle[] => closes.map((c, i) => candle(3600 * (i + 1), c));

describe('sparkFromCloses', () => {
  it('returns the closes in order when at least 2 exist', () => {
    expect(sparkFromCloses(series([1.1, 1.2, 1.15]))).toEqual([1.1, 1.2, 1.15]);
  });

  it('keeps only the last 24 closes', () => {
    const closes = Array.from({ length: 30 }, (_, i) => i + 1);
    const spark = sparkFromCloses(series(closes));
    expect(spark).toHaveLength(24);
    expect(spark?.[0]).toBe(7);
    expect(spark?.[23]).toBe(30);
  });

  it('returns undefined for fewer than 2 candles', () => {
    expect(sparkFromCloses([])).toBeUndefined();
    expect(sparkFromCloses(series([1.1]))).toBeUndefined();
  });

  it('drops non-finite closes instead of emitting them', () => {
    const bad = [candle(3600, 1.1), candle(7200, Number.NaN), candle(10800, 1.3)];
    expect(sparkFromCloses(bad)).toEqual([1.1, 1.3]);
    expect(sparkFromCloses([candle(3600, Number.NaN)])).toBeUndefined();
  });
});

describe('attachSparks', () => {
  it('attaches real hourly closes per pair and omits pairs without data', () => {
    const known = buildPairs()[0];
    const result = {
      session: 'London',
      timestamp: new Date(0).toISOString(),
      scope: 'all',
      focus: [{ pair: known.pair }, { pair: 'NOPE/USD' }],
      watch: [],
      avoid: [],
      warnings: [],
      marketClosed: false,
      closedAssets: [],
      skippedCount: 0,
      orReady: true,
    } as unknown as FocusResult;

    attachSparks(result, new Map([[known.yahoo, series([1.0, 1.1, 1.2])]]));

    expect(result.focus[0].spark).toEqual([1.0, 1.1, 1.2]);
    expect(result.focus[1].spark).toBeUndefined();
  });
});
