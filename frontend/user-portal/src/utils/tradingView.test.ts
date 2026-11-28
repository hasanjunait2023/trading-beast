import { describe, expect, it } from 'vitest';
import { tradingViewSymbol, TV_INTERVALS } from './tradingView';

describe('tradingViewSymbol', () => {
  it('maps FX pair codes to the FX exchange prefix', () => {
    expect(tradingViewSymbol('EUR/USD')).toBe('FX:EURUSD');
    expect(tradingViewSymbol('GBP/JPY')).toBe('FX:GBPJPY');
    expect(tradingViewSymbol('USD/JPY')).toBe('FX:USDJPY');
    expect(tradingViewSymbol('eurusd')).toBe('FX:EURUSD');
  });

  it('maps the engine asset names and codes', () => {
    expect(tradingViewSymbol('Gold')).toBe('OANDA:XAUUSD');
    expect(tradingViewSymbol('XAU/USD')).toBe('OANDA:XAUUSD');
    expect(tradingViewSymbol('XAUUSD')).toBe('OANDA:XAUUSD');
    expect(tradingViewSymbol('Silver')).toBe('OANDA:XAGUSD');
    expect(tradingViewSymbol('XAGUSD')).toBe('OANDA:XAGUSD');
    expect(tradingViewSymbol('Oil')).toBe('TVC:USOIL');
    expect(tradingViewSymbol('WTI Oil')).toBe('TVC:USOIL');
    expect(tradingViewSymbol('Bitcoin')).toBe('BITSTAMP:BTCUSD');
    expect(tradingViewSymbol('BTCUSD')).toBe('BITSTAMP:BTCUSD');
  });

  it('returns null for anything without a validated mapping', () => {
    expect(tradingViewSymbol('')).toBeNull();
    expect(tradingViewSymbol('EUR')).toBeNull();
    expect(tradingViewSymbol('Some Index')).toBeNull();
    expect(tradingViewSymbol('EURO')).toBeNull();
  });
});

describe('TV_INTERVALS', () => {
  it('maps portal timeframes to widget intervals', () => {
    expect(TV_INTERVALS['15m']).toBe('15');
    expect(TV_INTERVALS['1H']).toBe('60');
    expect(TV_INTERVALS['4H']).toBe('240');
  });
});
