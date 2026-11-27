import { fetchMultipleSymbols, type Candle } from './yahoo.js';
import { buildPairs } from './analysis-engine.js';

export type Interval = '15m' | '1h';
export interface MarketDataProvider {
  readonly name: string;
  fetch(symbols: string[], interval: Interval, range: string): Promise<Map<string, Candle[]>>;
}
export const yahooProvider: MarketDataProvider = {
  name: 'yahoo',
  fetch: (symbols, interval, range) => fetchMultipleSymbols(symbols, interval, range, 4)
};
export function normalizeCandles(input: readonly Candle[], seconds: number, asOf: number): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const c of input) {
    if (!Number.isSafeInteger(c.ts) || c.ts <= 0 || c.ts + seconds > asOf) continue;
    if (![c.o,c.h,c.l,c.c].every(Number.isFinite)) continue;
    if (c.h < Math.max(c.o,c.c,c.l) || c.l > Math.min(c.o,c.c,c.h)) continue;
    byTime.set(c.ts, {...c});
  }
  return [...byTime.values()].sort((a,b)=>a.ts-b.ts);
}
export interface MarketSnapshot {
  provider: string;
  asOf: number;
  series: Map<string, {m15: Candle[]; h1: Candle[]}>;
  fxCoverage: number;
}
export class MarketDataUnavailable extends Error {}
export class SnapshotService {
  private cached?: MarketSnapshot;
  private pending?: Promise<MarketSnapshot>;
  constructor(private provider: MarketDataProvider, private ttlSeconds=60, private clock=()=>Math.floor(Date.now()/1000)) {}
  async get(): Promise<MarketSnapshot> {
    const now=this.clock();
    if(this.cached && now-this.cached.asOf>=0 && now-this.cached.asOf<this.ttlSeconds) return this.cached;
    if(this.pending) return this.pending;
    this.pending=this.load(now).then(snapshot=>{this.cached=snapshot;return snapshot;}).finally(()=>{this.pending=undefined;});
    return this.pending;
  }
  private async load(asOf: number): Promise<MarketSnapshot> {
    const pairs=buildPairs();
    const symbols=pairs.map(p=>p.yahoo);
    const [m15,h1]=await Promise.all([this.provider.fetch(symbols,'15m','30d'),this.provider.fetch(symbols,'1h','60d')]);
    const series: MarketSnapshot['series']=new Map();
    let fx=0;
    for(const p of pairs){
      const a=normalizeCandles(m15.get(p.yahoo)??[],900,asOf);
      const b=normalizeCandles(h1.get(p.yahoo)??[],3600,asOf);
      if(a.length<220 || b.length<820) continue;
      series.set(p.yahoo,{m15:a,h1:b});
      if(p.kind==='fx') fx++;
    }
    const fxCoverage=fx/pairs.filter(p=>p.kind==='fx').length;
    if(fxCoverage<0.8) throw new MarketDataUnavailable('Insufficient FX history coverage');
    return {provider:this.provider.name,asOf,series,fxCoverage};
  }
}
export const marketSnapshots=new SnapshotService(yahooProvider);
function chart(c: Candle[]) {
  return {chart:{result:[{timestamp:c.map(x=>x.ts),indicators:{quote:[{open:c.map(x=>x.o),high:c.map(x=>x.h),low:c.map(x=>x.l),close:c.map(x=>x.c)}]}}]}};
}
export function toEngineInput(snapshot: MarketSnapshot) {
  return new Map([...snapshot.series].map(([symbol,s])=>[symbol,{data15m:chart(s.m15),data1h:chart(s.h1)}]));
}
