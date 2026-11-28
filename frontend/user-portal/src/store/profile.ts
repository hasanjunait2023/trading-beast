import { create } from 'zustand';
import { userApi, type UserProfile } from '../services/api';
import type { ProfileStatus } from '../utils/profileGate';

/**
 * Onboarding profile store (Onboarding + Conversion chapter).
 *
 * Holds the GET /user/profile snapshot for the CURRENT account only — the
 * userId it was fetched for travels with it, and the AppLayout gate checks
 * that id against the signed-in user, so a previous account's profile can
 * never gate (or un-gate) a different account. Any fetch failure — 404
 * while the backend rolls out, offline, anything — lands in 'unavailable',
 * which the gate treats as "no onboarding enforcement": the UI must never
 * trap a user behind an endpoint that is not there.
 */
interface ProfileState {
  userId: string | null;
  profile: UserProfile | null;
  status: ProfileStatus;
  /** Fetch (once per account per mount) unless already loaded/loading. */
  ensure: (userId: string) => Promise<void>;
  /** Force a re-read, e.g. after the wizard completes a step. */
  refresh: (userId: string) => Promise<void>;
  setProfile: (userId: string, profile: UserProfile) => void;
  reset: () => void;
}

async function load(
  userId: string,
  set: (partial: Partial<ProfileState>) => void,
): Promise<void> {
  set({ userId, status: 'loading' });
  try {
    const res = await userApi.getProfile();
    const profile = res.data.data ?? null;
    set({
      userId,
      profile,
      status: profile ? 'ready' : 'unavailable',
    });
  } catch {
    set({ userId, profile: null, status: 'unavailable' });
  }
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  userId: null,
  profile: null,
  status: 'idle',
  ensure: async (userId) => {
    const s = get();
    if (s.userId === userId && (s.status === 'ready' || s.status === 'loading')) return;
    await load(userId, set);
  },
  refresh: async (userId) => {
    await load(userId, set);
  },
  setProfile: (userId, profile) => set({ userId, profile, status: 'ready' }),
  reset: () => set({ userId: null, profile: null, status: 'idle' }),
}));
