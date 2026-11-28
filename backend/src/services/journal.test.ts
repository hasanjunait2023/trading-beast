import { describe, it, expect, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import {
  listJournalTrades,
  getJournalTrade,
  createJournalTrade,
  updateJournalTrade,
  deleteJournalTrade,
  computePnl,
  computeRMultiple,
  summarizeTrades,
  parseRangeBound,
  JournalNotFoundError,
  JournalValidationError,
  type JournalDb,
  type JournalTradeRow,
} from './journal.js';

const D = (v: string | number) => new Prisma.Decimal(v);

function tradeRow(overrides: Partial<JournalTradeRow> = {}): JournalTradeRow {
  return {
    id: 'trade-1',
    userId: 'user-1',
    symbol: 'EUR/USD',
    side: 'LONG',
    openedAt: new Date('2026-11-20T09:00:00.000Z'),
    closedAt: new Date('2026-11-20T15:00:00.000Z'),
    quantity: D('2'),
    entryPrice: D('1.1000'),
    exitPrice: D('1.1100'),
    stopPrice: D('1.0950'),
    fees: D('1'),
    currency: 'USD',
    initialRiskAmount: D('100'),
    notes: null,
    tags: [],
    createdAt: new Date('2026-11-20T15:05:00.000Z'),
    updatedAt: new Date('2026-11-20T15:05:00.000Z'),
    ...overrides,
  };
}

/** In-memory fake honouring the WHERE / order / paging semantics the
 *  service sends (owner scoping, openedAt range, openedAt desc). */
function fakeDb(seed: JournalTradeRow[] = []) {
  const trades = [...seed];
  const matches = (t: JournalTradeRow, w: any): boolean => {
    if (w.id !== undefined && t.id !== w.id) return false;
    if (w.userId !== undefined && t.userId !== w.userId) return false;
    if (w.openedAt?.gte && t.openedAt.getTime() < w.openedAt.gte.getTime()) return false;
    if (w.openedAt?.lte && t.openedAt.getTime() > w.openedAt.lte.getTime()) return false;
    return true;
  };
  const journalTrade = {
    findFirst: vi.fn(async (args: any) => trades.find((t) => matches(t, args.where)) ?? null),
    findMany: vi.fn(async (args: any) => {
      let rows = trades.filter((t) => matches(t, args.where));
      rows = [...rows].sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime() || b.id.localeCompare(a.id));
      if (args.skip !== undefined) rows = rows.slice(args.skip);
      if (args.take !== undefined) rows = rows.slice(0, args.take);
      return rows;
    }),
    count: vi.fn(async (args: any) => trades.filter((t) => matches(t, args.where)).length),
    create: vi.fn(async (args: any) => {
      const row = tradeRow({
        id: `trade-${trades.length + 1}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      trades.push(row);
      return row;
    }),
    update: vi.fn(async (args: any) => {
      const idx = trades.findIndex((t) => matches(t, args.where));
      if (idx === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
      trades[idx] = { ...trades[idx], ...args.data, updatedAt: new Date() };
      return trades[idx];
    }),
    delete: vi.fn(async (args: any) => {
      const idx = trades.findIndex((t) => matches(t, args.where));
      if (idx === -1) throw Object.assign(new Error('not found'), { code: 'P2025' });
      const [row] = trades.splice(idx, 1);
      return row;
    }),
  };
  return { db: { journalTrade } as unknown as JournalDb, trades };
}

const baseInput = {
  symbol: 'EUR/USD',
  side: 'LONG',
  openedAt: '2026-11-20T09:00:00.000Z',
  quantity: '2',
  entryPrice: '1.1000',
};

describe('computePnl / computeRMultiple', () => {
  it('LONG profit: (exit-entry)*qty - fees; R = pnl / initialRisk', () => {
    const row = tradeRow(); // (1.11-1.10)*2 - 1 = -0.98 in raw units
    expect(computePnl(row)?.toString()).toBe('-0.98');
    expect(computeRMultiple(row)?.toString()).toBe('-0.0098');
  });

  it('SHORT profit has the opposite sign', () => {
    const row = tradeRow({ side: 'SHORT', exitPrice: D('1.0900'), fees: D('0') });
    expect(computePnl(row)?.toString()).toBe('0.02');
  });

  it('SHORT loss and LONG loss flip accordingly', () => {
    const short = tradeRow({ side: 'SHORT', fees: D('0') }); // exit above entry
    expect(computePnl(short)?.toString()).toBe('-0.02');
    const longWin = tradeRow({ fees: D('0') });
    expect(computePnl(longWin)?.toString()).toBe('0.02');
  });

  it('fees are subtracted', () => {
    const noFees = tradeRow({ fees: D('0') });
    const withFees = tradeRow({ fees: D('0.005') });
    expect(computePnl(withFees)!.minus(computePnl(noFees)!).toString()).toBe('-0.005');
  });

  it('open trades have no P&L and no R', () => {
    const open = tradeRow({ closedAt: null, exitPrice: null });
    expect(computePnl(open)).toBeNull();
    expect(computeRMultiple(open)).toBeNull();
  });

  it('R is null without initialRiskAmount, and null when it is 0', () => {
    expect(computeRMultiple(tradeRow({ initialRiskAmount: null }))).toBeNull();
    expect(computeRMultiple(tradeRow({ initialRiskAmount: D('0') }))).toBeNull();
    expect(computePnl(tradeRow({ initialRiskAmount: null }))?.toString()).toBe('-0.98');
  });

  it('R math with a defined risk amount', () => {
    const row = tradeRow({ fees: D('0'), initialRiskAmount: D('0.01') }); // pnl 0.02
    expect(computeRMultiple(row)?.toString()).toBe('2');
  });

  it('preserves decimal precision beyond float53', () => {
    const row = tradeRow({
      quantity: D('123456789.12345678'),
      entryPrice: D('1'),
      exitPrice: D('2'),
      fees: D('0'),
      side: 'LONG',
    });
    expect(computePnl(row)?.toString()).toBe('123456789.12345678');
  });
});

describe('summarizeTrades', () => {
  it('groups by currency and never sums across currencies', () => {
    const rows = [
      tradeRow({ id: 'a', currency: 'USD', fees: D('0') }), // pnl +0.02, R defined
      tradeRow({ id: 'b', currency: 'USD', side: 'SHORT', fees: D('0') }), // pnl -0.02
      tradeRow({ id: 'c', currency: 'EUR', fees: D('0'), initialRiskAmount: null }), // pnl +0.02, no R
      tradeRow({ id: 'd', currency: 'EUR', closedAt: null, exitPrice: null }), // open
    ];
    const s = summarizeTrades(rows);
    expect(s.closedCount).toBe(3);
    expect(s.openCount).toBe(1);
    expect(s.byCurrency).toEqual([
      { currency: 'EUR', totalPnl: '0.02', rSum: '0', rCount: 0 },
      { currency: 'USD', totalPnl: '0', rSum: '0', rCount: 2 },
    ]);
  });

  it('rSum only includes trades with a defined R', () => {
    const rows = [
      tradeRow({ id: 'a', fees: D('0'), initialRiskAmount: D('0.01') }), // R = 2
      tradeRow({ id: 'b', fees: D('0'), initialRiskAmount: null }), // R undefined
    ];
    const s = summarizeTrades(rows);
    expect(s.byCurrency[0]).toMatchObject({ rSum: '2', rCount: 1 });
  });
});

describe('CRUD + owner scoping', () => {
  it('creates a trade, canonicalizing the symbol case-insensitively', async () => {
    const { db } = fakeDb();
    const view = await createJournalTrade('user-1', { ...baseInput, symbol: 'eur/usd' }, db);
    expect(view.symbol).toBe('EUR/USD');
    expect(view.isClosed).toBe(false);
    expect(view.pnl).toBeNull();
    expect(view.quantity).toBe('2');
  });

  it('get returns own trade; foreign id reads as null (404 at the route)', async () => {
    const { db } = fakeDb([tradeRow()]);
    await expect(getJournalTrade('user-1', 'trade-1', db)).resolves.toMatchObject({ id: 'trade-1' });
    await expect(getJournalTrade('user-2', 'trade-1', db)).resolves.toBeNull();
  });

  it('list is owner-scoped, openedAt-desc, paginated, with total + full-set summary', async () => {
    const mine1 = tradeRow({ id: 't1', openedAt: new Date('2026-11-19T09:00:00Z') });
    const mine2 = tradeRow({ id: 't2', openedAt: new Date('2026-11-21T09:00:00Z') });
    const foreign = tradeRow({ id: 't3', userId: 'user-2', openedAt: new Date('2026-11-22T09:00:00Z') });
    const { db } = fakeDb([mine1, mine2, foreign]);
    const page1 = await listJournalTrades('user-1', { skip: 0, take: 1 }, db);
    expect(page1.trades.map((t) => t.id)).toEqual(['t2']);
    expect(page1.total).toBe(2);
    expect(page1.summary.closedCount).toBe(2); // summary spans all pages
    const ranged = await listJournalTrades(
      'user-1',
      { skip: 0, take: 10, from: parseRangeBound('2026-11-20', 'from'), to: parseRangeBound('2026-11-20', 'to') },
      db,
    );
    expect(ranged.total).toBe(0);
    const ranged2 = await listJournalTrades(
      'user-1',
      { skip: 0, take: 10, from: parseRangeBound('2026-11-21', 'from'), to: parseRangeBound('2026-11-21', 'to') },
      db,
    );
    expect(ranged2.trades.map((t) => t.id)).toEqual(['t2']);
  });

  it('update patches own trade; closing sets closedAt + exitPrice and yields P&L', async () => {
    const open = tradeRow({ closedAt: null, exitPrice: null, fees: D('0') });
    const { db } = fakeDb([open]);
    const closed = await updateJournalTrade(
      'user-1',
      'trade-1',
      { closedAt: '2026-11-20T15:00:00.000Z', exitPrice: '1.1100' },
      db,
    );
    expect(closed.isClosed).toBe(true);
    expect(closed.pnl).toBe('0.02');
  });

  it('update/delete of a foreign trade → JournalNotFoundError', async () => {
    const { db } = fakeDb([tradeRow({ userId: 'user-2' })]);
    await expect(updateJournalTrade('user-1', 'trade-1', { notes: 'x' }, db)).rejects.toBeInstanceOf(
      JournalNotFoundError,
    );
    await expect(deleteJournalTrade('user-1', 'trade-1', db)).rejects.toBeInstanceOf(
      JournalNotFoundError,
    );
  });

  it('delete removes own trade', async () => {
    const { db, trades } = fakeDb([tradeRow()]);
    await deleteJournalTrade('user-1', 'trade-1', db);
    expect(trades).toHaveLength(0);
  });
});

describe('validation', () => {
  it('rejects unknown symbols, bad sides, non-positive prices/quantity, negative fees', async () => {
    const { db } = fakeDb();
    await expect(createJournalTrade('user-1', { ...baseInput, symbol: 'NOPE/USD' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, side: 'UP' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, quantity: '0' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, entryPrice: '-1' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, fees: '-0.5' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, openedAt: 'not-a-date' }, db)).rejects.toBeInstanceOf(JournalValidationError);
    await expect(createJournalTrade('user-1', { ...baseInput, quantity: 'abc' }, db)).rejects.toBeInstanceOf(JournalValidationError);
  });

  it('rejects exit without closedAt (and vice versa) and closedAt before openedAt', async () => {
    const { db } = fakeDb();
    await expect(
      createJournalTrade('user-1', { ...baseInput, exitPrice: '1.11' }, db),
    ).rejects.toBeInstanceOf(JournalValidationError);
    await expect(
      createJournalTrade('user-1', { ...baseInput, closedAt: '2026-11-20T15:00:00.000Z' }, db),
    ).rejects.toBeInstanceOf(JournalValidationError);
    await expect(
      createJournalTrade('user-1', {
        ...baseInput,
        exitPrice: '1.11',
        closedAt: '2026-11-20T08:00:00.000Z',
      }, db),
    ).rejects.toBeInstanceOf(JournalValidationError);
  });

  it('update validates the merged state: moving openedAt past closedAt fails', async () => {
    const { db } = fakeDb([tradeRow()]);
    await expect(
      updateJournalTrade('user-1', 'trade-1', { openedAt: '2026-11-21T09:00:00.000Z' }, db),
    ).rejects.toBeInstanceOf(JournalValidationError);
  });
});

describe('parseRangeBound', () => {
  it('date-only from = start of day, to = end of day; junk → null', () => {
    expect(parseRangeBound('2026-11-20', 'from')?.toISOString()).toBe('2026-11-20T00:00:00.000Z');
    expect(parseRangeBound('2026-11-20', 'to')?.toISOString()).toBe('2026-11-20T23:59:59.999Z');
    expect(parseRangeBound('2026-02-31', 'from')).toBeNull();
    expect(parseRangeBound('junk', 'from')).toBeNull();
  });
});
