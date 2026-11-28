import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type Metrics, type Operations } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { ErrorState } from '@shared/components/ErrorState';
import { KpiCard, PageLoading } from '../components/ui';
import { BarList } from '../lib/Charts';
import { errorMessage, formatMoney } from '../lib/format';

/**
 * Dashboard — KPIs from GET /admin/metrics + GET /admin/operations only.
 * Revenue: the API returns total=null when approved revenue spans multiple
 * currencies; in that case per-currency figures are shown, never a sum.
 */
export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [ops, setOps] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, o] = await Promise.all([adminApi.getMetrics(), adminApi.getOperations()]);
      if (m.data.success) setMetrics(m.data.data);
      if (o.data.success) setOps(o.data.data);
      setError('');
      setUpdatedAt(new Date());
    } catch (e) {
      setError(errorMessage(e, 'Could not load dashboard data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !metrics) return <PageLoading />;
  if (error && !metrics) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle={`Platform overview from the admin API${updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ''}`}
        actions={<Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>}
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {metrics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard label="Total users" value={metrics.users.total.toLocaleString()} hint={`+${metrics.users.new30d} in the last 30 days`} />
            <KpiCard label="New users (7d)" value={metrics.users.new7d.toLocaleString()} hint={`New in 30d: ${metrics.users.new30d}`} />
            <KpiCard label="Activation rate" value={`${metrics.activation.rate}%`} hint="Share of users active in the last 7 days" />
            <KpiCard label="Pending payments" value={metrics.revenue.pendingPayments.toLocaleString()} hint="Awaiting verification" />
            <KpiCard label="Approved payments (30d)" value={metrics.revenue.approved30d.toLocaleString()} hint="Count of payments approved in 30 days" />
            <KpiCard label="Trial → paid conversions" value={metrics.trialConversion.converted.toLocaleString()} hint="Users on a paid tier after a trial" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold text-[var(--color-text)]">Revenue by currency (approved, all time)</h2>
              {metrics.revenue.byCurrency.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No approved payments yet.</p>
              ) : (
                <>
                  <BarList
                    data={metrics.revenue.byCurrency.map((c) => ({ label: c.currency, value: c.amount }))}
                    format={(v) => formatMoney(v)}
                  />
                  <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
                    {metrics.revenue.byCurrency.map((c) => (
                      <li key={c.currency} className="flex justify-between">
                        <span>{c.currency}</span>
                        <span className="tnum font-medium text-[var(--color-text)]">{formatMoney(c.amount, c.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  {metrics.revenue.total !== null && (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      Single-currency total: {formatMoney(metrics.revenue.total, metrics.revenue.currency)}
                    </p>
                  )}
                </>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 font-semibold text-[var(--color-text)]">Tier distribution</h2>
              <BarList
                data={[
                  { label: 'Free', value: metrics.tiers.free },
                  { label: 'Pro', value: metrics.tiers.pro },
                  { label: 'Elite', value: metrics.tiers.elite },
                ]}
              />
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Currently trialing (overlaps tiers above): <span className="tnum font-semibold text-[var(--color-text)]">{metrics.tiers.trial}</span>
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Referrals: <span className="tnum font-semibold text-[var(--color-text)]">{metrics.referrals.total}</span> total ·{' '}
                <span className="tnum font-semibold text-[var(--color-text)]">{metrics.referrals.active}</span> credited
              </p>
            </Card>
          </div>
        </>
      )}

      {ops && (
        <Card>
          <h2 className="mb-3 font-semibold text-[var(--color-text)]">Operations health</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Telegram deliveries pending</p>
              <p className="tnum mt-1 text-xl font-bold">{ops.telegram.pending}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Telegram deliveries failed</p>
              <p className="tnum mt-1 text-xl font-bold">{ops.telegram.failed}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Expired radar runs</p>
              <p className="tnum mt-1 text-xl font-bold">{ops.expiredRuns}</p>
              <p className="text-xs text-[var(--color-text-muted)]">Runs still marked RUNNING past expiry</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/payments"><Button variant="secondary" size="sm">Review pending payments</Button></Link>
            <Link to="/telegram"><Button variant="secondary" size="sm">Telegram diagnostics</Button></Link>
            <Link to="/credits"><Button variant="secondary" size="sm">Credit reconciliation</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
