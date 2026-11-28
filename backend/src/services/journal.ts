import { Prisma } from '@prisma/client';
import { prisma } from './db.js';
import { canonicalInstrument } from './watchlist.js';

// Trade journal (handoff §3 rows 11 + 18, §5 "Journal and exposure").
// Owner-scoped in every WHERE clause — never fetch-then-check.
//
// Money/price precision: quantity and prices are Prisma Decimal(20,8)
// end-to-end. The API accepts and returns them as decimal STRINGS so JSON
// never round-trips them through a float; P&L and R are computed with
// Decimal arithmetic in this service (never stored) and also returned as
// strings (null when undefined).
//
// P&L semantics (closed trades only — a trade is closed when it has BOTH
// closedAt and exitPrice):
//   pnl = (exit - entry) * quantity * (LONG ? 1 : -1) - fees   [trade currency]
// R multiple = pnl / initialRiskAmount, defined ONLY when initialRiskAmount
// is present and > 0; otherwise null (UI renders "R unavailable").
// Summaries group by currency — P&L is NEVER summed across currencies.

export const JOURNAL_SIDES = ['LONG', 'SHORT'] as const;
export type JournalSide = (typeof JOURNAL_SIDES)[number];

type DecimalLike = Prisma.Decimal;

export interface JournalTradeRow {
  id: string;
  userId: string;
  symbol: string;
  side: string;
  openedAt: Date;
  closedAt: Date | null;
  quantity: DecimalLike;
  entryPrice: DecimalLike;
  exitPrice: DecimalLike | null;
  stopPrice: DecimalLike | null;
  fees: DecimalLike;
  currency: string;
  initialRiskAmount: DecimalLike | null;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalTradeView {
  id: string;
  symbol: string;
  side: string;
  openedAt: Date;
  closedAt: Date | null;
  isClosed: boolean;
  /** Decimal strings — preserve precision; format at the UI boundary. */
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  stopPrice: string | null;
  fees: string;
  currency: string;
  initialRiskAmount: string | null;
  notes: string | null;
  tags: string[];
  /** Decimal string for closed trades, else null. */
  pnl: string | null;
  /** Decimal string when P&L is defined AND initialRiskAmount > 0, else null. */
  rMultiple: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalSummaryByCurrency {
  currency: string;
  /** Decimal string: sum of closed-trade P&L in this currency only. */
  totalPnl: string;
  /** Sum of defined R multiples only (dimensionless), as a decimal string. */
  rSum: string;
  /** How many closed trades in this currency had a defined R. */
  rCount: number;
}

export interface JournalSummary {
  closedCount: number;
  openCount: number;
  byCurrency: JournalSummaryByCurrency[];
}

/** Minimal structural slice of PrismaClient used here (injectable for tests). */
export interface JournalDb {
  journalTrade: {
    findFirst(args: unknown): Promise<JournalTradeRow | null>;
    findMany(args: unknown): Promise<JournalTradeRow[]>;
    count(args: unknown): Promise<number>;
    create(args: unknown): Promise<JournalTradeRow>;
    update(args: unknown): Promise<JournalTradeRow>;
    delete(args: unknown): Promise<JournalTradeRow>;
  };
}

const defaultDb = (): JournalDb => prisma as unknown as JournalDb;

export class JournalNotFoundError extends Error {
  constructor() {
    super('Trade not found');
    this.name = 'JournalNotFoundError';
  }
}

export class JournalValidationError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'JournalValidationError';
    this.field = field;
  }
}

function toDecimal(value: string | number, field: string): Prisma.Decimal {
  let d: Prisma.Decimal;
  try {
    d = new Prisma.Decimal(value);
  } catch {
    throw new JournalValidationError(`Invalid decimal value for ${field}`, field);
  }
  if (!d.isFinite()) throw new JournalValidationError(`Invalid decimal value for ${field}`, field);
  return d;
}

function toDate(value: string | Date, field: string): Date {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) throw new JournalValidationError(`Invalid date for ${field}`, field);
  return d;
}

/** Parse a list-range bound: date-only `from` = start of day, date-only
 *  `to` = end of day (UTC); full ISO datetimes are taken as-is. */
export function parseRangeBound(value: string, kind: 'from' | 'to'): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T${kind === 'from' ? '00:00:00.000' : '23:59:59.999'}Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
    return d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface JournalTradeInput {
  symbol: string;
  side: string;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  quantity: string | number;
  entryPrice: string | number;
  exitPrice?: string | number | null;
  stopPrice?: string | number | null;
  fees?: string | number;
  currency?: string;
  initialRiskAmount?: string | number | null;
  notes?: string | null;
  tags?: string[];
}

interface NormalizedTrade {
  symbol: string;
  side: JournalSide;
  openedAt: Date;
  closedAt: Date | null;
  quantity: Prisma.Decimal;
  entryPrice: Prisma.Decimal;
  exitPrice: Prisma.Decimal | null;
  stopPrice: Prisma.Decimal | null;
  fees: Prisma.Decimal;
  currency: string;
  initialRiskAmount: Prisma.Decimal | null;
  notes: string | null;
  tags: string[];
}

