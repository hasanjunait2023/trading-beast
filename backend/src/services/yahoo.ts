import axios from 'axios';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

export interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
        }>;
      };
    }> | null;
    error: any;
  };
}

export interface Candle {
  ts: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export async function fetchYahooChart(
  symbol: string,
  interval: '1m' | '15m' | '1h',
  range: string
): Promise<Candle[]> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}`;
  try {
    const response = await axios.get<YahooChartResponse>(url, {
      params: { interval, range, includePrePost: false },
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      timeout: 10000
    });

    const result = response.data.chart.result?.[0];
    if (!result || !result.timestamp || !result.indicators.quote?.[0]) {
      return [];
    }

    const q = result.indicators.quote[0];
    const candles: Candle[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open[i], h = q.high[i], l = q.low[i], c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({ ts: result.timestamp[i], o, h, l, c });
    }
    return candles;
  } catch (error) {
    console.error(`Yahoo fetch failed for ${symbol} (${interval}):`, error);
    return [];
  }
}

export async function fetchMultipleSymbols(
  symbols: string[],
  interval: '1m' | '15m' | '1h',
  range: string,
  batchSize: number = 7
): Promise<Map<string, Candle[]>> {
  const results = new Map<string, Candle[]>();

  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map(async (symbol) => {
      const candles = await fetchYahooChart(symbol, interval, range);
      return { symbol, candles };
    });
    const batchResults = await Promise.all(promises);
    for (const { symbol, candles } of batchResults) {
      results.set(symbol, candles);
    }
    // Small delay between batches to be polite
    if (i + batchSize < symbols.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}