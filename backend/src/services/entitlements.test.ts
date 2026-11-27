import { describe, expect, it } from 'vitest';
import { resolveTier } from './entitlements.js';
const now = new Date('2026-01-01T00:00:00Z');
const sub = (tier: 'FREE'|'PRO'|'ELITE', status = 'ACTIVE', startsAt = new Date(now.getTime()-1000), expiresAt = new Date(now.getTime()+1000)) => ({tier,status,startsAt,expiresAt});
describe('subscription entitlements', () => {
  it('defaults to free', () => expect(resolveTier([],now)).toBe('FREE'));
  it('honors a valid trial', () => expect(resolveTier([sub('PRO','TRIAL')],now)).toBe('PRO'));
  it('chooses highest valid tier', () => expect(resolveTier([sub('PRO'),sub('ELITE')],now)).toBe('ELITE'));
  it('excludes expired and cancelled subscriptions', () => expect(resolveTier([sub('ELITE','ACTIVE',new Date(0),now),sub('PRO','CANCELLED')],now)).toBe('FREE'));
  it('excludes future subscriptions', () => expect(resolveTier([sub('ELITE','ACTIVE',new Date(now.getTime()+1))],now)).toBe('FREE'));
  it('falls back to valid lower tier', () => expect(resolveTier([sub('ELITE','EXPIRED'),sub('PRO')],now)).toBe('PRO'));
});
