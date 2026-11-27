import { buildPairs } from './analysis-engine.js';
const known=new Map(buildPairs().map(p=>[p.pair.toUpperCase(),p.pair]));
export function normalizeWatchlist(values:readonly string[]):string[] {
  if(values.length>32) throw new Error('Watchlist must contain at most 32 instruments');
  const result=new Set<string>();
  for(const value of values){
    const canonical=known.get(value.trim().toUpperCase());
    if(!canonical) throw new Error('Unknown watchlist instrument');
    result.add(canonical);
  }
  return [...result];
}
