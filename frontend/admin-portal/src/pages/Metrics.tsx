import { useCallback, useEffect, useState } from 'react';
import { adminApi, type Metrics } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { ErrorState } from '@shared/components/ErrorState';
import { KpiCard, PageLoading } from '../components/ui';
import { BarList, Donut } from '../lib/Charts';
import { errorMessage, formatMoney } from '../lib/format';

/**
 * Metrics — every figure comes from GET /admin/metrics.
 * F5 LESSON: a previous version shipped fabricated charts/series. The API
 * returns current aggregates only (no time series), so this page charts
 * only returned scalars: tier distribution, revenue by currency, and the
 * 7d vs 30d new-user counts. No invented history.
 */
export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMetrics();
      if (res.data.success) setMetrics(res.data.data);
      setError('');
      setUpdatedAt(new Date());
    } catch (e) {
      setError(errorMessage(e, 'Could not load metrics.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !metrics) return <PageLoading />;
  if (error && !metrics) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Metrics"
        subtitle={`Live platform totals from the metrics API${updatedAt ? ` · updated ${updatedAt.toLocaleTimeString()}` : ''}. The API returns current aggregates only — no historical series exists, so none is charted.`}
        actions={<Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total users" value={metrics.users.total.toLocaleString()} hint={`+${metrics.users.new30d} new in 30 days`} />
        <KpiCard label="Pro users" value={metrics.tiers.pro.toLocaleString()} hint="Current effective tier count" />
        <KpiCard label="Elite users" value={metrics.tiers.elite.toLocaleString()} hint="Current effective tier count" />
        <KpiCard label="Activation rate" value={`${metrics.activation.rate}%`} hint="Users active in the last 7 days" />
        <KpiCard label="Approved payments (30d)" value={metrics.revenue.approved30d.toLocaleString()} hint="Count, not an amount" />
        <KpiCard label="Pending payments" value={metrics.revenue.pendingPayments.toLocaleString()} hint="Awaiting verification" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Tier distribution</h2>
          <Donut
            data={[
              { label: 'Free', value: metrics.tiers.free },
              { label: 'Pro', value: metrics.tiers.pro },
              { label: 'Elite', value: metrics.tiers.elite },
            ]}
          />
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Trialing users ({metrics.tiers.trial}) also hold one of the tiers above, so trial is not a donut slice.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">New users — returned windows</h2>
          <BarList
            data={[
              { label: 'Last 7 days', value: metrics.users.new7d },
              { label: 'Last 30 days', value: metrics.users.new30d },
            ]}
          />
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Two aggregate counts returned by the API — not a daily series.
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Revenue by currency (approved, all time)</h2>
          {metrics.revenue.byCurrency.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No approved payments yet.</p>
          ) : (
            <BarList
              data={metrics.revenue.byCurrency.map((c) => ({ label: c.currency, value: c.amount }))}
              format={(v) => formatMoney(v)}
            />
          )}
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Currencies are never summed together.
            {metrics.revenue.total !== null && ` Single-currency total: ${formatMoney(metrics.revenue.total, metrics.revenue.currency)}.`}
          </p>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Referrals & trial conversion</h2>
          <BarList
            data={[
              { label: 'Referrals signed up', value: metrics.referrals.total },
              { label: 'Referrals credited', value: metrics.referrals.active },
            ]}
          />
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-muted)]">Trial → paid conversions</dt>
              <dd className="tnum font-semibold">{metrics.trialConversion.converted}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-text-muted)]">Users currently trialing</dt>
              <dd className="tnum font-semibold">{metrics.tiers.trial}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Credited = referrals that earned the reward, per the API.
          </p>
        </Card>
      </div>
    </div>
  );
}
