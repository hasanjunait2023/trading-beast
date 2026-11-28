import { describe, expect, it } from 'vitest';
import { checkPassword, isValidEmail, isValidPhone } from './onboarding';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('trader@gmail.com')).toBe(true);
    expect(isValidEmail('  a.b+tag@sub.example.co  ')).toBe(true);
  });
  it('rejects malformed addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
    expect(isValidEmail('@x.com')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts international and local formats', () => {
    expect(isValidPhone('+8801712345678')).toBe(true);
    expect(isValidPhone('01712-345 678')).toBe(true);
    expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
  });
  it('rejects too short / non-numeric input', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('call me')).toBe(false);
    expect(isValidPhone('+88017123456789012345')).toBe(false);
  });
});

describe('checkPassword', () => {
  it('passes a letter+number password of 8+ chars', () => {
    expect(checkPassword('abcd1234')).toEqual({ ok: true, issues: [] });
  });
  it('reports each unmet requirement', () => {
    expect(checkPassword('short1').ok).toBe(false);
    expect(checkPassword('short1').issues).toContain('at least 8 characters');
    expect(checkPassword('onlyletters').issues).toContain('a number');
    expect(checkPassword('12345678').issues).toContain('a letter');
  });
});