function positive(value: Prisma.Decimal, field: string): void {
  if (value.lte(0)) throw new JournalValidationError(`${field} must be greater than 0`, field);
}

export function normalizeTradeInput(input: JournalTradeInput): NormalizedTrade {
  const symbol = canonicalInstrument(input.symbol ?? '');
  if (!symbol) throw new JournalValidationError('Unknown symbol', 'symbol');
  if (!(JOURNAL_SIDES as readonly string[]).includes(input.side)) {
    throw new JournalValidationError('Side must be LONG or SHORT', 'side');
  }
  const openedAt = toDate(input.openedAt, 'openedAt');
  const closedAt =
    input.closedAt === undefined || input.closedAt === null ? null : toDate(input.closedAt, 'closedAt');
  const exitPrice =
    input.exitPrice === undefined || input.exitPrice === null
      ? null
      : toDecimal(input.exitPrice, 'exitPrice');
  // A trade is closed only with BOTH an exit price and a close time.
  if ((exitPrice === null) !== (closedAt === null)) {
    throw new JournalValidationError(
      'exitPrice and closedAt must be provided together to close a trade',
      exitPrice === null ? 'exitPrice' : 'closedAt',
    );
  }
  if (closedAt && closedAt.getTime() < openedAt.getTime()) {
    throw new JournalValidationError('closedAt must not be before openedAt', 'closedAt');
  }
  const quantity = toDecimal(input.quantity, 'quantity');
  positive(quantity, 'quantity');
  const entryPrice = toDecimal(input.entryPrice, 'entryPrice');
  positive(entryPrice, 'entryPrice');
  if (exitPrice) positive(exitPrice, 'exitPrice');
  const stopPrice =
    input.stopPrice === undefined || input.stopPrice === null
      ? null
      : toDecimal(input.stopPrice, 'stopPrice');
  if (stopPrice) positive(stopPrice, 'stopPrice');
  const fees = input.fees === undefined ? new Prisma.Decimal(0) : toDecimal(input.fees, 'fees');
  if (fees.lt(0)) throw new JournalValidationError('fees must be at least 0', 'fees');
  const initialRiskAmount =
    input.initialRiskAmount === undefined || input.initialRiskAmount === null
      ? null
      : toDecimal(input.initialRiskAmount, 'initialRiskAmount');
  if (initialRiskAmount && initialRiskAmount.lt(0)) {
    throw new JournalValidationError('initialRiskAmount must be at least 0', 'initialRiskAmount');
  }
  const currency = (input.currency ?? 'USD').trim().toUpperCase();
  if (!/^[A-Z]{3,4}$/.test(currency)) {
    throw new JournalValidationError('currency must be a 3-4 letter code', 'currency');
  }
  const tags = [...new Set((input.tags ?? []).map((t) => t.trim()).filter(Boolean))];
  return {
    symbol,
    side: input.side as JournalSide,
    openedAt,
    closedAt,
    quantity,
    entryPrice,
    exitPrice,
    stopPrice,
    fees,
    currency,
    initialRiskAmount,
    notes: input.notes ?? null,
    tags,
  };
}

export function isClosed(row: Pick<JournalTradeRow, 'closedAt' | 'exitPrice'>): boolean {
  return row.closedAt !== null && row.exitPrice !== null;
}

/** Decimal P&L for a closed trade; null for open trades. */
export function computePnl(row: JournalTradeRow): Prisma.Decimal | null {
  if (!isClosed(row)) return null;
  const dir = row.side === 'LONG' ? 1 : -1;
  return row
    .exitPrice!.minus(row.entryPrice)
    .times(row.quantity)
    .times(dir)
    .minus(row.fees);
}

/** R multiple: only when P&L is defined and initialRiskAmount > 0. */
export function computeRMultiple(row: JournalTradeRow): Prisma.Decimal | null {
  const pnl = computePnl(row);
  if (pnl === null) return null;
  if (!row.initialRiskAmount || row.initialRiskAmount.lte(0)) return null;
  return pnl.div(row.initialRiskAmount);
}

