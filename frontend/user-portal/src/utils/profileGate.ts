import type { UserProfile } from '../services/api';

/**
 * Onboarding gate + conversion visibility rules (pure, unit-tested).
 *
 * The profile endpoint is deployed in parallel with this UI, so every rule
 * here is written to degrade gracefully: unless the profile was actually
 * loaded AND reports itself incomplete, nothing gates and nothing nags.
 */

export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export const ONBOARDING_SKIPPED_KEY = 'tb-onboarding-skipped';

export function readOnboardingSkipped(): boolean {
  try {
    return sessionStorage.getItem(ONBOARDING_SKIPPED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingSkipped(): void {
  try {
    sessionStorage.setItem(ONBOARDING_SKIPPED_KEY, '1');
  } catch {
    /* storage unavailable — the gate simply asks again next session */
  }
}

/**
 * Force-route to the Welcome wizard only when we KNOW the profile is
 * incomplete, the user has not already skipped this session, and they are
 * not already on the wizard.
 */
export function shouldGateToOnboarding(args: {
  status: ProfileStatus;
  profile: UserProfile | null;
  skippedThisSession: boolean;
  pathname: string;
}): boolean {
  if (args.status !== 'ready' || !args.profile) return false;
  if (args.profile.profileCompleted) return false;
  if (args.skippedThisSession) return false;
  return args.pathname !== '/app/welcome';
}

/** The slim reminder banner shows whenever the profile is known-incomplete. */
export function shouldShowProfileBanner(args: {
  status: ProfileStatus;
  profile: UserProfile | null;
  pathname: string;
}): boolean {
  if (args.status !== 'ready' || !args.profile) return false;
  if (args.profile.profileCompleted) return false;
  return args.pathname !== '/app/welcome';
}

/**
 * Credits-page upgrade panel (conversion chapter): aimed at free users —
 * shown when the plan is Free, or whenever the balance drops below the
 * low-balance threshold regardless of plan.
 */
export const LOW_BALANCE_THRESHOLD = 20;

export function shouldShowUpgradePanel(balance: number | null, tier: string): boolean {
  if (tier === 'FREE') return true;
  return balance !== null && balance < LOW_BALANCE_THRESHOLD;
}

/** Pro upsell card in the Markets rail: free-plan users only, once per session. */
export const PRO_UPSELL_DISMISSED_KEY = 'tb-pro-upsell-dismissed';

export function readProUpsellDismissed(): boolean {
  try {
    return sessionStorage.getItem(PRO_UPSELL_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markProUpsellDismissed(): void {
  try {
    sessionStorage.setItem(PRO_UPSELL_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function shouldShowProUpsell(args: {
  tier: string;
  isProActive: boolean;
  runJustCompleted: boolean;
  dismissedThisSession: boolean;
}): boolean {
  if (args.isProActive || args.tier !== 'FREE') return false;
  if (!args.runJustCompleted) return false;
  return !args.dismissedThisSession;
}
