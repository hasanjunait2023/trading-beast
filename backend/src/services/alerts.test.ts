import { describe, it, expect, vi } from 'vitest';
import {
  listAlertRules,
  createAlertRule,
  setAlertRuleEnabled,
  deleteAlertRule,
  evaluateSessionStartAlerts,
  isInQuietHours,
  AlertAlreadyExistsError,
  AlertNotFoundError,
  FRESHNESS_WINDOW_SEC,
  type AlertsDb,
  type AlertRuleRow,
  type AlertPreferenceRow,
} from './alerts.js';
import { getSessionWindow } from './session-clock.js';

function ruleRow(overrides: Partial<AlertRuleRow> = {}): AlertRuleRow {
  return {
    id: 'rule-1',
    userId: 'user-1',
    type: 'SESSION_START',
    session: 'London',
    enabled: true,
    lastTriggeredAt: null,
    lastSessionStartTs: null,
    createdAt: new Date('2026-11-25T00:00:00.000Z'),
    updatedAt: new Date('2026-11-25T00:00:00.000Z'),
    ...overrides,
  };
}

interface FakeState {
  rules: AlertRuleRow[];
  users: { id: string; telegramId: string | null }[];
  prefs: AlertPreferenceRow[];
}

/** In-memory fake honouring the WHERE semantics the service sends. */
function fakeDb(state: FakeState) {
  const matchesRule = (r: AlertRuleRow, w: any): boolean => {
    if (!w) return true;
    if (w.id !== undefined && r.id !== w.id) return false;
    if (w.userId !== undefined && r.userId !== w.userId) return false;
    if (w.type !== undefined && r.type !== w.type) return false;
    if (w.session !== undefined && r.session !== w.session) return false;
    if (w.enabled !== undefined && r.enabled !== w.enabled) return false;
    return true;
  };
  const alertRule = {
    findMany: vi.fn(async (args: any) => state.rules.filter((r) => matchesRule(r, args?.where))),
    findFirst: vi.fn(async (args: any) => state.rules.find((r) => matchesRule(r, args.where)) ?? null),
    create: vi.fn(async (args: any) => {
      const row = ruleRow({ id: `rule-${state.rules.length + 1}`, ...args.data });
      state.rules.push(row);
      return row;
    }),
    update: vi.fn(async (args: any) => {
      const idx = state.rules.findIndex((r) => r.id === args.where.id);
      if (idx === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
      state.rules[idx] = { ...state.rules[idx], ...args.data, updatedAt: new Date() };
      return state.rules[idx];
    }),
    delete: vi.fn(async (args: any) => {
      const idx = state.rules.findIndex((r) => r.id === args.where.id);
      if (idx === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
      return state.rules.splice(idx, 1)[0];
    }),
  };
  const user = {
    findMany: vi.fn(async (args: any) => {
      const ids: string[] | undefined = args?.where?.id?.in;
      return state.users.filter((u) => !ids || ids.includes(u.id));
    }),
  };
  const userPreference = {
    findMany: vi.fn(async (args: any) => {
      const ids: string[] | undefined = args?.where?.userId?.in;
      return state.prefs.filter((p) => !ids || ids.includes(p.userId));
    }),
  };
  return { db: { alertRule, user, userPreference } as unknown as AlertsDb, state };
}

function emptyState(): FakeState {
  return { rules: [], users: [{ id: 'user-1', telegramId: '424242' }], prefs: [] };
}

function fakeEnqueue() {
  const calls: { id: string; chatId: number; text: string }[] = [];
  const enqueue = vi.fn(async (id: string, chatId: number, text: string) => {
    calls.push({ id, chatId, text });
  });
  return { enqueue, calls };
}

// Fixed clocks: derive real session boundaries from session-clock itself so
// the tests track its DST behaviour instead of hard-coding epochs.
// Wed 2026-11-25 12:00 UTC is inside every session's current window day.
const MIDDAY = Math.floor(Date.UTC(2026, 10, 25, 12, 0, 0) / 1000);
const LONDON_START = getSessionWindow('London', MIDDAY).sessionStartTs;
const ASIAN_START = getSessionWindow('Asian', MIDDAY).sessionStartTs;

describe('alert rule CRUD (service level)', () => {
  it('creates a rule and lists it owner-scoped', async () => {
    const { db, state } = fakeDb(emptyState());
    const view = await createAlertRule('user-1', { type: 'SESSION_START', session: 'London' }, db);
    expect(view).toMatchObject({ type: 'SESSION_START', session: 'London', enabled: true });
    state.rules.push(ruleRow({ id: 'rule-x', userId: 'user-2', session: 'Asian' }));
    const mine = await listAlertRules('user-1', db);
    expect(mine).toHaveLength(1);
    expect(mine[0].id).toBe(view.id);
  });

  it('duplicate create throws AlertAlreadyExistsError carrying the existing rule (409 contract)', async () => {
    const { db } = fakeDb(emptyState());
    const first = await createAlertRule('user-1', { type: 'SESSION_START', session: 'London' }, db);
    await expect(
      createAlertRule('user-1', { type: 'SESSION_START', session: 'London' }, db),
    ).rejects.toMatchObject({ name: 'AlertAlreadyExistsError' });
    try {
      await createAlertRule('user-1', { type: 'SESSION_START', session: 'London' }, db);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AlertAlreadyExistsError);
      expect((err as AlertAlreadyExistsError).existing.id).toBe(first.id);
    }
  });

  it('rejects non-SESSION_START types — no rule type exists that cannot fire', async () => {
    const { db } = fakeDb(emptyState());
    await expect(
      createAlertRule('user-1', { type: 'PRICE_ABOVE', session: 'London' }, db),
    ).rejects.toThrow(/Unsupported alert type/);
  });

  it('patch/delete are owner-scoped: a foreign rule id is a 404', async () => {
    const { db, state } = fakeDb(emptyState());
    state.rules.push(ruleRow({ id: 'rule-9', userId: 'user-1' }));
    await expect(setAlertRuleEnabled('user-2', 'rule-9', false, db)).rejects.toBeInstanceOf(AlertNotFoundError);
    await expect(deleteAlertRule('user-2', 'rule-9', db)).rejects.toBeInstanceOf(AlertNotFoundError);
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0].enabled).toBe(true);
  });

  it('owner can toggle and delete their own rule', async () => {
    const { db, state } = fakeDb(emptyState());
    state.rules.push(ruleRow({ id: 'rule-9', userId: 'user-1' }));
    const off = await setAlertRuleEnabled('user-1', 'rule-9', false, db);
    expect(off.enabled).toBe(false);
    await deleteAlertRule('user-1', 'rule-9', db);
    expect(state.rules).toHaveLength(0);
  });
});

