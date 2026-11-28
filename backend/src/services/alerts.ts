import { prisma } from './db.js';
import { getSessionWindow, SESSION_NAMES, type SessionName } from './session-clock.js';
import { isKnownSession, isValidTimezone } from './preferences.js';
import { enqueueRadarDelivery } from './telegram-delivery.js';

// Alerts (handoff §3 row 13 + §5 "Calendar and alerts").
//
// HONEST SCOPE: SESSION_START is the only alert type that exists. It is the
// only type whose trigger is computable today — session boundaries come from
// session-clock.ts and delivery goes through the Telegram outbox
// (telegram-delivery.ts). There is no price/indicator trigger feed, so no
// other rule type is offered, accepted, or promised anywhere in the API.

export const ALERT_TYPES = ['SESSION_START'] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

/** What the evaluator can actually evaluate — surfaced verbatim in the API. */
export const EVALUATOR_SCOPE = 'SESSION_START only';

/**
 * Freshness window: a session-start boundary older than this is NOT
 * delivered. The evaluator ticks every 60s, so 10 minutes of slack covers
 * ordinary scheduling jitter while guaranteeing that a server coming back
 * after hours of downtime does not blast users with stale "session started"
 * messages for sessions that began long ago.
 */
export const FRESHNESS_WINDOW_SEC = 10 * 60;

export interface AlertRuleRow {
  id: string;
  userId: string;
  type: string;
  session: string;
  enabled: boolean;
  lastTriggeredAt: Date | null;
  lastSessionStartTs: bigint | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertRuleView {
  id: string;
  type: string;
  session: string;
  enabled: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Preference slice the evaluator needs (quiet hours + timezone). */
export interface AlertPreferenceRow {
  userId: string;
  timezone: string | null;
  quietHoursEnabled: boolean;
  quietStart: string | null;
  quietEnd: string | null;
}

/** Minimal structural slice of PrismaClient used here (injectable for tests). */
export interface AlertsDb {
  alertRule: {
    findMany(args: unknown): Promise<AlertRuleRow[]>;
    findFirst(args: unknown): Promise<AlertRuleRow | null>;
    create(args: unknown): Promise<AlertRuleRow>;
    update(args: unknown): Promise<AlertRuleRow>;
    delete(args: unknown): Promise<AlertRuleRow>;
  };
  userPreference: {
    findMany(args: unknown): Promise<AlertPreferenceRow[]>;
  };
  user: {
    findMany(args: unknown): Promise<{ id: string; telegramId: string | null }[]>;
  };
}

const defaultDb = (): AlertsDb => prisma as unknown as AlertsDb;

export class AlertAlreadyExistsError extends Error {
  existing: AlertRuleView;
  constructor(existing: AlertRuleView) {
    super('An alert rule already exists for this type and session');
    this.name = 'AlertAlreadyExistsError';
    this.existing = existing;
  }
}

export class AlertNotFoundError extends Error {
  constructor() {
    super('Alert rule not found');
    this.name = 'AlertNotFoundError';
  }
}

export function isAlertType(value: string): value is AlertType {
  return (ALERT_TYPES as readonly string[]).includes(value);
}

export function mapAlertRule(row: AlertRuleRow): AlertRuleView {
  return {
    id: row.id,
    type: row.type,
    session: row.session,
    enabled: row.enabled,
    lastTriggeredAt: row.lastTriggeredAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listAlertRules(
  userId: string,
  db: AlertsDb = defaultDb(),
): Promise<AlertRuleView[]> {
  const rows = await db.alertRule.findMany({
    where: { userId },
    orderBy: [{ session: 'asc' }, { id: 'asc' }],
  });
  return rows.map(mapAlertRule);
}

export async function createAlertRule(
  userId: string,
  input: { type: string; session: string },
  db: AlertsDb = defaultDb(),
): Promise<AlertRuleView> {
  if (!isAlertType(input.type)) throw new Error(`Unsupported alert type: ${input.type}`);
  if (!isKnownSession(input.session)) throw new Error(`Unknown session: ${input.session}`);
  const existing = await db.alertRule.findFirst({
    where: { userId, type: input.type, session: input.session },
  });
  if (existing) throw new AlertAlreadyExistsError(mapAlertRule(existing));
  try {
    const row = await db.alertRule.create({
      data: { userId, type: input.type, session: input.session, enabled: true },
    });
    return mapAlertRule(row);
  } catch (err) {
    // Unique-violation race: another request created it first.
    if ((err as { code?: string })?.code === 'P2002') {
      const raced = await db.alertRule.findFirst({
        where: { userId, type: input.type, session: input.session },
      });
      if (raced) throw new AlertAlreadyExistsError(mapAlertRule(raced));
    }
    throw err;
  }
}

export async function setAlertRuleEnabled(
  userId: string,
  id: string,
  enabled: boolean,
  db: AlertsDb = defaultDb(),
): Promise<AlertRuleView> {
  const row = await db.alertRule.findFirst({ where: { id, userId } });
  if (!row) throw new AlertNotFoundError();
  const updated = await db.alertRule.update({ where: { id: row.id }, data: { enabled } });
  return mapAlertRule(updated);
}

export async function deleteAlertRule(
  userId: string,
  id: string,
  db: AlertsDb = defaultDb(),
): Promise<void> {
  const row = await db.alertRule.findFirst({ where: { id, userId } });
  if (!row) throw new AlertNotFoundError();
  await db.alertRule.delete({ where: { id: row.id } });
}

// --- Quiet hours -----------------------------------------------------------

function timeToMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes since local midnight for `nowSec` in `zone` (fallback UTC). */
export function localMinutesOfDay(nowSec: number, zone: string): number {
  const tz = isValidTimezone(zone) ? zone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(nowSec * 1000));
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return (hour % 24) * 60 + minute;
}

/**
 * Is `nowSec` inside the quiet window [start, end) in the user's timezone?
 * Windows may wrap past midnight (22:00–06:00). A degenerate window
 * (start === end) or a malformed/missing bound means "not quiet" — a broken
 * preference must never silently swallow every alert.
 */
export function isInQuietHours(
  nowSec: number,
  pref: { quietHoursEnabled: boolean; quietStart: string | null; quietEnd: string | null; timezone: string | null },
): boolean {
  if (!pref.quietHoursEnabled) return false;
  if (!pref.quietStart || !pref.quietEnd) return false;
  const start = timeToMinutes(pref.quietStart);
  const end = timeToMinutes(pref.quietEnd);
  if (start === null || end === null || start === end) return false;
  const now = localMinutesOfDay(nowSec, pref.timezone ?? 'UTC');
  return start < end ? now >= start && now < end : now >= start || now < end;
}

// --- Evaluator -------------------------------------------------------------

export type EnqueueFn = (id: string, chatId: number, text: string) => Promise<void>;

const defaultEnqueue: EnqueueFn = (id, chatId, text) => enqueueRadarDelivery(id, chatId, text);

export interface EvaluationResult {
  evaluated: number;
  fired: number;
  suppressedQuietHours: number;
  skippedStale: number;
  skippedNoTelegram: number;
}

/**
 * One evaluator tick. For every enabled SESSION_START rule, the session's
 * most recent start boundary (sessionStartTs from getSessionWindow — the
 * current window's start IS the last boundary <= now) fires exactly once:
 *
 *  - dedupe: boundary must be > rule.lastSessionStartTs, and the delivery id
 *    `alert:{ruleId}:{boundaryTs}` is an idempotent outbox upsert, so repeat
 *    ticks (or a crash between enqueue and marker update) cannot double-send;
 *  - freshness: boundaries older than FRESHNESS_WINDOW_SEC are skipped (and
 *    deliberately NOT marked, so the skip stays visible in the counters);
 *  - quiet hours: suppressed while inside the user's quiet window in their
 *    preference timezone (fallback UTC). Suppression does not consume the
 *    boundary — if quiet hours end while the boundary is still fresh, the
 *    alert still fires on a later tick.
 */
export async function evaluateSessionStartAlerts(
  nowSec: number,
  db: AlertsDb = defaultDb(),
  enqueue: EnqueueFn = defaultEnqueue,
): Promise<EvaluationResult> {
  const result: EvaluationResult = {
    evaluated: 0,
    fired: 0,
    suppressedQuietHours: 0,
    skippedStale: 0,
    skippedNoTelegram: 0,
  };

  const rules = await db.alertRule.findMany({
    where: { enabled: true, type: 'SESSION_START' },
  });
  if (rules.length === 0) return result;

  const userIds = [...new Set(rules.map((r) => r.userId))];
  const [users, prefs] = await Promise.all([
    db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, telegramId: true } }),
    db.userPreference.findMany({ where: { userId: { in: userIds } } }),
  ]);
  const telegramByUser = new Map(users.map((u) => [u.id, u.telegramId]));
  const prefByUser = new Map(prefs.map((p) => [p.userId, p]));

