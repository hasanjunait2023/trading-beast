import {describe,it,expect} from 'vitest';
import {normalizeWatchlist} from './watchlist.js';
describe('watchlist',()=>{
  it('normalizes asset and FX symbols and removes duplicates',()=>expect(normalizeWatchlist([' gold ','eur/usd','GOLD'])).toEqual(['Gold','EUR/USD']));
  it('rejects unknown instruments',()=>expect(()=>normalizeWatchlist(['unknown'])).toThrow());
  it('allows clearing the watchlist',()=>expect(normalizeWatchlist([])).toEqual([]));
});
