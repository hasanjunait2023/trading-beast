import { prisma } from './db.js';
import { getRadarRunById, type RadarHistoryDb } from './radar-history.js';
import { isKnownSession } from './preferences.js';

// Session plans (handoff §3 row 09 + §5 "Plan and preferences"): one draft
// per (user, session, planDate), owner-scoped in every WHERE clause, with
// optimistic concurrency via a monotonically increasing `version`. A pinned
// run must be a SUCCEEDED RadarRun owned by the same user — validated through
// the radar-history service, never by trusting the client.

export const PLAN_STATUSES = ['DRAFT', 'READY'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface SessionPlanRow {
  id: string;
  userId: string;
  session: string;
  planDate: Date;
  status: string;
  pinnedRunId: string | null;
  checklist: unknown;
  invalidation: string | null;
  riskNotes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionPlanView {
  id: string;
  session: string;
  /** YYYY-MM-DD (the @db.Date column, rendered in UTC). */
  planDate: string;
  status: string;
  pinnedRunId: string | null;
  checklist: ChecklistItem[];
  invalidation: string | null;
  riskNotes: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal structural slice of PrismaClient used here (injectable for tests). */
export interface PlansDb extends RadarHistoryDb {
  sessionPlan: {
    findFirst(args: unknown): Promise<SessionPlanRow | null>;
    findMany(args: unknown): Promise<SessionPlanRow[]>;
    create(args: unknown): Promise<SessionPlanRow>;
    update(args: unknown): Promise<SessionPlanRow>;
  };
}

const defaultDb = (): PlansDb => prisma as unknown as PlansDb;

export class PlanAlreadyExistsError extends Error {
  existing: SessionPlanView;
  constructor(existing: SessionPlanView) {
    super('A plan already exists for this session and date');
    this.name = 'PlanAlreadyExistsError';
    this.existing = existing;
  }
}

export class PlanNotFoundError extends Error {
  constructor() {
    super('Plan not found');
    this.name = 'PlanNotFoundError';
  }
}

export class VersionConflictError extends Error {
  current: SessionPlanView;
  constructor(current: SessionPlanView) {
    super('VERSION_CONFLICT');
    this.name = 'VersionConflictError';
    this.current = current;
  }
}

export class InvalidPinnedRunError extends Error {
  constructor() {
    super('Pinned run must be a completed Radar run owned by you');
    this.name = 'InvalidPinnedRunError';
  }
}

/** Strict YYYY-MM-DD → UTC-midnight Date for the @db.Date column, or null. */
export function parsePlanDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Round-trip check rejects overflow dates like 2026-02-31.
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function formatPlanDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ChecklistItem[] = [];
  for (const entry of raw) {
    if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
      const e = entry as Record<string, unknown>;
      if (typeof e.id === 'string' && typeof e.label === 'string') {
        items.push({ id: e.id, label: e.label, done: e.done === true });
      }
    }
  }
  return items;
}

export function mapPlan(row: SessionPlanRow): SessionPlanView {
  return {
    id: row.id,
    session: row.session,
    planDate: formatPlanDate(row.planDate),
    status: row.status,
    pinnedRunId: row.pinnedRunId ?? null,
    checklist: normalizeChecklist(row.checklist),
    invalidation: row.invalidation ?? null,
    riskNotes: row.riskNotes ?? null,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPlansForDate(
  userId: string,
  date: string,
  db: PlansDb = defaultDb(),
): Promise<SessionPlanView[]> {
  const planDate = parsePlanDate(date);
  if (!planDate) return [];
  const rows = await db.sessionPlan.findMany({
    where: { userId, planDate },
    orderBy: [{ session: 'asc' }, { id: 'asc' }],
  });
  return rows.map(mapPlan);
}

export async function getPlan(
  userId: string,
  session: string,
  date: string,
  db: PlansDb = defaultDb(),
): Promise<SessionPlanView | null> {
  const planDate = parsePlanDate(date);
  if (!planDate || !isKnownSession(session)) return null;
  const row = await db.sessionPlan.findFirst({ where: { userId, session, planDate } });
  return row ? mapPlan(row) : null;
}

export async function createPlan(
  userId: string,
  input: { session: string; planDate: string },
  db: PlansDb = defaultDb(),
): Promise<SessionPlanView> {
  const planDate = parsePlanDate(input.planDate);
  if (!planDate) throw new Error('Invalid plan date');
  const existing = await db.sessionPlan.findFirst({
    where: { userId, session: input.session, planDate },
  });
  if (existing) throw new PlanAlreadyExistsError(mapPlan(existing));
  try {
    const row = await db.sessionPlan.create({
      data: { userId, session: input.session, planDate, status: 'DRAFT', checklist: [] },
    });
    return mapPlan(row);
  } catch (err) {
    // Unique-violation race: another request created it first.
    if ((err as { code?: string })?.code === 'P2002') {
      const raced = await db.sessionPlan.findFirst({
        where: { userId, session: input.session, planDate },
      });
      if (raced) throw new PlanAlreadyExistsError(mapPlan(raced));
    }
    throw err;
  }
}

export interface PlanPatch {
  checklist?: ChecklistItem[];
  invalidation?: string | null;
  riskNotes?: string | null;
  status?: PlanStatus;
  pinnedRunId?: string | null;
  /** Required — the version the client based its edits on. */
  version: number;
}

export async function updatePlan(
  userId: string,
  id: string,
  patch: PlanPatch,
  db: PlansDb = defaultDb(),
): Promise<SessionPlanView> {
  const row = await db.sessionPlan.findFirst({ where: { id, userId } });
  if (!row) throw new PlanNotFoundError();
  if (row.version !== patch.version) throw new VersionConflictError(mapPlan(row));

  if (patch.pinnedRunId !== undefined && patch.pinnedRunId !== null) {
    // Owner-scoped SUCCEEDED check via radar-history: a foreign, running or
    // missing run simply does not match, so it is rejected without leaking
    // whether the run exists.
    const run = await getRadarRunById(userId, patch.pinnedRunId, db);
    if (!run) throw new InvalidPinnedRunError();
  }

  const data: Record<string, unknown> = { version: { increment: 1 } };
  if (patch.checklist !== undefined) data.checklist = patch.checklist;
  if (patch.invalidation !== undefined) data.invalidation = patch.invalidation;
  if (patch.riskNotes !== undefined) data.riskNotes = patch.riskNotes;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.pinnedRunId !== undefined) data.pinnedRunId = patch.pinnedRunId;

  try {
    // The version in the WHERE clause makes the check-and-increment atomic:
    // a concurrent writer that already bumped the version makes this update
    // match nothing (Prisma throws P2025), which we surface as a conflict.
    const updated = await db.sessionPlan.update({
      where: { id: row.id, userId, version: patch.version },
      data,
    });
    return mapPlan(updated);
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      const current = await db.sessionPlan.findFirst({ where: { id, userId } });
      if (current) throw new VersionConflictError(mapPlan(current));
      throw new PlanNotFoundError();
    }
    throw err;
  }
}
