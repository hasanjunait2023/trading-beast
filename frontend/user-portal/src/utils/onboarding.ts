/**
 * Onboarding form validation (Welcome wizard). Pure functions so the rules
 * are unit-tested and shared by every step. These are UX gates only — the
 * server re-validates everything on POST /user/profile/complete and its
 * error is what the user ultimately sees on a rejected submission.
 */

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 254) return false;
  // Deliberately simple: one @, a dot in the domain, no spaces.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!/^\+?[0-9\s()-]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export interface PasswordCheck {
  ok: boolean;
  /** Human-readable unmet requirements, empty when ok. */
  issues: string[];
}

export function checkPassword(value: string): PasswordCheck {
  const issues: string[] = [];
  if (value.length < 8) issues.push('at least 8 characters');
  if (!/[A-Za-z]/.test(value)) issues.push('a letter');
  if (!/[0-9]/.test(value)) issues.push('a number');
  return { ok: issues.length === 0, issues };
}