describe('isInQuietHours', () => {
  const base = { quietHoursEnabled: true, quietStart: '22:00', quietEnd: '06:00', timezone: 'UTC' };
  const at = (h: number, m = 0) => Math.floor(Date.UTC(2026, 10, 25, h, m) / 1000);

  it('overnight window wraps past midnight (22:00–06:00)', () => {
    expect(isInQuietHours(at(23, 30), base)).toBe(true);
    expect(isInQuietHours(at(0, 30), base)).toBe(true);
    expect(isInQuietHours(at(5, 59), base)).toBe(true);
    expect(isInQuietHours(at(6, 0), base)).toBe(false);
    expect(isInQuietHours(at(21, 59), base)).toBe(false);
    expect(isInQuietHours(at(12, 0), base)).toBe(false);
  });

  it('same-day window is [start, end)', () => {
    const day = { ...base, quietStart: '13:00', quietEnd: '14:00' };
    expect(isInQuietHours(at(12, 59), day)).toBe(false);
    expect(isInQuietHours(at(13, 0), day)).toBe(true);
    expect(isInQuietHours(at(13, 59), day)).toBe(true);
    expect(isInQuietHours(at(14, 0), day)).toBe(false);
  });

  it('disabled or degenerate windows never suppress', () => {
    expect(isInQuietHours(at(23, 30), { ...base, quietHoursEnabled: false })).toBe(false);
    expect(isInQuietHours(at(23, 30), { ...base, quietStart: '22:00', quietEnd: '22:00' })).toBe(false);
    expect(isInQuietHours(at(23, 30), { ...base, quietStart: null })).toBe(false);
  });

  it('the user timezone decides: 00:30 UTC is quiet in UTC but morning in Dhaka', () => {
    expect(isInQuietHours(at(0, 30), base)).toBe(true);
    expect(isInQuietHours(at(0, 30), { ...base, timezone: 'Asia/Dhaka' })).toBe(false);
  });
});

