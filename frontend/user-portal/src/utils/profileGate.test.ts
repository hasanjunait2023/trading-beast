import { describe, expect, it } from 'vitest';
import {
  shouldGateToOnboarding,
  shouldShowProfileBanner,
  shouldShowProUpsell,
  shouldShowUpgradePanel,
  LOW_BALANCE_THRESHOLD,
} from './profileGate';
import type { UserProfile } from '../services/api';

const incomplete: UserProfile = {
  email: null,
  phone: null,
  profileCompleted: false,
  hasPassword: false,
};
const complete: UserProfile = {
  email: 'a@b.com',
  phone: '+8801700000000',
  profileCompleted: true,
  hasPassword: true,
};

describe('shouldGateToOnboarding', () => {
  const base = { status: 'ready' as const, skippedThisSession: false, pathname: '/app' };
  it('gates only a known-incomplete profile', () => {
    expect(shouldGateToOnboarding({ ...base, profile: incomplete })).toBe(true);
    expect(shouldGateToOnboarding({ ...base, profile: complete })).toBe(false);
    expect(shouldGateToOnboarding({ ...base, profile: null })).toBe(false);
  });
  it('never gates while loading or when the endpoint is unavailable', () => {
    expect(shouldGateToOnboarding({ ...base, status: 'loading', profile: incomplete })).toBe(false);
    expect(shouldGateToOnboarding({ ...base, status: 'unavailable', profile: incomplete })).toBe(false);
    expect(shouldGateToOnboarding({ ...base, status: 'idle', profile: incomplete })).toBe(false);
  });
  it('respects the per-session skip and the wizard route itself', () => {
    expect(shouldGateToOnboarding({ ...base, profile: incomplete, skippedThisSession: true })).toBe(false);
    expect(shouldGateToOnboarding({ ...base, profile: incomplete, pathname: '/app/welcome' })).toBe(false);
  });
});

describe('shouldShowProfileBanner', () => {
  it('shows for known-incomplete profiles except on the wizard', () => {
    expect(
      shouldShowProfileBanner({ status: 'ready', profile: incomplete, pathname: '/app' }),
    ).toBe(true);
    expect(
      shouldShowProfileBanner({ status: 'ready', profile: incomplete, pathname: '/app/welcome' }),
    ).toBe(false);
    expect(
      shouldShowProfileBanner({ status: 'unavailable', profile: incomplete, pathname: '/app' }),
    ).toBe(false);
    expect(
      shouldShowProfileBanner({ status: 'ready', profile: complete, pathname: '/app' }),
    ).toBe(false);
  });
});

describe('shouldShowUpgradePanel', () => {
  it('targets free users and low balances', () => {
    expect(shouldShowUpgradePanel(100, 'FREE')).toBe(true);
    expect(shouldShowUpgradePanel(LOW_BALANCE_THRESHOLD - 1, 'PRO')).toBe(true);
    expect(shouldShowUpgradePanel(LOW_BALANCE_THRESHOLD, 'PRO')).toBe(false);
    expect(shouldShowUpgradePanel(null, 'PRO')).toBe(false);
    expect(shouldShowUpgradePanel(null, 'FREE')).toBe(true);
  });
});

describe('shouldShowProUpsell', () => {
  const base = { tier: 'FREE', isProActive: false, runJustCompleted: true, dismissedThisSession: false };
  it('shows only for free users right after a run, until dismissed', () => {
    expect(shouldShowProUpsell(base)).toBe(true);
    expect(shouldShowProUpsell({ ...base, dismissedThisSession: true })).toBe(false);
    expect(shouldShowProUpsell({ ...base, runJustCompleted: false })).toBe(false);
    expect(shouldShowProUpsell({ ...base, tier: 'PRO' })).toBe(false);
    expect(shouldShowProUpsell({ ...base, isProActive: true })).toBe(false);
  });
});
