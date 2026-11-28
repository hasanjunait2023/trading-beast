import { create } from 'zustand';

/**
 * Device-local presentation preferences (handoff §3 row 02): the backend has
 * NO server field for timezone or preferred sessions, so these live only in
 * this browser's localStorage and are labelled as device scope in the UI.
 * They are never sent to the API as account settings.
 */

const TZ_KEY = 'tb-pref-timezone';
const SESSIONS_KEY = 'tb-pref-sessions';
const SETUP_KEY = 'tb-setup-done';

export const KNOWN_SESSIONS = ['Asian', 'London', 'New York'] as const;
export type KnownSession = (typeof KNOWN_SESSIONS)[number];

function readString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readSessions(): KnownSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is KnownSession =>
      (KNOWN_SESSIONS as readonly string[]).includes(s as string),
    );
  } catch {
    return [];
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — preference simply does not persist */
  }
}

interface PrefsState {
  /** IANA zone chosen on this device; null = follow the device zone. */
  timezone: string | null;
  preferredSessions: KnownSession[];
  setupDone: boolean;
  setTimezone: (tz: string | null) => void;
  setPreferredSessions: (sessions: KnownSession[]) => void;
  markSetupDone: () => void;
}

export const usePrefsStore = create<PrefsState>((set) => ({
  timezone: readString(TZ_KEY),
  preferredSessions: readSessions(),
  setupDone: readString(SETUP_KEY) === '1',
  setTimezone: (tz) => {
    write(TZ_KEY, tz);
    set({ timezone: tz });
  },
  setPreferredSessions: (sessions) => {
    write(SESSIONS_KEY, JSON.stringify(sessions));
    set({ preferredSessions: sessions });
  },
  markSetupDone: () => {
    write(SETUP_KEY, '1');
    set({ setupDone: true });
  },
}));

/** The effective display zone: saved device preference or the device zone. */
export function effectiveZone(saved: string | null): string {
  return saved || Intl.DateTimeFormat().resolvedOptions().timeZone;
}