  // Boundaries are per-session, not per-user — compute once per tick.
  const boundaryBySession = new Map<string, number>();
  for (const name of SESSION_NAMES) {
    boundaryBySession.set(name, getSessionWindow(name, nowSec).sessionStartTs);
  }

  for (const rule of rules) {
    result.evaluated += 1;
    if (!isKnownSession(rule.session)) continue;
    const boundary = boundaryBySession.get(rule.session);
    if (boundary === undefined) continue;

    const last = rule.lastSessionStartTs === null ? 0 : Number(rule.lastSessionStartTs);
    if (boundary <= last) continue; // already delivered for this boundary

    if (nowSec - boundary > FRESHNESS_WINDOW_SEC) {
      result.skippedStale += 1;
      continue;
    }

    const pref = prefByUser.get(rule.userId) ?? {
      userId: rule.userId,
      timezone: null,
      quietHoursEnabled: false,
      quietStart: null,
      quietEnd: null,
    };
    if (isInQuietHours(nowSec, pref)) {
      result.suppressedQuietHours += 1;
      continue;
    }

    const telegramId = telegramByUser.get(rule.userId);
    const chatId = telegramId ? Number(telegramId) : NaN;
    if (!Number.isFinite(chatId)) {
      result.skippedNoTelegram += 1;
      continue;
    }

    await enqueue(
      `alert:${rule.id}:${boundary}`,
      chatId,
      `${rule.session} session has started.`,
    );
    await db.alertRule.update({
      where: { id: rule.id },
      data: {
        lastTriggeredAt: new Date(nowSec * 1000),
        lastSessionStartTs: BigInt(boundary),
      },
    });
    result.fired += 1;
  }
  return result;
}

export { SESSION_NAMES, type SessionName };