export function mapTrade(row: JournalTradeRow): JournalTradeView {
  const pnl = computePnl(row);
  const r = computeRMultiple(row);
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    openedAt: row.openedAt,
    closedAt: row.closedAt ?? null,
    isClosed: isClosed(row),
    quantity: row.quantity.toString(),
    entryPrice: row.entryPrice.toString(),
    exitPrice: row.exitPrice ? row.exitPrice.toString() : null,
    stopPrice: row.stopPrice ? row.stopPrice.toString() : null,
    fees: row.fees.toString(),
    currency: row.currency,
    initialRiskAmount: row.initialRiskAmount ? row.initialRiskAmount.toString() : null,
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    pnl: pnl ? pnl.toString() : null,
    rMultiple: r ? r.toString() : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Summary over an arbitrary (already owner+range filtered) row set. */
export function summarizeTrades(rows: JournalTradeRow[]): JournalSummary {
  let closedCount = 0;
  let openCount = 0;
  const byCurrency = new Map<string, { pnl: Prisma.Decimal; rSum: Prisma.Decimal; rCount: number }>();
  for (const row of rows) {
    if (!isClosed(row)) {
      openCount += 1;
      continue;
    }
    closedCount += 1;
    const bucket = byCurrency.get(row.currency) ?? {
      pnl: new Prisma.Decimal(0),
      rSum: new Prisma.Decimal(0),
      rCount: 0,
    };
    bucket.pnl = bucket.pnl.plus(computePnl(row)!);
    const r = computeRMultiple(row);
    if (r !== null) {
      bucket.rSum = bucket.rSum.plus(r);
      bucket.rCount += 1;
    }
    byCurrency.set(row.currency, bucket);
  }
  return {
    closedCount,
    openCount,
    byCurrency: [...byCurrency.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, b]) => ({
        currency,
        totalPnl: b.pnl.toString(),
        rSum: b.rSum.toString(),
        rCount: b.rCount,
      })),
  };
}

function rangeWhere(userId: string, range?: { from?: Date | null; to?: Date | null }) {
  const openedAt: Record<string, Date> = {};
  if (range?.from) openedAt.gte = range.from;
  if (range?.to) openedAt.lte = range.to;
  return Object.keys(openedAt).length > 0 ? { userId, openedAt } : { userId };
}

export async function listJournalTrades(
  userId: string,
  opts: { skip: number; take: number; from?: Date | null; to?: Date | null },
  db: JournalDb = defaultDb(),
): Promise<{ trades: JournalTradeView[]; total: number; summary: JournalSummary }> {
  const where = rangeWhere(userId, opts);
  const [rows, total, allRows] = await Promise.all([
    db.journalTrade.findMany({
      where,
      orderBy: [{ openedAt: 'desc' }, { id: 'desc' }],
      skip: opts.skip,
      take: opts.take,
    }),
    db.journalTrade.count({ where }),
    // Summary covers the whole filtered set, not just the current page.
    db.journalTrade.findMany({ where, orderBy: [{ openedAt: 'desc' }, { id: 'desc' }] }),
  ]);
  return { trades: rows.map(mapTrade), total, summary: summarizeTrades(allRows) };
}

export async function getJournalTrade(
  userId: string,
  id: string,
  db: JournalDb = defaultDb(),
): Promise<JournalTradeView | null> {
  const row = await db.journalTrade.findFirst({ where: { id, userId } });
  return row ? mapTrade(row) : null;
}

export async function createJournalTrade(
  userId: string,
  input: JournalTradeInput,
  db: JournalDb = defaultDb(),
): Promise<JournalTradeView> {
  const data = normalizeTradeInput(input);
  const row = await db.journalTrade.create({ data: { userId, ...data } });
  return mapTrade(row);
}

export type JournalTradePatch = Partial<JournalTradeInput>;

export async function updateJournalTrade(
  userId: string,
  id: string,
  patch: JournalTradePatch,
  db: JournalDb = defaultDb(),
): Promise<JournalTradeView> {
  const row = await db.journalTrade.findFirst({ where: { id, userId } });
  if (!row) throw new JournalNotFoundError();
  // Validate the MERGED state, so e.g. closing a trade (closedAt + exitPrice)
  // or moving openedAt past an existing closedAt is checked as a whole.
  const merged: JournalTradeInput = {
    symbol: patch.symbol ?? row.symbol,
    side: patch.side ?? row.side,
    openedAt: patch.openedAt ?? row.openedAt,
    closedAt: patch.closedAt !== undefined ? patch.closedAt : row.closedAt,
    quantity: patch.quantity ?? row.quantity.toString(),
    entryPrice: patch.entryPrice ?? row.entryPrice.toString(),
    exitPrice: patch.exitPrice !== undefined ? patch.exitPrice : row.exitPrice?.toString() ?? null,
    stopPrice: patch.stopPrice !== undefined ? patch.stopPrice : row.stopPrice?.toString() ?? null,
    fees: patch.fees ?? row.fees.toString(),
    currency: patch.currency ?? row.currency,
    initialRiskAmount:
      patch.initialRiskAmount !== undefined
        ? patch.initialRiskAmount
        : row.initialRiskAmount?.toString() ?? null,
    notes: patch.notes !== undefined ? patch.notes : row.notes,
    tags: patch.tags ?? row.tags,
  };
  const data = normalizeTradeInput(merged);
  const updated = await db.journalTrade.update({ where: { id: row.id, userId }, data });
  return mapTrade(updated);
}

export async function deleteJournalTrade(
  userId: string,
  id: string,
  db: JournalDb = defaultDb(),
): Promise<void> {
  const row = await db.journalTrade.findFirst({ where: { id, userId } });
  if (!row) throw new JournalNotFoundError();
  await db.journalTrade.delete({ where: { id: row.id, userId } });
}
