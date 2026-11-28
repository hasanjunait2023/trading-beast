import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import {
  userApi,
  type JournalTrade,
  type JournalSummary,
} from '../services/api';

/**
 * Trade Journal (study 11). Owner-scoped journal API: real entries only,
 * paginated, with a date-range filter on openedAt. P&L and R arrive as
 * decimal strings computed by the server; R is "unavailable" whenever the
 * trade has no defined initial risk. Summaries are grouped by currency —
 * P&L is never summed across currencies.
 */

const PAGE_SIZE = 20;

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

export default function Journal() {
  const navigate = useNavigate();
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [summary, setSummary] = useState<JournalSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.getJournal({
        page,
        limit: PAGE_SIZE,
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
  }, [page, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Trade Journal"
        subtitle="Your own trades, saved to your account. P&L and R are computed from the prices, quantity, fees and initial risk you record."
        actions={
          <Button onClick={() => navigate('/app/journal/new')}>Add Trade</Button>
        }
      />

      {/* Summary header — per-currency chips, never a cross-currency total. */}
      {summary && !loading && (
        <Card>
          <div className="flex flex-wrap items-center gap-2" aria-label="Journal summary">
            <span className="text-sm font-semibold">
              {summary.closedCount} closed · {summary.openCount} open
            </span>
            {summary.byCurrency.map((c) => (
              <span
                key={c.currency}
                className="tnum inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[12px] font-semibold"
              >
                {c.currency} P&amp;L{' '}
                <span className={pnlClass(c.totalPnl)}>{fmtDecimal(c.totalPnl)}</span>
                {' · '}
                {c.rCount > 0 ? `R total ${fmtDecimal(c.rSum, 2)} (${c.rCount})` : 'R —'}
              </span>
            ))}
            {summary.byCurrency.length === 0 && (
              <span className="text-sm text-[var(--color-text-muted)]">
                No closed trades in this range yet.
              </span>
            )}
          </div>
        </Card>
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
              Clear range
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading journal">
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : trades.length === 0 ? (
        <Card>
          <EmptyState
            title="No trades yet"
            message="No trades yet — your journal entries will appear here. Add your first trade to start tracking P&L and R."
            action={
              <Button onClick={() => navigate('/app/journal/new')}>Add Trade</Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {trades.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/app/journal/${t.id}/edit`)}
                className={`block w-full rounded-[var(--radius-md)] border p-3 text-left transition-colors hover:bg-[var(--color-surface-hover)] sm:p-4 ${
                  t.isClosed
                    ? 'border-[var(--color-border)] bg-[var(--color-surface)]'
                    : 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                }`}
                aria-label={`Edit trade ${t.symbol} ${t.side}, opened ${fmtWhen(t.openedAt)}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{t.symbol}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ${
                      t.side === 'LONG'
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                        : 'bg-[var(--color-danger)] text-white'
                    }`}
                  >
                    {t.side}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ${
                      t.isClosed
                        ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                        : 'bg-[var(--color-warning-bg)] text-[var(--color-text)]'
                    }`}
                  >
                    {t.isClosed ? 'CLOSED' : 'OPEN'}
                  </span>
                  <span className={`tnum ml-auto text-[15px] font-bold ${pnlClass(t.pnl)}`}>
                    {t.pnl === null ? '—' : `${fmtDecimal(t.pnl)} ${t.currency}`}
                  </span>
                </div>
                <div className="tnum mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-[var(--color-text-muted)]">
                  <span>Opened {fmtWhen(t.openedAt)}</span>
                  {t.isClosed && t.closedAt && <span>Closed {fmtWhen(t.closedAt)}</span>}
                  <span>Entry {fmtDecimal(t.entryPrice)}</span>
                  <span>Exit {t.exitPrice ? fmtDecimal(t.exitPrice) : '—'}</span>
                  <span>Qty {fmtDecimal(t.quantity)}</span>
                  <span className={t.rMultiple === null ? '' : 'font-semibold text-[var(--color-text)]'}>
                    {fmtR(t.rMultiple)}
                  </span>
                </div>
                {t.tags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
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
            ))}
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
                Page {page} of {pageCount} · {total} trades
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
        </>
      )}
    </div>
  );
}
