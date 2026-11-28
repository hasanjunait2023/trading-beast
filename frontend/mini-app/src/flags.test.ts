import { describe, expect, it } from 'vitest';
import { flagForCurrency, parsePairCurrencies } from '@shared/radar/flags';

describe('parsePairCurrencies', () => {
  it('prefers payload base/quote over parsing the pair code', () => {
    expect(parsePairCurrencies('EUR/USD', 'eur', 'usd')).toEqual(['EUR', 'USD']);
  });

  it('parses EUR/USD-style codes', () => {
    expect(parsePairCurrencies('EUR/USD')).toEqual(['EUR', 'USD']);
    expect(parsePairCurrencies('USD/JPY')).toEqual(['USD', 'JPY']);
  });

  it('returns null for assets and malformed codes', () => {
    expect(parsePairCurrencies('Gold')).toBeNull();
    expect(parsePairCurrencies('EUR/')).toBeNull();
  });
});

describe('flagForCurrency', () => {
  it('maps all eight catalog currencies to flag art', () => {
    expect(['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD'].map(flagForCurrency)).toEqual([
      'EU',
      'US',
      'GB',
      'JP',
      'CH',
      'AU',
      'NZ',
      'CA',
    ]);
  });

  it('returns null for unknown currencies (caller falls back, never a wrong flag)', () => {
    expect(flagForCurrency('XXX')).toBeNull();
  });
});
