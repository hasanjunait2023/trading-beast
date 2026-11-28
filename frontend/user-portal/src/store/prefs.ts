import { create } from 'zustand';

/**
 * Presentation preferences (handoff §3 row 02 + §5): timezone and preferred
 * sessions are SERVER-backed account settings (GET/PUT /user/preferences).
 * This store is the local cache of those values: it seeds the UI instantly,
 * is refreshed from the server by Setup/Settings via hydrateFromServer, and
 * is the honest fallback (labelled "device only") only while the server
 * value is loading or unreachable. The setup-completion flag stays local —
 * it is a per-device UX concern, not an account setting.
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
  /** Mirror a server preferences payload into the local cache. */
  hydrateFromServer: (prefs: { timezone: string | null; preferredSessions: string[] }) => void;
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
  hydrateFromServer: (prefs) => {
    const sessions = prefs.preferredSessions.filter((s): s is KnownSession =>
      (KNOWN_SESSIONS as readonly string[]).includes(s),
    );
    write(TZ_KEY, prefs.timezone);
    write(SESSIONS_KEY, JSON.stringify(sessions));
    set({ timezone: prefs.timezone, preferredSessions: sessions });
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
