import type { Candle } from './yahoo.js';

export type RangeBreach = 'UP' | 'DOWN' | null;
export function openingRange(candles: readonly Candle[], start: number, asOf: number, active: boolean) {
  const end=start+3600;
  const closed=candles.filter(c=>c.ts+900<=asOf).sort((a,b)=>a.ts-b.ts);
  const opening=closed.filter(c=>c.ts>=start && c.ts<end);
  if(opening.length!==4 || !opening.every((c,i)=>c.ts===start+i*900)){
    return {ready:false,high:null,low:null,breach:null as RangeBreach,breachTs:null as number|null};
  }
  const high=Math.max(...opening.map(c=>c.h)),low=Math.min(...opening.map(c=>c.l));
  const last=closed.at(-1),prev=closed.at(-2);
  let breach:RangeBreach=null;
  if(active && last && prev && last.ts>=end && last.ts===prev.ts+900 && asOf-last.ts-900<900){
    if(prev.c<=high && last.c>high) breach='UP';
    else if(prev.c>=low && last.c<low) breach='DOWN';
  }
  return {ready:true,high,low,breach,breachTs:breach&&last?last.ts+900:null};
}
