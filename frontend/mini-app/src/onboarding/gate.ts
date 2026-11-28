import type { UserProfile } from '../services/api';

/**
 * Onboarding gating + field validation (pure logic, unit-tested).
 *
 * Gate rules (owner chapter: profile collection after Telegram sign-in):
 *  - While the profile read is in flight, the app shows its loading screen.
 *  - If the profile endpoint is unavailable (e.g. 404 — backend not deployed
 *    yet) the gate NEVER traps the user: the plain app opens.
 *  - A completed profile opens the app.
 *  - An incomplete profile opens onboarding — unless the user already used
 *    their one skip (persisted per account), in which case the app opens and
 *    a gentle reminder lives in More / Profile until completion.
 *  - `force` (tapping the reminder) reopens onboarding regardless of skip.
 */

export type ProfileLoadState = 'loading' | 'ready' | 'unavailable';

export type GateDecision = 'loading' | 'onboarding' | 'app';

export interface GateInput {
  loadState: ProfileLoadState;
  profile: UserProfile | null;
  skipped: boolean;
  force: boolean;
}

export function onboardingGate(input: GateInput): GateDecision {
  if (input.force) return 'onboarding';
  if (input.loadState === 'loading') return 'loading';
  if (input.loadState === 'unavailable') return 'app';
  if (!input.profile) return 'app';
  if (input.profile.profileCompleted) return 'app';
  return input.skipped ? 'app' : 'onboarding';
}

/** True when the persistent "finish your profile" reminder should show. */
export function profileReminderVisible(
  loadState: ProfileLoadState,
  profile: UserProfile | null,
): boolean {
  return loadState === 'ready' && !!profile && !profile.profileCompleted;
}

const SKIP_PREFIX = 'tb-onboarding-skipped:';

export function onboardingSkipKey(userId: string): string {
  return `${SKIP_PREFIX}${userId}`;
}

export function readOnboardingSkipped(
  storage: Pick<Storage, 'getItem'>,
  userId: string,
): boolean {
  try {
    return storage.getItem(onboardingSkipKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function persistOnboardingSkipped(
  storage: Pick<Storage, 'setItem'>,
  userId: string,
): void {
  try {
    storage.setItem(onboardingSkipKey(userId), '1');
  } catch {
    /* storage unavailable — the gate simply asks again next launch */
  }
}

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) return 'Enter your Gmail address.';
  if (email.length > 254) return 'That email address is too long.';
  // Pragmatic shape check; the server is the authority (400 on invalid).
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return 'Enter a valid email address, e.g. you@gmail.com.';
  }
  return null;
}

export function validatePhone(raw: string): string | null {
  const phone = raw.trim();
  if (!phone) return 'Enter your mobile number.';
  // Allow +, spaces, dashes and parentheses as separators; require 7–15
  // digits (ITU E.164 bounds) overall.
  if (!/^\+?[0-9\s\-()]+$/.test(phone)) {
    return 'Use digits only (you can start with + for your country code).';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return 'That number looks too short.';
  if (digits.length > 15) return 'That number looks too long.';
  return null;
}

export interface PasswordStrength {
  /** 0 (empty) – 4 (strong). */
  score: number;
  label: string;
  hint: string;
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', hint: 'Use at least 8 characters.' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  score = Math.min(4, score);
  const labels = ['Too weak', 'Weak', 'Okay', 'Good', 'Strong'];
  const hints = [
    'Use at least 8 characters.',
    'Add more characters or mix cases.',
    'Add a number or a symbol to strengthen it.',
    'Nice — a symbol would make it even stronger.',
    'Strong password.',
  ];
  return { score, label: labels[score], hint: hints[score] };
}

export function validatePassword(password: string, confirm: string): string | null {
  if (!password) return 'Create a password.';
  if (password.length < 8) return 'Use at least 8 characters.';
  if (password.length > 128) return 'That password is too long.';
  if (confirm !== password) return 'Passwords do not match yet.';
  return null;
}
