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
  quietHoursEnabled: boolean;
  /** "HH:MM" 24h in the user's preference timezone, or null. */
  quietStart: string | null;
  /** "HH:MM" 24h in the user's preference timezone, or null. */
  quietEnd: string | null;
}

export interface PreferenceRow {
  userId: string;
  timezone: string | null;
  preferredSessions: string[];
  quietHoursEnabled?: boolean;
  quietStart?: string | null;
  quietEnd?: string | null;
  updatedAt: Date;
}

/** Strict "HH:MM" 24-hour clock time. */
export function isValidTimeOfDay(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
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

function toView(row: PreferenceRow): UserPreferencesView {
  return {
    timezone: row.timezone ?? null,
    // Defensive: only known sessions are ever returned, even if a row was
    // written by something other than this service.
    preferredSessions: (row.preferredSessions ?? []).filter(isKnownSession),
    quietHoursEnabled: row.quietHoursEnabled === true,
    quietStart: row.quietStart ?? null,
    quietEnd: row.quietEnd ?? null,
  };
}

export async function getPreferences(
  userId: string,
  db: PreferencesDb = defaultDb(),
): Promise<UserPreferencesView> {
  const row = await db.userPreference.findUnique({ where: { userId } });
  if (!row) {
    return {
      timezone: null,
      preferredSessions: [],
      quietHoursEnabled: false,
      quietStart: null,
      quietEnd: null,
    };
  }
  return toView(row);
}

export interface PreferencesPatch {
  timezone?: string | null;
  preferredSessions?: string[];
  quietHoursEnabled?: boolean;
  quietStart?: string | null;
  quietEnd?: string | null;
}

export async function upsertPreferences(
  userId: string,
  input: PreferencesPatch,
  db: PreferencesDb = defaultDb(),
): Promise<UserPreferencesView> {
  // Partial update: only fields present in the input are written, so a
  // timezone-only save never clobbers the saved sessions (and vice versa).
  const data: Record<string, unknown> = {};
  if (input.timezone !== undefined) data.timezone = input.timezone;
  if (input.preferredSessions !== undefined) {
    data.preferredSessions = [...new Set(input.preferredSessions)];
  }
  if (input.quietHoursEnabled !== undefined) data.quietHoursEnabled = input.quietHoursEnabled;
  if (input.quietStart !== undefined) data.quietStart = input.quietStart;
  if (input.quietEnd !== undefined) data.quietEnd = input.quietEnd;
  const row = await db.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      timezone: (data.timezone as string | null | undefined) ?? null,
      preferredSessions: (data.preferredSessions as string[] | undefined) ?? [],
      quietHoursEnabled: (data.quietHoursEnabled as boolean | undefined) ?? false,
      quietStart: (data.quietStart as string | null | undefined) ?? null,
      quietEnd: (data.quietEnd as string | null | undefined) ?? null,
    },
    update: data,
  });
  return toView(row);
}
