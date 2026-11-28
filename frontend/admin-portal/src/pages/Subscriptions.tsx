import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminUser, type Metrics } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Tabs } from '@shared/components/Tabs';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { Skeleton } from '@shared/components/Skeleton';
import { TierPill, StatusBadge, PageLoading } from '../components/ui';
import { BarList } from '../lib/Charts';
import { errorMessage, formatDate } from '../lib/format';

const LIMIT = 20;
type TierFilter = 'ALL' | 'FREE' | 'PRO' | 'ELITE';

/**
 * Subscriptions — there is NO dedicated subscriptions endpoint. This page
 * is built only from GET /admin/metrics (tier distribution) and
 * GET /admin/users with the server-side tier filter + pagination.
 * No subscription ledger is fabricated.
 */
export default function Subscriptions() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getMetrics();
      if (res.data.success) setMetrics(res.data.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load subscription data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers({
        page, limit: LIMIT,
        tier: tierFilter !== 'ALL' ? tierFilter : undefined,
      });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
      }
    } catch (e) {
      setError(errorMessage(e, 'Could not load users for this tier.'));
    } finally {
      setUsersLoading(false);
    }
  }, [page, tierFilter]);

  useEffect(() => { void loadMetrics(); }, [loadMetrics]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  if (loading && !metrics) return <PageLoading />;
  if (error && !metrics) return <ErrorState message={error} onRetry={() => void loadMetrics()} />;
  if (!metrics) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscriptions"
        subtitle="Tier distribution from the metrics API, with the user list filtered server-side by tier. There is no separate subscriptions endpoint."
        actions={<Button variant="secondary" size="sm" loading={loading} onClick={() => { void loadMetrics(); void loadUsers(); }}>Refresh</Button>}
      />

      <Card>
        <h2 className="mb-4 font-semibold">Tier distribution</h2>
        <BarList
          data={[
            { label: 'Free', value: metrics.tiers.free },
            { label: 'Pro', value: metrics.tiers.pro },
            { label: 'Elite', value: metrics.tiers.elite },
          ]}
        />
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Of {metrics.users.total.toLocaleString()} users · currently trialing (overlaps tiers):{' '}
          <span className="tnum font-semibold text-[var(--color-text)]">{metrics.tiers.trial}</span> · trial → paid conversions:{' '}
          <span className="tnum font-semibold text-[var(--color-text)]">{metrics.trialConversion.converted}</span>
        </p>
      </Card>

      <Tabs
        ariaLabel="Filter users by tier"
        activeId={tierFilter}
        onChange={(id) => { setTierFilter(id as TierFilter); setPage(1); }}
        tabs={[
          { id: 'ALL', label: 'All tiers' },
          { id: 'FREE', label: 'Free' },
          { id: 'PRO', label: 'Pro' },
          { id: 'ELITE', label: 'Elite' },
        ]}
      />

      <Card padded={false} className="overflow-hidden">
        {usersLoading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading users"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users in this tier" message="No users currently hold this effective tier." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tb-table">
                <thead><tr><th>User</th><th>Effective tier</th><th>Subscription</th><th>Expires</th><th>Payments</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Link to={`/users/${u.id}`} className="font-medium text-[var(--color-link)] hover:underline">{u.firstName || 'Unknown'}</Link>
                        <p className="text-xs text-[var(--color-text-muted)]">@{u.username || u.telegramId}</p>
                      </td>
                      <td><TierPill tier={u.tier} /></td>
                      <td>{u.activeSubscription ? <StatusBadge status={u.activeSubscription.status} /> : <span className="text-[var(--color-text-muted)]">None</span>}</td>
                      <td className="text-sm">{u.activeSubscription ? formatDate(u.activeSubscription.expiresAt) : '—'}</td>
                      <td className="tnum">{u.paymentCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <span className="text-sm text-[var(--color-text-muted)]">Page {page} of {totalPages} ({total.toLocaleString()} users)</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
