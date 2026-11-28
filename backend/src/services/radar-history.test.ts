import { describe, it, expect, vi } from 'vitest';
import {
  getLatestRadarRun,
  listRadarRuns,
  getRadarRunById,
  mapRadarRun,
  type RadarHistoryDb,
  type RadarRunRow,
} from './radar-history.js';

const startedAt = new Date('2026-11-28T10:00:00.000Z');
const completedAt = new Date('2026-11-28T10:01:00.000Z');
const resultJson = {
  session: 'London',
  scope: 'watchlist',
  timestamp: '2026-11-28T10:01:00.000Z',
  focus: [],
  watch: [],
  avoid: [],
};

function row(overrides: Partial<RadarRunRow> = {}): RadarRunRow {
  return { id: 'run-1', startedAt, completedAt, result: resultJson, ...overrides };
}

function fakeDb(overrides: Record<string, unknown> = {}) {
  const radarRun: { findFirst: any; findMany: any; count: any } = {
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => [] as RadarRunRow[]),
    count: vi.fn(async () => 0),
    ...overrides,
  };
  return { db: { radarRun } as unknown as RadarHistoryDb, radarRun };
}

describe('mapRadarRun', () => {
  it('reads session/scope from the stored result JSON and returns it as stored', () => {
    const mapped = mapRadarRun(row());
    expect(mapped).toEqual({
      runId: 'run-1',
      session: 'London',
      scope: 'watchlist',
      completedAt,
      startedAt,
      result: resultJson,
    });
    expect(mapped.result).toBe(resultJson);
  });

  it('derives session/scope as null (never invented) when the JSON lacks them', () => {
    expect(mapRadarRun(row({ result: { focus: [] } })).session).toBeNull();
    expect(mapRadarRun(row({ result: { focus: [] } })).scope).toBeNull();
    expect(mapRadarRun(row({ result: null })).session).toBeNull();
    expect(mapRadarRun(row({ result: 'nope' })).scope).toBeNull();
    expect(mapRadarRun(row({ result: { session: 42, scope: '' } })).session).toBeNull();
  });
});

describe('getLatestRadarRun', () => {
  it('queries owner-scoped, SUCCEEDED-only, ordered by completedAt desc', async () => {
    const { db, radarRun } = fakeDb({ findFirst: vi.fn(async () => row()) });
    const latest = await getLatestRadarRun('user-1', db);
    expect(latest?.runId).toBe('run-1');
    const args = radarRun.findFirst.mock.calls[0][0] as any;
    expect(args.where).toEqual({ userId: 'user-1', status: 'SUCCEEDED' });
    expect(args.orderBy).toEqual([{ completedAt: 'desc' }, { id: 'desc' }]);
  });

  it('returns null when the user has no completed runs', async () => {
    const { db } = fakeDb();
    await expect(getLatestRadarRun('user-1', db)).resolves.toBeNull();
  });
});

describe('listRadarRuns', () => {
  it('applies owner scope, SUCCEEDED filter, ordering and pagination bounds', async () => {
    const rows = [row({ id: 'run-2' }), row({ id: 'run-1' })];
    const { db, radarRun } = fakeDb({
      findMany: vi.fn(async () => rows),
      count: vi.fn(async () => 7),
    });
    const { runs, total } = await listRadarRuns('user-9', { skip: 20, take: 10 }, db);
    expect(runs.map((r) => r.runId)).toEqual(['run-2', 'run-1']);
    expect(total).toBe(7);
    const findArgs = radarRun.findMany.mock.calls[0][0] as any;
    expect(findArgs.where).toEqual({ userId: 'user-9', status: 'SUCCEEDED' });
    expect(findArgs.orderBy).toEqual([{ completedAt: 'desc' }, { id: 'desc' }]);
    expect(findArgs.skip).toBe(20);
    expect(findArgs.take).toBe(10);
    const countArgs = radarRun.count.mock.calls[0][0] as any;
    expect(countArgs.where).toEqual({ userId: 'user-9', status: 'SUCCEEDED' });
  });

  it('returns an empty page with total 0 when there are no runs', async () => {
    const { db } = fakeDb();
    await expect(listRadarRuns('user-1', { skip: 0, take: 50 }, db)).resolves.toEqual({
      runs: [],
      total: 0,
    });
  });
});

describe('getRadarRunById', () => {
  it('scopes by id AND userId AND SUCCEEDED in the WHERE clause', async () => {
    const { db, radarRun } = fakeDb({ findFirst: vi.fn(async () => row()) });
    const found = await getRadarRunById('user-1', 'run-1', db);
    expect(found?.runId).toBe('run-1');
    const args = radarRun.findFirst.mock.calls[0][0] as any;
    expect(args.where).toEqual({ id: 'run-1', userId: 'user-1', status: 'SUCCEEDED' });
  });

  it('returns null for a foreign or non-existent run (route answers 404, no existence leak)', async () => {
    // The fake models the real query semantics: a run owned by user-2 never
    // matches a WHERE clause carrying userId user-1.
    const foreign = row({ id: 'run-foreign' });
    const findFirst = vi.fn(async (args: any) =>
      args.where.id === foreign.id && args.where.userId === 'user-2' ? foreign : null,
    );
    const { db } = fakeDb({ findFirst });
    await expect(getRadarRunById('user-1', 'run-foreign', db)).resolves.toBeNull();
    await expect(getRadarRunById('user-1', 'missing', db)).resolves.toBeNull();
  });
});
