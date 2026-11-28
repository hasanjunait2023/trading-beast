import { describe, it, expect } from 'vitest';
import { normalizeEmail, isValidEmail, normalizePhone, isValidPhone, toPublicProfile } from './profile.js';

describe('email validation', () => {
  it('normalises case and surrounding whitespace', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('a.b+tag@sub.domain.co')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    for (const bad of ['', 'plain', 'a@b', 'a@b.c', 'a b@c.com', 'a@.com', '@x.com', 'a@@x.com']) {
      expect(isValidEmail(normalizeEmail(bad))).toBe(false);
    }
  });
});

describe('phone normalisation (BD-friendly, stored as E.164)', () => {
  it('keeps an already-E.164 number', () => {
    expect(normalizePhone('+8801712345678')).toBe('+8801712345678');
    expect(normalizePhone('+14155552671')).toBe('+14155552671');
  });
  it('normalises Bangladeshi local formats', () => {
    expect(normalizePhone('01712345678')).toBe('+8801712345678');
    expect(normalizePhone('8801712345678')).toBe('+8801712345678');
    expect(normalizePhone('01712-345 678')).toBe('+8801712345678');
    expect(normalizePhone('+880 1712-345678')).toBe('+8801712345678');
  });
  it('rejects numbers that are not dialable', () => {
    for (const bad of ['', '12345', '0171234567', '02712345678', '+0123456789', 'abcdefghijk', '+880171234567890123']) {
      expect(normalizePhone(bad)).toBeNull();
      expect(isValidPhone(bad)).toBe(false);
    }
  });
});

describe('public profile shape', () => {
  it('derives the completion flag and never exposes the hash', () => {
    const done = toPublicProfile({ email: 'u@x.com', phone: '+8801712345678', passwordHash: '$2b$12$secret', profileCompletedAt: new Date(0) });
    expect(done).toEqual({ email: 'u@x.com', phone: '+8801712345678', profileCompleted: true, profileCompletedAt: new Date(0), hasPassword: true });
    expect(JSON.stringify(done)).not.toContain('secret');
    const fresh = toPublicProfile({ email: null, phone: null, passwordHash: null, profileCompletedAt: null });
    expect(fresh.profileCompleted).toBe(false);
    expect(fresh.hasPassword).toBe(false);
  });
});
