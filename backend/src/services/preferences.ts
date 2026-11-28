import { prisma } from './db.js';

// Server-side user preferences (handoff §5 "Plan and preferences"): the
// account-level timezone + preferred sessions that Setup/Settings used to
// keep device-local only. Owner identity comes from auth — every query is
// keyed by the caller's userId.

export const KNOWN_SESSIONS = ['Asian', 'London', 'New York'] as const;
export type KnownSession = (typeof KNOWN_SESSIONS)[number];

export interface UserPreferencesView {
  timezone: string | null;
  preferredSessions: string[];
}

export interface PreferenceRow {
  userId: string;
  timezone: string | null;
  preferredSessions: string[];
  updatedAt: Date;
}

/** Minimal structural slice of PrismaClient used here (injectable for tests). */
export interface PreferencesDb {
  userPreference: {
    findUnique(args: unknown): Promise<PreferenceRow | null>;
    upsert(args: unknown): Promise<PreferenceRow>;
  };
}

const defaultDb = (): PreferencesDb => prisma as unknown as PreferencesDb;

/** IANA zone check: Intl throws RangeError for an unknown zone. */
export function isValidTimezone(tz: string): boolean {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isKnownSession(value: string): value is KnownSession {
  return (KNOWN_SESSIONS as readonly string[]).includes(value);
}

export async function getPreferences(
  userId: string,
  db: PreferencesDb = defaultDb(),
): Promise<UserPreferencesView> {
  const row = await db.userPreference.findUnique({ where: { userId } });
  if (!row) return { timezone: null, preferredSessions: [] };
  return {
    timezone: row.timezone ?? null,
    // Defensive: only known sessions are ever returned, even if a row was
    // written by something other than this service.
    preferredSessions: (row.preferredSessions ?? []).filter(isKnownSession),
  };
}

export async function upsertPreferences(
  userId: string,
  input: { timezone?: string | null; preferredSessions?: string[] },
  db: PreferencesDb = defaultDb(),
): Promise<UserPreferencesView> {
  // Partial update: only fields present in the input are written, so a
  // timezone-only save never clobbers the saved sessions (and vice versa).
  const data: { timezone?: string | null; preferredSessions?: string[] } = {};
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.preferredSessions !== undefined) {
    data.preferredSessions = [...new Set(input.preferredSessions)];
  }
  const row = await db.userPreference.upsert({
    where: { userId },
    create: { userId, timezone: data.timezone ?? null, preferredSessions: data.preferredSessions ?? [] },
    update: data,
  });
  return {
    timezone: row.timezone ?? null,
    preferredSessions: (row.preferredSessions ?? []).filter(isKnownSession),
  };
}
