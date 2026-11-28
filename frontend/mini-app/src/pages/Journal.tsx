import { useCallback, useEffect, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Skeleton } from '@shared/components/Skeleton';
import { journalApi, type JournalSummaryEntry, type JournalTradeData } from '../services/api';
import type { Tab } from '../App';

/**
 * Journal tab (reference tab bar; study 11 layout lands with R3). Lists the
 * user's real journal trades from GET /user/journal with the server
 * summary (per-currency P&L and R). Read-only here — the trade editor is a
 * separate screen. No trades → honest empty state.
 */
export default function Journal({ goToTab }: { goToTab: (tab: Tab) => void }) {
  const [trades, setTrades] = useState<JournalTradeData[]>([]);
  const [summary, setSummary] = useState<JournalSummaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await journalApi.list(1, 20);
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

  return (
    <div className="space-y-4 px-4">
      <Brand size={32} />
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your recorded trades and results — from your journal, never sample data.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading journal">
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
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
          {summary.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Journal summary">
              {summary.map((s) => (
                <span key={s.currency} className="tnum rounded-full bg-[var(--color-mint-wash)] px-3 py-1.5 text-[13px] font-semibold text-[var(--color-text)]">
                  {s.currency} P&L {s.totalPnl}
                  {s.rCount > 0 ? ` · R ${s.rSum} (${s.rCount})` : ''}
                </span>
              ))}
            </div>
          )}
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {total} trade{total === 1 ? '' : 's'} recorded · showing {trades.length}
          </p>
          <div className="space-y-2.5">
            {trades.map((t) => (
              <Card key={t.id} className="flex items-center gap-3 !p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold">
                    {t.symbol}{' '}
                    <span className={t.side === 'SELL' ? 'text-[var(--color-bearish)]' : 'text-[var(--color-bullish)]'}>
                      {t.side}
                    </span>
                  </p>
                  <p className="tnum mt-0.5 text-[13px] text-[var(--color-text-muted)]">
                    {new Date(t.openedAt).toLocaleDateString()} · {t.isClosed ? 'Closed' : 'Open'} · Entry {t.entryPrice}
                    {t.exitPrice ? ` · Exit ${t.exitPrice}` : ''}
                  </p>
                </div>
                <div className="tnum shrink-0 text-right">
                  {t.pnl !== null ? (
                    <>
                      <p className={`text-[16px] font-extrabold ${Number(t.pnl) < 0 ? 'text-[var(--color-bearish)]' : 'text-[var(--color-bullish)]'}`}>
                        {t.pnl} <span className="text-[11px] font-semibold">{t.currency}</span>
                      </p>
                      {t.rMultiple !== null && (
                        <p className="text-[12px] text-[var(--color-text-muted)]">{t.rMultiple} R</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[13px] text-[var(--color-text-muted)]">Open</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
