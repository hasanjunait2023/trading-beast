import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type Metrics, type Payment } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { KpiCard, PageLoading, StatusBadge } from '../components/ui';
import { BarList } from '../lib/Charts';
import { errorMessage, formatDate, formatMoney } from '../lib/format';

/**
 * Finance — revenue from GET /admin/metrics (byCurrency; total is null for
 * multi-currency and is never summed here) + the pending queue from
 * GET /admin/payments/pending (first page, labeled as such).
 * No MRR: the API does not return a recurring-revenue figure.
 */
const PENDING_LIMIT = 20;

export default function Finance() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pending, setPending] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, p] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getPendingPayments({ page: 1, limit: PENDING_LIMIT }),
      ]);
      if (m.data.success) setMetrics(m.data.data);
      if (p.data.success) setPending(p.data.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load finance data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendingByMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pending) map.set(p.method, (map.get(p.method) ?? 0) + 1);
    return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [pending]);

  if (loading && !metrics) return <PageLoading />;
  if (error && !metrics) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Finance"
        subtitle="Verified revenue and the pending-verification queue. No MRR is shown — the API does not return one."
        actions={<Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>}
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Approved payments (30d)" value={metrics.revenue.approved30d.toLocaleString()} hint="Count of payments approved in the last 30 days" />
        <KpiCard label="Pending verification" value={metrics.revenue.pendingPayments.toLocaleString()} hint="Payments awaiting review (all pages)" />
        <KpiCard
          label="Verified revenue"
          value={metrics.revenue.total !== null ? formatMoney(metrics.revenue.total, metrics.revenue.currency) : 'Multi-currency'}
          hint={metrics.revenue.total !== null ? 'Approved payments, all time' : 'See per-currency breakdown — never summed'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Verified revenue by currency</h2>
          {metrics.revenue.byCurrency.length === 0 ? (
            <EmptyState title="No approved revenue yet" message="Revenue appears here once a payment is approved." />
          ) : (
            <>
              <BarList
                data={metrics.revenue.byCurrency.map((c) => ({ label: c.currency, value: c.amount }))}
                format={(v) => formatMoney(v)}
              />
              <ul className="mt-3 space-y-1 text-sm">
                {metrics.revenue.byCurrency.map((c) => (
                  <li key={c.currency} className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">{c.currency}</span>
                    <span className="tnum font-medium">{formatMoney(c.amount, c.currency)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Pending queue by method (this page)</h2>
          {pending.length === 0 ? (
            <EmptyState title="Queue is clear" message="No payments are waiting for verification." />
          ) : (
            <BarList data={pendingByMethod} />
          )}
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Based on the first {PENDING_LIMIT} pending payments fetched. Total pending: {metrics.revenue.pendingPayments}.
          </p>
        </Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="font-semibold">Oldest pending payments</h2>
          <Link to="/payments"><Button variant="secondary" size="sm">Open payments queue</Button></Link>
        </div>
        {pending.length === 0 ? (
          <EmptyState title="Nothing pending" message="The verification queue is empty." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tb-table">
              <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Status</th><th>Submitted</th></tr></thead>
              <tbody>
                {pending.slice(0, 5).map((p) => (
                  <tr key={p.id}>
                    <td>{p.user.firstName || 'Unknown'} <span className="text-[var(--color-text-muted)]">@{p.user.username || p.user.telegramId}</span></td>
                    <td className="tnum">{formatMoney(p.amount, p.currency)}</td>
                    <td>{p.method}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="p-4 pt-2 text-xs text-[var(--color-text-muted)]">The pending endpoint returns the oldest first; this shows the first 5 of the fetched page.</p>
      </Card>
    </div>
  );
}