describe('evaluateSessionStartAlerts', () => {
  it('fires once at the boundary with the dedupe id and marker; a second tick does not re-fire', async () => {
    const state = emptyState();
    state.rules.push(ruleRow({ session: 'London' }));
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    const now = LONDON_START + 120;

    const first = await evaluateSessionStartAlerts(now, db, enqueue);
    expect(first.fired).toBe(1);
    expect(calls).toEqual([
      { id: `alert:rule-1:${LONDON_START}`, chatId: 424242, text: 'London session has started.' },
    ]);
    expect(state.rules[0].lastSessionStartTs).toBe(BigInt(LONDON_START));
    expect(state.rules[0].lastTriggeredAt).toEqual(new Date(now * 1000));

    const second = await evaluateSessionStartAlerts(now + 60, db, enqueue);
    expect(second.fired).toBe(0);
    expect(calls).toHaveLength(1);
  });

  it('skips disabled rules', async () => {
    const state = emptyState();
    state.rules.push(ruleRow({ session: 'London', enabled: false }));
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    const res = await evaluateSessionStartAlerts(LONDON_START + 60, db, enqueue);
    expect(res.evaluated).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('skips a stale boundary (older than the freshness window) without consuming it', async () => {
    const state = emptyState();
    state.rules.push(ruleRow({ session: 'London' }));
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    const res = await evaluateSessionStartAlerts(LONDON_START + FRESHNESS_WINDOW_SEC + 1, db, enqueue);
    expect(res.fired).toBe(0);
    expect(res.skippedStale).toBe(1);
    expect(calls).toHaveLength(0);
    expect(state.rules[0].lastSessionStartTs).toBeNull();
  });

  it('suppresses inside quiet hours, then still fires after quiet hours end while fresh', async () => {
    const state = emptyState();
    state.rules.push(ruleRow({ session: 'London' }));
    // London starts 08:00 UTC in late November; quiet 07:00–08:05 UTC
    // suppresses the +120s tick but not the +360s tick.
    state.prefs.push({
      userId: 'user-1',
      timezone: 'UTC',
      quietHoursEnabled: true,
      quietStart: '07:00',
      quietEnd: '08:05',
    });
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();

    const suppressed = await evaluateSessionStartAlerts(LONDON_START + 120, db, enqueue);
    expect(suppressed.suppressedQuietHours).toBe(1);
    expect(suppressed.fired).toBe(0);
    expect(state.rules[0].lastSessionStartTs).toBeNull();

    const after = await evaluateSessionStartAlerts(LONDON_START + 360, db, enqueue);
    expect(after.fired).toBe(1);
    expect(calls).toHaveLength(1);
  });

  it('suppresses inside an overnight quiet window (22:00–06:00)', async () => {
    const state = emptyState();
    state.rules.push(ruleRow({ session: 'Asian' }));
    state.prefs.push({
      userId: 'user-1',
      timezone: 'UTC',
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '06:00',
    });
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    // Asian start is 00:00 UTC — inside the wrapped window.
    const res = await evaluateSessionStartAlerts(ASIAN_START + 120, db, enqueue);
    expect(res.suppressedQuietHours).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it('per-user timezone: the same instant fires for Dhaka but is suppressed for UTC', async () => {
    const state: FakeState = {
      rules: [
        ruleRow({ id: 'rule-utc', userId: 'user-utc', session: 'Asian' }),
        ruleRow({ id: 'rule-dhaka', userId: 'user-dhaka', session: 'Asian' }),
      ],
      users: [
        { id: 'user-utc', telegramId: '111' },
        { id: 'user-dhaka', telegramId: '222' },
      ],
      prefs: [
        { userId: 'user-utc', timezone: 'UTC', quietHoursEnabled: true, quietStart: '22:00', quietEnd: '06:00' },
        { userId: 'user-dhaka', timezone: 'Asia/Dhaka', quietHoursEnabled: true, quietStart: '22:00', quietEnd: '06:00' },
      ],
    };
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    const res = await evaluateSessionStartAlerts(ASIAN_START + 120, db, enqueue);
    expect(res.suppressedQuietHours).toBe(1);
    expect(res.fired).toBe(1);
    expect(calls).toEqual([
      { id: `alert:rule-dhaka:${ASIAN_START}`, chatId: 222, text: 'Asian session has started.' },
    ]);
  });

  it('skips users without a linked Telegram id instead of throwing', async () => {
    const state = emptyState();
    state.users = [{ id: 'user-1', telegramId: null }];
    state.rules.push(ruleRow({ session: 'London' }));
    const { db } = fakeDb(state);
    const { enqueue, calls } = fakeEnqueue();
    const res = await evaluateSessionStartAlerts(LONDON_START + 60, db, enqueue);
    expect(res.skippedNoTelegram).toBe(1);
    expect(calls).toHaveLength(0);
  });
});
