import { describe, it, expect, vi } from 'vitest';
import {
  getPreferences,
  upsertPreferences,
  isValidTimezone,
  type PreferencesDb,
  type PreferenceRow,
} from './preferences.js';

function fakeDb(overrides: Record<string, unknown> = {}) {
  const userPreference: { findUnique: any; upsert: any } = {
    findUnique: vi.fn(async () => null),
    upsert: vi.fn(async (args: any) => ({
      userId: args.where.userId,
      timezone: args.create.timezone ?? null,
      preferredSessions: args.create.preferredSessions ?? [],
      updatedAt: new Date(),
      ...args.update,
    })),
    ...overrides,
  };
  return { db: { userPreference } as unknown as PreferencesDb, userPreference };
}

describe('isValidTimezone', () => {
  it('accepts real IANA zones', () => {
    expect(isValidTimezone('Asia/Dhaka')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
  });

  it('rejects non-zones and junk', () => {
    expect(isValidTimezone('Dhaka')).toBe(false);
    expect(isValidTimezone('GMT+6')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('Asia/Dhaka; DROP TABLE')).toBe(false);
  });
});

describe('getPreferences', () => {
  it('returns defaults (null + []) when the user has no row', async () => {
    const { db, userPreference } = fakeDb();
    await expect(getPreferences('user-1', db)).resolves.toEqual({
      timezone: null,
      preferredSessions: [],
    });
    const args = userPreference.findUnique.mock.calls[0][0] as any;
    expect(args.where).toEqual({ userId: 'user-1' });
  });

  it('returns the stored row, filtering out unknown session names', async () => {
    const row: PreferenceRow = {
      userId: 'user-1',
      timezone: 'Asia/Dhaka',
      preferredSessions: ['London', 'Mars', 'Asian'],
      updatedAt: new Date(),
    };
    const { db } = fakeDb({ findUnique: vi.fn(async () => row) });
    await expect(getPreferences('user-1', db)).resolves.toEqual({
      timezone: 'Asia/Dhaka',
      preferredSessions: ['London', 'Asian'],
    });
  });
});

describe('upsertPreferences', () => {
  it('upserts keyed by userId and dedupes sessions', async () => {
    const { db, userPreference } = fakeDb();
    const view = await upsertPreferences(
      'user-7',
      { timezone: 'Europe/London', preferredSessions: ['London', 'London', 'Asian'] },
      db,
    );
    const args = userPreference.upsert.mock.calls[0][0] as any;
    expect(args.where).toEqual({ userId: 'user-7' });
    expect(args.create.preferredSessions).toEqual(['London', 'Asian']);
    expect(view.timezone).toBe('Europe/London');
  });

  it('partial update: a timezone-only save does not clobber sessions', async () => {
    const { db, userPreference } = fakeDb();
    await upsertPreferences('user-7', { timezone: null }, db);
    const args = userPreference.upsert.mock.calls[0][0] as any;
    expect(args.update).toEqual({ timezone: null });
    expect(args.update).not.toHaveProperty('preferredSessions');
  });
});
