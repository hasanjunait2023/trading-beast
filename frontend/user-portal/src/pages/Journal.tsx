import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { FlagTile } from '@shared/components/PairFlags';
import { ChevronLeftIcon, ChevronRightIcon } from '@shared/components/icons';
import {
  userApi,
  type JournalTrade,
  type JournalSummary,
} from '../services/api';

/**
 * Trade Journal (reference 11). Owner-scoped journal API: real entries
 * only, with a week navigator over openedAt (custom date range still
 * available). P&L and R arrive as decimal strings computed by the
 * server; R is "unavailable" whenever a trade has no defined initial
 * risk. The hero and stats describe the SELECTED range: closed count
 * and net R come from the server summary (R is unitless, so it may be
 * summed across currencies; P&L never is), win rate is computed from
 * the fetched trades in the range.
 */

const PAGE_SIZE = 20;
const FETCH_LIMIT = 500;

/** Display-only formatting of a decimal string (value stays a string). */
export function fmtDecimal(value: string | null, maxFrac = 8): string {
  if (value === null) return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString('en-US', { maximumFractionDigits: maxFrac });
}

export function fmtR(value: string | null): string {
  if (value === null) return 'R unavailable';
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value}R`;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}R`;
}

/** Signed R for pills/results: "+0.8R", "−0.5R". */
function fmtRSigned(value: string | number | null): string {
  if (value === null) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return `${value}R`;
  const abs = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${abs}R`;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function pnlClass(pnl: string | null): string {
  if (pnl === null) return 'text-[var(--color-text-muted)]';
  const n = Number(pnl);
  if (n > 0) return 'text-[var(--color-accent)]';
  if (n < 0) return 'text-[var(--color-danger)]';
  return '';
}

/* ---- Week helpers (local time, Monday start) ---- */

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

function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function fmtShortDate(d: Date, withYear = false): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' as const } : {}),
  });
}

/** Ascending-bars artwork for the summary hero (decorative, not data). */
function BarsArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 84" className="h-[84px] w-[120px] shrink-0">
      <rect x="6" y="52" width="20" height="26" rx="5" fill="#35d99a" opacity="0.55" />
      <rect x="36" y="40" width="20" height="38" rx="5" fill="#35d99a" opacity="0.75" />
      <rect x="66" y="26" width="20" height="52" rx="5" fill="#35d99a" opacity="0.9" />
      <rect x="96" y="8" width="20" height="70" rx="5" fill="#43e39a" />
    </svg>
  );
}

export default function Journal() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(() => toISODate(startOfWeek(new Date())));
  const [to, setTo] = useState(() => toISODate(addDays(startOfWeek(new Date()), 6)));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getJournal({
        page: 1,
        limit: FETCH_LIMIT,
        from: from || undefined,
        to: to || undefined,
      });
      setTrades(res.trades);
      setTotal(res.total);
      setSummary(res.summary);
      setLoadError('');
    } catch {
      setLoadError('Could not load your journal. Your saved trades are safe — try again.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const isCurrentWeek = from === toISODate(startOfWeek(new Date()));
  const rangeName = !from && !to ? 'All Time' : isCurrentWeek ? 'This Week' : 'Selected Range';
  const rangeLabel =
    from && to
      ? `${fmtShortDate(parseISODate(from))} – ${fmtShortDate(parseISODate(to), true)}`
      : 'All time';

  const shiftWeek = (dir: 1 | -1) => {
    const base = from ? parseISODate(from) : startOfWeek(new Date());
    const start = addDays(startOfWeek(base), dir * 7);
    setPage(1);
    setFrom(toISODate(start));
    setTo(toISODate(addDays(start, 6)));
  };

  const goThisWeek = () => {
    const start = startOfWeek(new Date());
    setPage(1);
    setFrom(toISODate(start));
    setTo(toISODate(addDays(start, 6)));
  };

  // Net R for the range: R is unitless, so the per-currency R sums from
  // the server summary may be added (P&L is never summed across
  // currencies — it stays in the per-currency chips below).
  const rTotals = useMemo(() => {
    if (!summary) return { sum: 0, count: 0 };
    return {
      sum: summary.byCurrency.reduce((acc, c) => acc + (Number(c.rSum) || 0), 0),
      count: summary.byCurrency.reduce((acc, c) => acc + c.rCount, 0),
    };
  }, [summary]);

  const winRate = useMemo(() => {
    const closed = trades.filter((t) => t.isClosed && t.pnl !== null);
    if (closed.length === 0) return null;
    const wins = closed.filter((t) => Number(t.pnl) > 0).length;
    return Math.round((wins / closed.length) * 100);
  }, [trades]);

  const pageCount = Math.max(1, Math.ceil(trades.length / PAGE_SIZE));
  const pageTrades = trades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Trading Journal"
        subtitle="Track, review and improve your discretionary FX trading."
      />

      {/* Summary hero (reference 11) — figures describe the selected range. */}
      {summary && !loading && (
        <section
          aria-label="Journal summary"
          className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)]"
          style={{ background: 'var(--gradient-session-hero)' }}
        >
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-white/85">{rangeName}</p>
              <p className="mt-1 text-[30px] leading-tight font-extrabold tracking-tight">
                {summary.closedCount} Closed Trade{summary.closedCount === 1 ? '' : 's'}
              </p>
              {rTotals.count > 0 ? (
                <span className="tnum mt-3 inline-flex rounded-full bg-[#d9f5e6] px-3.5 py-1.5 text-[16px] font-extrabold text-[#04503a]">
                  {fmtRSigned(rTotals.sum)}
                </span>
              ) : (
                <p className="mt-3 text-[13.5px] text-white/80">
                  R unavailable — R needs an initial risk amount on the trade.
                </p>
              )}
            </div>
            <BarsArt />
          </div>
        </section>
      )}

      {/* Week navigator. */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => shiftWeek(-1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
        >
          <ChevronLeftIcon size={20} />
        </button>
        <div className="tnum flex min-h-[44px] flex-1 items-center justify-center rounded-[13px] bg-[var(--color-mint-panel)] px-3 text-center text-[15.5px] font-bold">
          {rangeLabel}
        </div>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => shiftWeek(1)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>
      {!isCurrentWeek && (from || to) && (
        <p className="-mt-2 text-center">
          <button
            type="button"
            onClick={goThisWeek}
            className="text-sm font-semibold text-[var(--color-link)] underline underline-offset-4"
          >
            Back to this week
          </button>
        </p>
      )}

      {/* Stats strip (reference 11). */}
      {summary && !loading && (
        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-[var(--radius-card-xl)] bg-[var(--color-mint-wash)] px-2 py-4 text-center">
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Trades</p>
            <p className="tnum mt-0.5 text-[22px] font-extrabold">{total}</p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Net Result</p>
            <p className={`tnum mt-0.5 text-[22px] font-extrabold ${rTotals.count > 0 ? (rTotals.sum >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]') : ''}`}>
              {rTotals.count > 0 ? fmtRSigned(rTotals.sum) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[13px] font-medium text-[var(--color-text-muted)]">Win Rate</p>
            <p className="tnum mt-0.5 text-[22px] font-extrabold">
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Per-currency P&L — never summed across currencies. */}
      {summary && !loading && summary.byCurrency.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="P&L by currency">
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">
            P&amp;L by currency:
          </span>
          {summary.byCurrency.map((c) => (
            <span
              key={c.currency}
              className="tnum inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[12px] font-semibold"
            >
              {c.currency} <span className={pnlClass(c.totalPnl)}>{fmtDecimal(c.totalPnl)}</span>
              {' · '}
              {c.rCount > 0 ? `R ${fmtRSigned(c.rSum)}` : 'R —'}
            </span>
          ))}
        </div>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <FormField label="Opened from">
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setPage(1);
                  setFrom(e.target.value);
                }}
              />
            </FormField>
          </div>
          <div className="min-w-[160px] flex-1">
            <FormField label="Opened to">
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setPage(1);
                  setTo(e.target.value);
                }}
              />
            </FormField>
          </div>
          {(from || to) && (
            <Button
              variant="secondary"
              onClick={() => {
                setPage(1);
                setFrom('');
                setTo('');
              }}
            >
              All time
            </Button>
          )}
        </div>
        {total > trades.length && (
          <p className="tnum mt-2 text-[12.5px] text-[var(--color-text-muted)]">
            Showing the latest {trades.length} of {total} trades in this range — stats above
            cover the fetched trades.
          </p>
        )}
      </Card>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading journal">
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : trades.length === 0 ? (
        <Card>
          <EmptyState
            title="No trades in this range"
            message="No trades were opened in the selected range. Adjust the week or range, or add a trade to start tracking P&L and R."
            action={
              <Button onClick={() => navigate('/app/journal/new')}>Add Trade</Button>
            }
          />
        </Card>
      ) : (
        <>
          <h2 className="text-[20px] font-extrabold tracking-tight">
            {rangeName === 'All Time' ? 'Trades' : `${rangeName} Trades`} ({total})
          </h2>
          <div className="space-y-3">
            {pageTrades.map((t) => {
              const isAsset =
                /^(XAU|XAG|WTI|BRENT|BTC)/i.test(t.symbol) || !t.symbol.includes('/');
              const rPill = !t.isClosed ? (
                <span className="inline-flex shrink-0 rounded-full bg-[var(--color-warning-bg)] px-3 py-1.5 text-[13.5px] font-extrabold text-[var(--color-warning)]">
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
              );
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/app/journal/${t.id}/edit`)}
                  className="block w-full rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-card-soft)] transition-colors hover:bg-[var(--color-surface-hover)]"
                  aria-label={`Edit trade ${t.symbol} ${t.side}, opened ${fmtWhen(t.openedAt)}`}
                >
                  <div className="flex items-center gap-3.5">
                    <FlagTile
                      pair={t.symbol}
                      kind={isAsset ? 'asset' : 'fx'}
                      name={t.symbol}
                      size={50}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[18px] font-extrabold tracking-tight">{t.symbol}</p>
                      <p className="truncate text-[13.5px] text-[var(--color-text-muted)]">
                        Manual Trade · Opened {fmtWhen(t.openedAt)}
                        {t.isClosed && t.closedAt ? ` · Closed ${fmtWhen(t.closedAt)}` : ''}
                      </p>
                    </div>
                    {rPill}
                  </div>
                  <div className="tnum mt-3.5 grid grid-cols-4 gap-2 border-t border-[var(--color-border-soft)] pt-3 text-[15px]">
                    <div>
                      <p className="text-[12.5px] font-medium text-[var(--color-text-faint)]">Direction</p>
                      <p className={`mt-0.5 font-bold ${t.side === 'LONG' ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]'}`}>
                        {t.side === 'LONG' ? 'Long' : 'Short'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-[var(--color-text-faint)]">Entry</p>
                      <p className="mt-0.5 font-semibold">{fmtDecimal(t.entryPrice, 5)}</p>
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-[var(--color-text-faint)]">Exit</p>
                      <p className="mt-0.5 font-semibold">{t.exitPrice ? fmtDecimal(t.exitPrice, 5) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[12.5px] font-medium text-[var(--color-text-faint)]">Result</p>
                      <p className={`mt-0.5 font-bold ${t.rMultiple !== null ? (Number(t.rMultiple) >= 0 ? 'text-[var(--color-bullish)]' : 'text-[var(--color-bearish)]') : pnlClass(t.pnl)}`}>
                        {t.rMultiple !== null
                          ? fmtRSigned(t.rMultiple)
                          : t.pnl !== null
                            ? `${fmtDecimal(t.pnl)} ${t.currency}`
                            : '—'}
                      </p>
                    </div>
                  </div>
                  {(t.tags.length > 0 || t.quantity) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="tnum text-[12px] text-[var(--color-text-faint)]">
                        Qty {fmtDecimal(t.quantity)}
                      </span>
                      {t.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="tnum text-sm text-[var(--color-text-muted)]">
                Page {page} of {pageCount} · {trades.length} trades
              </span>
              <Button
                variant="secondary"
                disabled={page >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/app/journal/new')}
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full text-[17px] font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
            style={{ background: 'var(--gradient-primary-action)' }}
          >
            <span aria-hidden="true" className="text-[22px] leading-none">+</span> Add Trade
          </button>
        </>
      )}
    </div>
  );
}
