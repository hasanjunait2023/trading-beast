import { describe, it, expect, vi } from 'vitest';
import {
  listPlansForDate,
  getPlan,
  createPlan,
  updatePlan,
  parsePlanDate,
  PlanAlreadyExistsError,
  PlanNotFoundError,
  VersionConflictError,
  InvalidPinnedRunError,
  type PlansDb,
  type SessionPlanRow,
} from './plans.js';

const planDate = new Date('2026-11-28T00:00:00.000Z');

function planRow(overrides: Partial<SessionPlanRow> = {}): SessionPlanRow {
  return {
    id: 'plan-1',
    userId: 'user-1',
    session: 'London',
    planDate,
    status: 'DRAFT',
    pinnedRunId: null,
    checklist: [],
    invalidation: null,
    riskNotes: null,
    version: 1,
    createdAt: new Date('2026-11-28T08:00:00.000Z'),
    updatedAt: new Date('2026-11-28T08:00:00.000Z'),
    ...overrides,
  };
}

/**
 * In-memory fake with real query semantics: findFirst/findMany match on the
 * WHERE fields the service sends, and update honours the optimistic-
 * concurrency WHERE (id + userId + version), throwing P2025 when it no
 * longer matches — mirroring Prisma.
 */
function fakeDb(seedPlans: SessionPlanRow[] = [], succeededRunIds: Record<string, string> = {}) {
  const plans = [...seedPlans];
  const sessionPlan: { findFirst: any; findMany: any; create: any; update: any } = {
    findFirst: vi.fn(async (args: any) => {
      const w = args.where;
      return (
        plans.find(
          (p) =>
            (w.id === undefined || p.id === w.id) &&
            (w.userId === undefined || p.userId === w.userId) &&
            (w.session === undefined || p.session === w.session) &&
            (w.planDate === undefined || p.planDate.getTime() === w.planDate.getTime()),
        ) ?? null
      );
    }),
    findMany: vi.fn(async (args: any) => {
      const w = args.where;
      return plans.filter(
        (p) =>
          p.userId === w.userId &&
          (w.planDate === undefined || p.planDate.getTime() === w.planDate.getTime()),
      );
    }),
    create: vi.fn(async (args: any) => {
      const dupe = plans.find(
        (p) =>
          p.userId === args.data.userId &&
          p.session === args.data.session &&
          p.planDate.getTime() === args.data.planDate.getTime(),
      );
      if (dupe) throw Object.assign(new Error('unique'), { code: 'P2002' });
      const row = planRow({
        id: `plan-${plans.length + 1}`,
        userId: args.data.userId,
        session: args.data.session,
        planDate: args.data.planDate,
        status: args.data.status,
        checklist: args.data.checklist,
      });
      plans.push(row);
      return row;
    }),
    update: vi.fn(async (args: any) => {
      const w = args.where;
      const idx = plans.findIndex(
        (p) => p.id === w.id && p.userId === w.userId && p.version === w.version,
      );
      if (idx === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
      const next = { ...plans[idx] };
      for (const [k, v] of Object.entries(args.data)) {
        if (k === 'version') next.version = plans[idx].version + (v as any).increment;
        else (next as any)[k] = v;
      }
      plans[idx] = next;
      return next;
    }),
  };
  // radarRun.findFirst models radar-history's owner-scoped SUCCEEDED query:
  // succeededRunIds maps runId → owner userId.
  const radarRun = {
    findFirst: vi.fn(async (args: any) => {
      const w = args.where;
      if (w.status !== 'SUCCEEDED') return null;
      return succeededRunIds[w.id] === w.userId
        ? { id: w.id, startedAt: new Date(), completedAt: new Date(), result: { session: 'London' } }
        : null;
    }),
    findMany: vi.fn(async () => []),
    count: vi.fn(async () => 0),
  };
  return { db: { sessionPlan, radarRun } as unknown as PlansDb, sessionPlan, radarRun, plans };
}

describe('parsePlanDate', () => {
  it('accepts strict YYYY-MM-DD and rejects overflow/junk', () => {
    expect(parsePlanDate('2026-11-28')?.toISOString()).toBe('2026-11-28T00:00:00.000Z');
    expect(parsePlanDate('2026-02-31')).toBeNull();
    expect(parsePlanDate('28-11-2026')).toBeNull();
    expect(parsePlanDate('2026-11-28T00:00:00Z')).toBeNull();
  });
});

describe('createPlan', () => {
  it('creates a DRAFT plan at version 1', async () => {
    const { db } = fakeDb();
    const plan = await createPlan('user-1', { session: 'London', planDate: '2026-11-28' }, db);
    expect(plan).toMatchObject({ session: 'London', planDate: '2026-11-28', status: 'DRAFT', version: 1, checklist: [] });
  });

  it('enforces unique (user, session, date): second create raises PlanAlreadyExists with the existing plan', async () => {
    const { db } = fakeDb();
    await createPlan('user-1', { session: 'London', planDate: '2026-11-28' }, db);
    const err = await createPlan('user-1', { session: 'London', planDate: '2026-11-28' }, db).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(PlanAlreadyExistsError);
    expect(err.existing.session).toBe('London');
    // A different session or a different user is a different plan.
    await expect(
      createPlan('user-1', { session: 'Asian', planDate: '2026-11-28' }, db),
    ).resolves.toMatchObject({ session: 'Asian' });
    await expect(
      createPlan('user-2', { session: 'London', planDate: '2026-11-28' }, db),
    ).resolves.toMatchObject({ session: 'London' });
  });
});

describe('getPlan / listPlansForDate (owner scoping)', () => {
  it('only returns the caller’s own plans', async () => {
    const mine = planRow({ id: 'p-mine', userId: 'user-1' });
    const foreign = planRow({ id: 'p-foreign', userId: 'user-2', session: 'Asian' });
    const { db } = fakeDb([mine, foreign]);
    await expect(getPlan('user-1', 'London', '2026-11-28', db)).resolves.toMatchObject({ id: 'p-mine' });
    await expect(getPlan('user-2', 'London', '2026-11-28', db)).resolves.toBeNull();
    const list = await listPlansForDate('user-1', '2026-11-28', db);
    expect(list.map((p) => p.id)).toEqual(['p-mine']);
    await expect(getPlan('user-1', 'London', '2026-11-29', db)).resolves.toBeNull();
  });
});

describe('updatePlan', () => {
  it('applies the patch and increments the version', async () => {
    const { db } = fakeDb([planRow()]);
    const updated = await updatePlan(
      'user-1',
      'plan-1',
      { checklist: [{ id: 'a', label: 'Check OR', done: true }], status: 'READY', version: 1 },
      db,
    );
    expect(updated.version).toBe(2);
    expect(updated.status).toBe('READY');
    expect(updated.checklist).toEqual([{ id: 'a', label: 'Check OR', done: true }]);
  });

  it('version mismatch → VersionConflictError carrying the current server copy', async () => {
    const { db } = fakeDb([planRow({ version: 3, riskNotes: 'server copy' })]);
    const err = await updatePlan('user-1', 'plan-1', { riskNotes: 'stale edit', version: 1 }, db).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(VersionConflictError);
    expect(err.current.version).toBe(3);
    expect(err.current.riskNotes).toBe('server copy');
  });

  it('another user’s plan is not found (no existence leak)', async () => {
    const { db } = fakeDb([planRow({ userId: 'user-2' })]);
    await expect(
      updatePlan('user-1', 'plan-1', { riskNotes: 'x', version: 1 }, db),
    ).rejects.toBeInstanceOf(PlanNotFoundError);
  });

  it('pin validation: own SUCCEEDED run pins; foreign/unknown run is rejected', async () => {
    const runs = { 'run-own': 'user-1', 'run-foreign': 'user-2' };
    const { db } = fakeDb([planRow()], runs);
    await expect(
      updatePlan('user-1', 'plan-1', { pinnedRunId: 'run-own', version: 1 }, db),
    ).resolves.toMatchObject({ pinnedRunId: 'run-own', version: 2 });

    const { db: db2 } = fakeDb([planRow()], runs);
    await expect(
      updatePlan('user-1', 'plan-1', { pinnedRunId: 'run-foreign', version: 1 }, db2),
    ).rejects.toBeInstanceOf(InvalidPinnedRunError);
    await expect(
      updatePlan('user-1', 'plan-1', { pinnedRunId: 'run-missing', version: 1 }, db2),
    ).rejects.toBeInstanceOf(InvalidPinnedRunError);
  });

  it('unpinning (pinnedRunId: null) skips run validation and clears the pin', async () => {
    const { db, radarRun } = fakeDb([planRow({ pinnedRunId: 'run-own' })], {});
    await expect(
      updatePlan('user-1', 'plan-1', { pinnedRunId: null, version: 1 }, db),
    ).resolves.toMatchObject({ pinnedRunId: null });
    expect(radarRun.findFirst).not.toHaveBeenCalled();
  });
});
