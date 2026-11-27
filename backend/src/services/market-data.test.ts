import { describe, expect, it, vi } from 'vitest';
import { normalizeCandles, SnapshotService, type MarketDataProvider } from './market-data.js';
import type { Candle } from './yahoo.js';
const candle=(ts:number):Candle=>({ts,o:1,h:2,l:0.5,c:1.5});
describe('normalizeCandles',()=>{
  it('sorts, deduplicates, rejects incomplete and invalid bars',()=>{
    const result=normalizeCandles([candle(1800),candle(900),{...candle(900),c:1.7},candle(2700),{...candle(450),h:0}],900,2700);
    expect(result.map(x=>x.ts)).toEqual([900,1800]);
    expect(result[0].c).toBe(1.7);
  });
});
describe('SnapshotService',()=>{
  it('coalesces concurrent scans and reuses fresh snapshots',async()=>{
    const now=4_000_000;
    const fetch=vi.fn<MarketDataProvider['fetch']>().mockImplementation(async(symbols,interval)=>{
      const step=interval==='15m'?900:3600;
      return new Map(symbols.map(s=>[s,Array.from({length:850},(_,i)=>candle(now-(850-i)*step))]));
    });
    const service=new SnapshotService({name:'fixture',fetch},60,()=>now);
    const [a,b]=await Promise.all([service.get(),service.get()]);
    expect(a).toBe(b);
    expect(await service.get()).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(a.fxCoverage).toBe(1);
  });
  it('rejects missing coverage rather than caching empty data',async()=>{
    const fetch=vi.fn<MarketDataProvider['fetch']>().mockResolvedValue(new Map());
    const service=new SnapshotService({name:'fixture',fetch});
    await expect(service.get()).rejects.toThrow('Insufficient FX history coverage');
    await expect(service.get()).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
