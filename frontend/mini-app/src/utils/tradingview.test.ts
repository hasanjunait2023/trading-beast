import { describe, expect, it } from 'vitest';
import { tradingViewInterval, tradingViewSymbol } from './tradingview';

describe('tradingViewSymbol', () => {
  it('maps FX display codes to FX:<CODE>', () => {
    expect(tradingViewSymbol({ pair: 'EUR/USD', kind: 'fx' })).toBe('FX:EURUSD');
    expect(tradingViewSymbol({ pair: 'USD/JPY', kind: 'fx' })).toBe('FX:USDJPY');
    expect(tradingViewSymbol({ pair: 'GBP/CHF', kind: 'fx' })).toBe('FX:GBPCHF');
  });

  it('maps bare FX codes and base/quote fields', () => {
    expect(tradingViewSymbol({ pair: 'EURUSD', kind: 'fx' })).toBe('FX:EURUSD');
    expect(
      tradingViewSymbol({ pair: 'EUR/USD', kind: 'fx', base: 'EUR', quote: 'USD' }),
    ).toBe('FX:EURUSD');
    expect(
      tradingViewSymbol({ pair: 'anything', kind: 'fx', base: 'AUD', quote: 'NZD' }),
    ).toBe('FX:AUDNZD');
  });

  it('maps assets by display name and by canonical code', () => {
    expect(tradingViewSymbol({ pair: 'Gold', kind: 'asset' })).toBe('OANDA:XAUUSD');
    expect(tradingViewSymbol({ pair: 'XAUUSD', kind: 'asset' })).toBe('OANDA:XAUUSD');
    expect(tradingViewSymbol({ pair: 'Silver', kind: 'asset' })).toBe('OANDA:XAGUSD');
    expect(tradingViewSymbol({ pair: 'XAGUSD', kind: 'asset' })).toBe('OANDA:XAGUSD');
    expect(tradingViewSymbol({ pair: 'Oil', kind: 'asset' })).toBe('TVC:USOIL');
    expect(tradingViewSymbol({ pair: 'OIL', kind: 'asset' })).toBe('TVC:USOIL');
    expect(tradingViewSymbol({ pair: 'Bitcoin', kind: 'asset' })).toBe('BITSTAMP:BTCUSD');
    expect(tradingViewSymbol({ pair: 'BTCUSD', kind: 'asset' })).toBe('BITSTAMP:BTCUSD');
  });

  it('returns null for unknown instruments (caller falls back honestly)', () => {
    expect(tradingViewSymbol({ pair: 'Platinum', kind: 'asset' })).toBeNull();
    expect(tradingViewSymbol({ pair: 'XYZ', kind: 'asset' })).toBeNull();
    expect(tradingViewSymbol({ pair: '', kind: 'fx' })).toBeNull();
  });
});

describe('tradingViewInterval', () => {
  it('maps the app timeframes to widget interval codes', () => {
    expect(tradingViewInterval('15m')).toBe('15');
    expect(tradingViewInterval('1H')).toBe('60');
    expect(tradingViewInterval('4H')).toBe('240');
  });
});
