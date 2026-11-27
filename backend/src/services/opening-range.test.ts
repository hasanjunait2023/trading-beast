import { describe, expect, it } from 'vitest';
import { openingRange } from './opening-range.js';
const start=36000;
const base=Array.from({length:4},(_,i)=>({ts:start+i*900,o:10,h:12,l:8,c:10}));
const bar=(i:number,c:number)=>({ts:start+i*900,o:10,h:Math.max(12,c),l:Math.min(8,c),c});
describe('opening range',()=>{
  it('does not include an unclosed fourth candle or a gap',()=>{
    expect(openingRange(base,start,start+3599,true).ready).toBe(false);
    expect(openingRange(base.filter((_,i)=>i!==1),start,start+3600,true).ready).toBe(false);
  });
  it('detects a fresh close above or below the opening range',()=>{
    expect(openingRange([...base,bar(4,13)],start,start+4500,true).breach).toBe('UP');
    expect(openingRange([...base,bar(4,7)],start,start+4500,true).breach).toBe('DOWN');
  });
  it('does not repeat a breakout, use unclosed candles, or signal inactive sessions',()=>{
    const data=[...base,bar(4,13),bar(5,14)];
    expect(openingRange(data,start,start+4499,true).breach).toBeNull();
    expect(openingRange(data,start,start+5400,true).breach).toBeNull();
    expect(openingRange(data,start,start+4500,false).breach).toBeNull();
    expect(openingRange([...base,bar(4,13)],start,start+5400,true).breach).toBeNull();
  });
});
