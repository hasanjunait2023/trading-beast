import { prisma } from './db.js';

// Read-only Radar run history (handoff §5 "Latest result / history").
// Every query is owner-scoped in the WHERE clause and filtered to SUCCEEDED
// runs — never fetch-then-check. These reads never touch the credits service.

export interface RadarRunRow {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  result: unknown;
}

export interface MappedRadarRun {
  runId: string;
  /** From the stored result JSON; null when the JSON does not carry one. */
  session: string | null;
  scope: string | null;
  completedAt: Date | null;
  startedAt: Date;
  /** The stored FocusResult JSON, returned exactly as stored. */
  result: unknown;
}

/** Minimal structural slice of PrismaClient used here (injectable for tests). */
export interface RadarHistoryDb {
  radarRun: {
    findFirst(args: unknown): Promise<RadarRunRow | null>;
    findMany(args: unknown): Promise<RadarRunRow[]>;
    count(args: unknown): Promise<number>;
  };
}

function stringField(result: unknown, key: 'session' | 'scope'): string | null {
  if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
    const value = (result as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

export function mapRadarRun(row: RadarRunRow): MappedRadarRun {
  return {
    runId: row.id,
    session: stringField(row.result, 'session'),
    scope: stringField(row.result, 'scope'),
    completedAt: row.completedAt,
    startedAt: row.startedAt,
    result: row.result ?? null,
  };
}

const ORDER = [{ completedAt: 'desc' as const }, { id: 'desc' as const }];

export async function getLatestRadarRun(
  userId: string,
  db: RadarHistoryDb = prisma as unknown as RadarHistoryDb,
): Promise<MappedRadarRun | null> {
  const row = await db.radarRun.findFirst({
    where: { userId, status: 'SUCCEEDED' },
    orderBy: ORDER,
  });
  return row ? mapRadarRun(row) : null;
}

export async function listRadarRuns(
  userId: string,
  page: { skip: number; take: number },
  db: RadarHistoryDb = prisma as unknown as RadarHistoryDb,
): Promise<{ runs: MappedRadarRun[]; total: number }> {
  const where = { userId, status: 'SUCCEEDED' as const };
  const [rows, total] = await Promise.all([
    db.radarRun.findMany({ where, orderBy: ORDER, skip: page.skip, take: page.take }),
    db.radarRun.count({ where }),
  ]);
  return { runs: rows.map(mapRadarRun), total };
}

/**
 * One SUCCEEDED run by id, owner-scoped in the WHERE clause: another user's
 * run (or a non-SUCCEEDED run) simply does not match, so the route answers
 * 404 with no existence leak.
 */
export async function getRadarRunById(
  userId: string,
  id: string,
  db: RadarHistoryDb = prisma as unknown as RadarHistoryDb,
): Promise<MappedRadarRun | null> {
  const row = await db.radarRun.findFirst({
    where: { id, userId, status: 'SUCCEEDED' },
  });
  return row ? mapRadarRun(row) : null;
}
