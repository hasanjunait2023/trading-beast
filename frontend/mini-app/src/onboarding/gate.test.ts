import { describe, expect, it } from 'vitest';
import {
  onboardingGate,
  onboardingSkipKey,
  passwordStrength,
  persistOnboardingSkipped,
  profileReminderVisible,
  readOnboardingSkipped,
  validateEmail,
  validatePassword,
  validatePhone,
} from './gate';
import type { UserProfile } from '../services/api';

const complete: UserProfile = {
  email: 'a@gmail.com',
  phone: '+8801700000000',
  profileCompleted: true,
  hasPassword: true,
};
const incomplete: UserProfile = {
  email: null,
  phone: null,
  profileCompleted: false,
  hasPassword: false,
};

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe('onboardingGate', () => {
  it('shows loading while the profile read is in flight', () => {
    expect(
      onboardingGate({ loadState: 'loading', profile: null, skipped: false, force: false }),
    ).toBe('loading');
  });

  it('never traps the user when the endpoint is unavailable (404 fallback)', () => {
    expect(
      onboardingGate({ loadState: 'unavailable', profile: null, skipped: false, force: false }),
    ).toBe('app');
  });

  it('opens the app for a completed profile', () => {
    expect(
      onboardingGate({ loadState: 'ready', profile: complete, skipped: false, force: false }),
    ).toBe('app');
  });

  it('routes an incomplete profile to onboarding', () => {
    expect(
      onboardingGate({ loadState: 'ready', profile: incomplete, skipped: false, force: false }),
    ).toBe('onboarding');
  });

  it('opens the app after the one skip, with the reminder visible', () => {
    expect(
      onboardingGate({ loadState: 'ready', profile: incomplete, skipped: true, force: false }),
    ).toBe('app');
    expect(profileReminderVisible('ready', incomplete)).toBe(true);
    expect(profileReminderVisible('ready', complete)).toBe(false);
    expect(profileReminderVisible('unavailable', null)).toBe(false);
  });

  it('force (reminder tap) reopens onboarding even after a skip', () => {
    expect(
      onboardingGate({ loadState: 'ready', profile: incomplete, skipped: true, force: true }),
    ).toBe('onboarding');
  });

  it('treats a ready-but-null profile as app (defensive)', () => {
    expect(
      onboardingGate({ loadState: 'ready', profile: null, skipped: false, force: false }),
    ).toBe('app');
  });
});

describe('skip persistence', () => {
  it('round-trips per user id', () => {
    const storage = fakeStorage();
    expect(readOnboardingSkipped(storage, 'u1')).toBe(false);
    persistOnboardingSkipped(storage, 'u1');
    expect(readOnboardingSkipped(storage, 'u1')).toBe(true);
    expect(readOnboardingSkipped(storage, 'u2')).toBe(false);
    expect(onboardingSkipKey('u1')).toBe('tb-onboarding-skipped:u1');
  });
});

describe('validateEmail', () => {
  it('accepts a normal gmail address', () => {
    expect(validateEmail('  trader@gmail.com ')).toBeNull();
  });
  it('rejects empty and malformed addresses', () => {
    expect(validateEmail('')).toMatch(/Enter your Gmail/);
    expect(validateEmail('trader@')).toMatch(/valid email/);
    expect(validateEmail('trader@gmail')).toMatch(/valid email/);
    expect(validateEmail('a b@gmail.com')).toMatch(/valid email/);
  });
});

describe('validatePhone', () => {
  it('accepts international and local formats', () => {
    expect(validatePhone('+880 1712-345678')).toBeNull();
    expect(validatePhone('01712345678')).toBeNull();
    expect(validatePhone('+1 (555) 010-2233')).toBeNull();
  });
  it('rejects empty, letters and out-of-range lengths', () => {
    expect(validatePhone('')).toMatch(/Enter your mobile/);
    expect(validatePhone('call-me')).toMatch(/digits only/);
    expect(validatePhone('12345')).toMatch(/too short/);
    expect(validatePhone('+8801712345678901234')).toMatch(/too long/);
  });
});

describe('password validation + strength', () => {
  it('requires 8+ characters and a matching confirmation', () => {
    expect(validatePassword('', '')).toMatch(/Create a password/);
    expect(validatePassword('short1', 'short1')).toMatch(/at least 8/);
    expect(validatePassword('longenough1', 'different1')).toMatch(/do not match/);
    expect(validatePassword('longenough1', 'longenough1')).toBeNull();
  });

  it('scores strength monotonically', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('password').score).toBeGreaterThanOrEqual(1);
    expect(passwordStrength('Password1').score).toBeGreaterThan(passwordStrength('password').score);
    expect(passwordStrength('Password123!x').score).toBe(4);
    expect(passwordStrength('Password123!x').label).toBe('Strong');
  });
});
