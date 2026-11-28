import { useCallback, useEffect, useState } from 'react';
import { adminApi, type CreditReconciliation, type Operations } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { UnavailableState } from '@shared/components/UnavailableState';
import { KpiCard, PageLoading, StatusBadge } from '../components/ui';
import { errorMessage } from '../lib/format';

/**
 * Credits — read-only reconciliation view.
 * Data: GET /admin/credits/reconciliation (reconcileCredits(): stored
 * balance vs ledger sum per user; only discrepancies are returned) and
 * GET /admin/operations. There is NO admin credit-grant endpoint, so no
 * grant/adjust form exists here — the previous page's derived
 * "daily issuance = users × 10" figure and planned-grant copy are gone.
 */
export default function Credits() {
  const [recon, setRecon] = useState<CreditReconciliation | null>(null);
  const [ops, setOps] = useState<Operations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([adminApi.getCreditReconciliation(), adminApi.getOperations()]);
      if (r.data.success) setRecon(r.data.data);
      if (o.data.success) setOps(o.data.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load credit reconciliation.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading && !recon) return <PageLoading />;
  if (error && !recon) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!recon) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Credits"
        subtitle="Read-only reconciliation of stored balances against the credit ledger."
        actions={<Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>}
      />
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Ledger consistency"
          value={recon.consistent ? 'Consistent' : 'Discrepancies found'}
          hint="Stored balance equals the ledger sum for every checked user"
        />
        <KpiCard label="Discrepant users shown" value={recon.discrepancies.length.toLocaleString()} hint={recon.truncated ? 'List truncated at the API limit — more may exist' : 'Full discrepancy list from the API'} />
        {ops && <KpiCard label="Expired radar runs" value={ops.expiredRuns.toLocaleString()} hint="Runs still RUNNING past expiry (operations API)" />}
      </div>

      <Card padded={false} className="overflow-hidden">
        <h2 className="p-4 pb-2 font-semibold">Balance vs ledger discrepancies</h2>
        {recon.discrepancies.length === 0 ? (
          <EmptyState title="No discrepancies" message="Every stored credit balance matches its ledger sum." />
        ) : (
          <div className="overflow-x-auto">
            <table className="tb-table">
              <thead><tr><th>User ID</th><th>Stored balance</th><th>Ledger sum</th><th>Difference</th></tr></thead>
              <tbody>
                {recon.discrepancies.map((d) => (
                  <tr key={d.userId}>
                    <td className="font-mono text-xs break-all">{d.userId}</td>
                    <td className="tnum">{d.balance ?? '—'}</td>
                    <td className="tnum">{d.ledger}</td>
                    <td className="tnum font-semibold text-[var(--color-danger)]">{d.difference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {ops && (
        <Card>
          <h2 className="mb-3 font-semibold">Related operations</h2>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Telegram deliveries: <StatusBadge status="PENDING" /> <span className="tnum font-semibold">{ops.telegram.pending}</span></span>
            <span>Failed: <span className="tnum font-semibold">{ops.telegram.failed}</span></span>
          </div>
        </Card>
      )}

      <Card>
        <UnavailableState
          title="No credit grant or adjustment tool"
          reason="The admin API has no endpoint to grant or adjust credits, so no form is offered here. Per-user balances are visible to each user in their own portal and Mini App; this page only reports reconciliation results."
        />
      </Card>
    </div>
  );
}
