import { describe, it, expect } from 'vitest';
import { listInstruments } from './instruments.js';
import { buildPairs } from './analysis-engine.js';
import { canonicalInstrument } from './watchlist.js';

describe('instruments catalog (B5)', () => {
  const instruments = listInstruments();

  it('is derived from buildPairs(): same count, same order, same labels', () => {
    const pairs = buildPairs();
    expect(instruments).toHaveLength(pairs.length);
    expect(instruments.map((i) => i.pair)).toEqual(pairs.map((p) => p.pair));
    expect(instruments.map((i) => i.decimals)).toEqual(pairs.map((p) => p.dec));
    expect(instruments.map((i) => i.yahoo)).toEqual(pairs.map((p) => p.yahoo));
  });

  it('codes are the canonical catalog labels the watchlist resolves to', () => {
    for (const i of instruments) {
      expect(canonicalInstrument(i.code.toLowerCase())).toBe(i.code);
    }
  });

  it('classifies the four assets as kind=asset with their engine groups', () => {
    const byPair = new Map(instruments.map((i) => [i.pair, i]));
    expect(byPair.get('Gold')).toMatchObject({ kind: 'asset', group: 'METALS', decimals: 2 });
    expect(byPair.get('Silver')).toMatchObject({ kind: 'asset', group: 'METALS', decimals: 3 });
    expect(byPair.get('Oil')).toMatchObject({ kind: 'asset', group: 'OIL', decimals: 2 });
    expect(byPair.get('Bitcoin')).toMatchObject({ kind: 'asset', group: 'BTC', decimals: 1 });
  });

  it('FX instruments carry base/quote and JPY pairs use 3 decimals', () => {
    const fx = instruments.filter((i) => i.kind === 'fx');
    expect(fx).toHaveLength(28);
    for (const i of fx) {
      expect(i.pair).toBe(`${i.base}/${i.quote}`);
      expect(i.decimals).toBe(i.quote === 'JPY' ? 3 : 5);
    }
  });

  it('contains NO contract metadata fields — the engine defines none', () => {
    const forbidden = [
      'contractSize', 'tickValue', 'tickSize', 'lotStep', 'lotSize',
      'pipValue', 'marginRate', 'leverage', 'minLot', 'maxLot',
    ];
    for (const i of instruments) {
      for (const field of forbidden) {
        expect(i).not.toHaveProperty(field);
      }
    }
  });
});
