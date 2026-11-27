import { describe, expect, it } from 'vitest';
import { getSessionWindow, sessionOverview, isFxWeekOpen } from './session-clock.js';
const sec=(iso:string)=>Date.parse(iso)/1000;
const iso=(ts:number)=>new Date(ts*1000).toISOString();
describe('session clock',()=>{
  it('uses local market opening times in winter and summer',()=>{
    const winter=sec('2026-01-12T15:00:00Z'),summer=sec('2026-07-13T15:00:00Z');
    expect(iso(getSessionWindow('London',winter).sessionStartTs)).toBe('2026-01-12T08:00:00.000Z');
    expect(iso(getSessionWindow('London',summer).sessionStartTs)).toBe('2026-07-13T07:00:00.000Z');
    expect(iso(getSessionWindow('New York',winter).sessionStartTs)).toBe('2026-01-12T13:00:00.000Z');
    expect(iso(getSessionWindow('New York',summer).sessionStartTs)).toBe('2026-07-13T12:00:00.000Z');
    expect(iso(getSessionWindow('Asian',summer).sessionStartTs)).toBe('2026-07-13T00:00:00.000Z');
  });
  it('handles US/UK spring DST mismatch independently',()=>{
    const now=sec('2026-03-16T14:00:00Z');
    expect(iso(getSessionWindow('London',now).sessionStartTs)).toBe('2026-03-16T08:00:00.000Z');
    expect(iso(getSessionWindow('New York',now).sessionStartTs)).toBe('2026-03-16T12:00:00.000Z');
  });
  it('finds overlaps and one-hour opening-range boundary',()=>{
    expect(sessionOverview(sec('2026-07-13T12:30:00Z')).active).toEqual(['London','New York']);
    expect(getSessionWindow('London',sec('2026-07-13T07:59:59Z')).orDone).toBe(false);
    expect(getSessionWindow('London',sec('2026-07-13T08:00:00Z')).orDone).toBe(true);
  });
  it('skips weekends and distinguishes weekly FX opening from session activity',()=>{
    const sat=sec('2026-07-18T12:00:00Z');
    const w=getSessionWindow('London',sat);
    expect(w.sessionDate).toBe('2026-07-17');
    expect(iso(w.nextStartTs)).toBe('2026-07-20T07:00:00.000Z');
    expect(sessionOverview(sat).active).toEqual([]);
    expect(isFxWeekOpen(sec('2026-07-17T21:00:00Z'))).toBe(false);
    expect(isFxWeekOpen(sec('2026-07-19T20:59:59Z'))).toBe(false);
    expect(isFxWeekOpen(sec('2026-07-19T21:00:00Z'))).toBe(true);
  });
});
