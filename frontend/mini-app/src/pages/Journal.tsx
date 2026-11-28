import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { FlagTile } from '@shared/components/PairFlags';
import { ChevronLeftIcon, ChevronRightIcon } from '@shared/components/icons';
import { journalApi, type JournalSummaryEntry, type JournalTradeData } from '../services/api';
import type { Tab } from '../App';

/**
 * Journal tab (reference 11). Lists the user's real journal trades from
 * GET /user/journal with a week navigator (Monday-start, local time):
 * the gradient hero, stats strip and trade cards all describe the
 * SELECTED week, computed from the fetched trades — never sample data.
 * Read-only here; trades are recorded in the web portal's editor.
 */

function fmtDecimal(value: string | null, maxFrac = 5): string {
  if (value === null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString('en-US', { maximumFractionDigits: maxFrac });
}

function fmtRSigned(value: string | number | null): string {
  if (value === null) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return `${value}R`;
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${abs}R`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtShortDate(d: Date, withYear = false): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}

function fmtDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

/** Ascending-bars artwork for the summary hero (decorative, not data). */
function BarsArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 84" className="h-[76px] w-[108px] shrink-0">
      <rect x="6" y="52" width="20" height="26" rx="5" fill="#35d99a" opacity="0.55" />
      <rect x="36" y="40" width="20" height="38" rx="5" fill="#35d99a" opacity="0.75" />
      <rect x="66" y="26" width="20" height="52" rx="5" fill="#35d99a" opacity="0.9" />
      <rect x="96" y="8" width="20" height="70" rx="5" fill="#43e39a" />
    </svg>
  );
}

function TradeCard({ t }: { t: JournalTradeData }) {
  const isAsset = /^(XAU|XAG|WTI|BRENT|BTC)/i.test(t.symbol) || !t.symbol.includes('/');
  const isShort = t.side.toUpperCase() === 'SHORT' || t.side.toUpperCase() === 'SELL';
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3.5">
        <FlagTile pair={t.symbol} kind={isAsset ? 'asset' : 'fx'} name={t.symbol} size={50} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[18px] font-extrabold tracking-tight">{t.symbol}</p>
          <p className="truncate text-[13.5px] text-[var(--color-text-muted)]">
            Manual Trade · {fmtDay(t.openedAt)}
          </p>
        </div>
        {!t.isClosed ? (
          <span className="inline-flex shrink-0 rounded-full bg-[var(--color-warning-bg)] px-3 py-1.5 text-[13px] font-extrabold text-[var(--color-warning)]">
            OPEN
          </span>
        ) : t.rMultiple !== null ? (
          <span
            className={`tnum inline-flex shrink-0 rounded-full px-3 py-1.5 text-[15px] font-extrabold ${
              Number(t.rMultiple) >= 0
                ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            }`}
          >
            {fmtRSigned(t.rMultiple)}
          </span>
        ) : (
          <span className="inline-flex shrink-0 rounded-full bg-[var(--color-unavailable-bg)] px-3 py-1.5 text-[13px] font-bold text-[var(--color-unavailable-text)]">
            R —
          </span>
        )}
      </div>
      <div className="tnum mt-3.5 grid grid-cols-4 gap-2 border-t border-[var(--color-border-soft)] pt-3 text-[14.5px]">
        <div>
          <p className="text-[12px] font-medium text-[var(--color-text-faint)]">Direction</p>
          <p className={`mt-0.5 font-bold ${isShort ? 'text-[var(--color-bearish)]' : 'text-[var(--color-bullish)]'}`}>
            {isShort ? 'Short' : 'Long'}
          </p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--color-text-faint)]">Entry</p>
          <p className="mt-0.5 font-semibold">{fmtDecimal(t.entryPrice)}</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--color-text-faint)]">Exit</p>
          <p className="mt-0.5 font-semibold">{t.exitPrice ? fmtDecimal(t.exitPrice) : '—'}</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-[var(--color-text-faint)]">Result</p>
          <p
            className={`mt-0.5 font-bold ${
              t.rMultiple !== null
                ? Number(t.rMultiple) >= 0
                  ? 'text-[var(--color-bullish)]'
                  : 'text-[var(--color-bearish)]'
                : t.pnl !== null
                  ? Number(t.pnl) >= 0
                    ? 'text-[var(--color-bullish)]'
                    : 'text-[var(--color-bearish)]'
                  : ''
            }`}
          >
            {t.rMultiple !== null
              ? fmtRSigned(t.rMultiple)
              : t.pnl !== null
                ? `${fmtDecimal(t.pnl, 2)} ${t.currency}`
                : '—'}
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function Journal({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const [trades, setTrades] = useState<JournalTradeData[]>([]);
  const [summary, setSummary] = useState<JournalSummaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await journalApi.list(1, 100);
      setTrades(res.data.data ?? []);
      const meta = res.data.meta as { total?: number; summary?: JournalSummaryEntry[] } | undefined;
      setTotal(meta?.total ?? (res.data.data ?? []).length);
      setSummary(meta?.summary ?? []);
      setError('');
    } catch {
      setError('Could not load your journal. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const weekStart = useMemo(
    () => addDays(startOfWeek(new Date()), weekOffset * 7),
    [weekOffset],
  );
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  const weekTrades = useMemo(
    () =>
      trades.filter((t) => {
        const opened = new Date(t.openedAt).getTime();
        return opened >= weekStart.getTime() && opened < weekEnd.getTime();
      }),
    [trades, weekStart, weekEnd],
  );
  const closedWeek = weekTrades.filter((t) => t.isClosed);
  const openWeek = weekTrades.filter((t) => !t.isClosed);

  const netR = useMemo(() => {
    const withR = closedWeek.filter((t) => t.rMultiple !== null);
    if (withR.length === 0) return null;
    return withR.reduce((acc, t) => acc + (Number(t.rMultiple) || 0), 0);
  }, [closedWeek]);

  const winRate = useMemo(() => {
    const withPnl = closedWeek.filter((t) => t.pnl !== null);
    if (withPnl.length === 0) return null;
    const wins = withPnl.filter((t) => Number(t.pnl) > 0).length;
    return Math.round((wins / withPnl.length) * 100);
  }, [closedWeek]);

  const weekName = weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : 'Selected Week';
  const weekLabel = `${fmtShortDate(weekStart)} – ${fmtShortDate(addDays(weekStart, 6), true)}`;

  return (
    <div className="space-y-4 px-4">
      <Brand size={32} />
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Trading Journal</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Track, review and improve your discretionary FX trading.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading journal">
          <Skeleton height={130} />
          <Skeleton height={72} />
          <Skeleton height={120} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : trades.length === 0 ? (
        <Card>
          <EmptyState
            title="No trades recorded yet"
            message="When you record trades in the journal (web portal), they will appear here with their P&L and R results."
            action={
              <Button variant="secondary" onClick={() => goToTab('markets')}>
                Open Markets
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Summary hero (reference 11) — figures describe the selected week. */}
          <section
            aria-label="Journal summary"
            className="relative overflow-hidden rounded-[var(--radius-hero)] p-4 text-white shadow-[var(--shadow-hero)]"
            style={{ background: 'var(--gradient-session-hero)' }}
          >
            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14.5px] font-medium text-white/85">{weekName}</p>
                <p className="mt-1 text-[27px] leading-tight font-extrabold tracking-tight">
                  {closedWeek.length} Closed Trade{closedWeek.length === 1 ? '' : 's'}
                </p>
                {netR !== null ? (
                  <span className="tnum mt-2.5 inline-flex rounded-full bg-[var(--color-hero-chip-bg)] px-3.5 py-1.5 text-[15px] font-extrabold text-[var(--color-hero-chip-text)]">
                    {fmtRSigned(netR)}
                  </span>
                ) : (
                  <p className="mt-2.5 text-[12.5px] text-white/80">
                    R unavailable for this week&apos;s trades.
                  </p>
                )}
              </div>
              <BarsArt />
            </div>
          </section>

          {/* Week navigator. */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Previous week"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
            >
              <ChevronLeftIcon size={20} />
            </button>
            <div className="tnum flex min-h-[44px] flex-1 items-center justify-center rounded-[13px] bg-[var(--color-mint-panel)] px-2 text-center text-[15px] font-bold">
              {weekLabel}
            </div>
            <button
              type="button"
              aria-label="Next week"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
            >
              <ChevronRightIcon size={20} />
            </button>
          </div>

          {/* Stats strip (reference 11). */}
          <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-[var(--radius-card-xl)] bg-[var(--color-mint-wash)] px-1 py-4 text-center">
            <div>
              <p className="text-[12.5px] font-medium text-[var(--color-text-muted)]">Trades</p>
              <p className="tnum mt-0.5 text-[21px] font-extrabold">{weekTrades.length}</p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[var(--color-text-muted)]">Net Result</p>
              <p className={`tnum mt-0.5 text-[21px] font-extrabold ${netR !== null ? (netR >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]') : ''}`}>
                {netR !== null ? fmtRSigned(netR) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[var(--color-text-muted)]">Win Rate</p>
              <p className="tnum mt-0.5 text-[21px] font-extrabold">
                {winRate !== null ? `${winRate}%` : '—'}
              </p>
            </div>
          </div>

          {summary.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Overall journal summary">
              {summary.map((s) => (
                <span key={s.currency} className="tnum rounded-full bg-[var(--color-mint-wash)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-text)]">
                  {s.currency} P&L {s.totalPnl}
                  {s.rCount > 0 ? ` · R ${s.rSum} (${s.rCount})` : ''}
                </span>
              ))}
            </div>
          )}

          {weekTrades.length === 0 ? (
            <Card>
              <EmptyState
                title={`No trades ${weekOffset === 0 ? 'this week' : 'in this week'}`}
                message={
                  total > trades.length
                    ? `None of your latest ${trades.length} recorded trades were opened in this week.`
                    : 'No trades were opened in this week. Use the arrows to browse other weeks.'
                }
                action={
                  weekOffset !== 0 ? (
                    <Button variant="secondary" onClick={() => setWeekOffset(0)}>
                      Back to this week
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          ) : (
            <>
              <section aria-label="Closed trades" className="space-y-3">
                <h2 className="text-[20px] font-extrabold tracking-tight">
                  Closed Trades ({closedWeek.length})
                </h2>
                {closedWeek.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    No closed trades this week.
                  </p>
                ) : (
                  closedWeek.map((t) => <TradeCard key={t.id} t={t} />)
                )}
              </section>
              {openWeek.length > 0 && (
                <section aria-label="Open trades" className="space-y-3">
                  <h2 className="text-[20px] font-extrabold tracking-tight">
                    Open Trades ({openWeek.length})
                  </h2>
                  {openWeek.map((t) => <TradeCard key={t.id} t={t} />)}
                </section>
              )}
            </>
          )}

          <p className="text-center text-[12px] text-[var(--color-text-muted)]">
            {total} trade{total === 1 ? '' : 's'} recorded · showing latest {trades.length}.
            Trades are added and edited in the web portal.
          </p>
        </>
      )}
    </div>
  );
}
