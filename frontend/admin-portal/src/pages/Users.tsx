import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, type AdminUser, type AdminUserDetail } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { FormField, Input, Select } from '@shared/components/FormField';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { Skeleton } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { TierPill, StatusBadge, PageLoading } from '../components/ui';
import { downloadCsv, errorMessage, formatDate, formatDateTime } from '../lib/format';

const LIMIT = 20;
type Tier = 'FREE' | 'PRO' | 'ELITE';

/**
 * Users — server-side paginated list (GET /admin/users) with tier filter +
 * search, a detail view (GET /admin/users/:id, route /users/:id), tier
 * changes via PATCH /admin/users/:id/tier confirmed in a Modal (the API
 * takes no reason field, so none is collected), and a CSV export of the
 * currently fetched page only.
 */
export default function Users() {
  const { id } = useParams();
  if (id) return <UserDetail id={id} />;
  return <UserList />;
}

function UserList() {
  const navigate = useNavigate();
  const toast = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | Tier>('ALL');

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editTier, setEditTier] = useState<Tier>('PRO');
  const [editExpiry, setEditExpiry] = useState('');
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({
        page, limit: LIMIT,
        tier: tierFilter !== 'ALL' ? tierFilter : undefined,
        search: search || undefined,
      });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
      }
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, [page, tierFilter, search]);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setEditTier(u.tier);
    setEditExpiry(u.activeSubscription?.expiresAt ? new Date(u.activeSubscription.expiresAt).toISOString().slice(0, 10) : '');
    setEditError('');
  };

  const saveTier = async () => {
    if (!editing) return;
    if (editTier !== 'FREE' && !editExpiry) {
      setEditError('A paid tier requires a future expiry date.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      const expiresAt = editTier !== 'FREE' && editExpiry ? new Date(`${editExpiry}T23:59:59`).toISOString() : undefined;
      await adminApi.updateUserTier(editing.id, editTier, expiresAt);
      toast.success(`Tier updated to ${editTier}.`);
      setEditing(null);
      void load();
    } catch (e) {
      setEditError(errorMessage(e, 'Could not update the tier.'));
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(`users-page-${page}.csv`, users.map((u) => ({
      id: u.id, telegramId: u.telegramId, username: u.username ?? '', firstName: u.firstName ?? '',
      tier: u.tier, subscriptionStatus: u.activeSubscription?.status ?? '', subscriptionExpiresAt: u.activeSubscription?.expiresAt ?? '',
      paymentCount: u.paymentCount, referralCount: u.referralCount, createdAt: u.createdAt, lastActiveAt: u.lastActiveAt ?? '',
    })));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} users · server-side pagination`}
        actions={<Button variant="secondary" size="sm" onClick={exportCsv} disabled={users.length === 0}>Export this page (CSV)</Button>}
      />

      <Card>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}
        >
          <div className="flex-1">
            <FormField label="Search">
              <Input placeholder="Telegram ID, username or name" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </FormField>
          </div>
          <div className="sm:w-44">
            <FormField label="Tier">
              <Select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value as 'ALL' | Tier); setPage(1); }}>
                <option value="ALL">All tiers</option>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="ELITE">Elite</option>
              </Select>
            </FormField>
          </div>
          <div className="flex items-end"><Button type="submit" variant="secondary">Search</Button></div>
        </form>
      </Card>

      <Card padded={false} className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading users"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" message="Try a different search or tier filter." />
        ) : (
          <>
            <div className="overflow-x-auto" role="region" aria-label="Users table — scroll horizontally on small screens" tabIndex={0}>
              <table className="tb-table">
                <caption className="sr-only">Users</caption>
                <thead><tr><th>User</th><th>Tier</th><th>Subscription</th><th>Payments</th><th>Referrals</th><th>Joined</th><th>Last active</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <p className="font-medium">{u.firstName || 'Unknown'}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">@{u.username || u.telegramId}</p>
                      </td>
                      <td><TierPill tier={u.tier} /></td>
                      <td className="text-sm">
                        {u.activeSubscription ? (
                          <>{<StatusBadge status={u.activeSubscription.status} />} <span className="text-[var(--color-text-muted)]">until {formatDate(u.activeSubscription.expiresAt)}</span></>
                        ) : <span className="text-[var(--color-text-muted)]">None</span>}
                      </td>
                      <td className="tnum">{u.paymentCount}</td>
                      <td className="tnum">{u.referralCount}</td>
                      <td className="text-sm">{formatDate(u.createdAt)}</td>
                      <td className="text-sm">{u.lastActiveAt ? formatDate(u.lastActiveAt) : 'Never'}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/users/${u.id}`)}>View</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Tier</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <span className="text-sm text-[var(--color-text-muted)]">Page {page} of {totalPages} · CSV export covers this page only</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Change user tier"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={saving} onClick={() => void saveTier()}>Confirm change</Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <p>
              {editing.firstName || 'Unknown'} (@{editing.username || editing.telegramId}) is currently{' '}
              <TierPill tier={editing.tier} />. Changing the tier cancels any active subscription and,
              for a paid tier, creates a new one starting now.
            </p>
            <FormField label="New tier">
              <Select value={editTier} onChange={(e) => setEditTier(e.target.value as Tier)}>
                <option value="FREE">Free</option>
                <option value="PRO">Pro</option>
                <option value="ELITE">Elite</option>
              </Select>
            </FormField>
            {editTier !== 'FREE' && (
              <FormField label="Expiry date" error={editError || undefined} hint="Required for paid tiers — the API rejects a paid tier without a future expiry.">
                <Input type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
              </FormField>
            )}
            {editTier === 'FREE' && editError && <p role="alert" className="text-sm text-[var(--color-danger)]">{editError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function UserDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUser(id);
      if (res.data.success) setUser(res.data.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load this user.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <PageLoading />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!user) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={user.firstName || 'User'}
        subtitle={`@${user.username || user.telegramId} · Telegram ID ${user.telegramId}`}
        actions={<Button variant="secondary" size="sm" onClick={() => navigate('/users')}>Back to users</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><p className="text-sm text-[var(--color-text-muted)]">Stored tier</p><p className="mt-2"><TierPill tier={user.tier} /></p></Card>
        <Card><p className="text-sm text-[var(--color-text-muted)]">Referral code</p><p className="mt-1 font-mono text-sm font-semibold">{user.referralCode}</p></Card>
        <Card><p className="text-sm text-[var(--color-text-muted)]">Joined</p><p className="mt-1 font-semibold">{formatDateTime(user.createdAt)}</p></Card>
        <Card><p className="text-sm text-[var(--color-text-muted)]">Last active</p><p className="mt-1 font-semibold">{user.lastActiveAt ? formatDateTime(user.lastActiveAt) : 'Never'}</p></Card>
      </div>

      <Card padded={false} className="overflow-hidden">
        <h2 className="p-4 pb-2 font-semibold">Subscriptions ({user.subscriptions?.length ?? 0})</h2>
        {(user.subscriptions ?? []).length === 0 ? (
          <EmptyState title="No subscriptions" message="This user has never had a subscription record." />
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="User subscriptions table — scroll horizontally on small screens" tabIndex={0}>
            <table className="tb-table">
              <caption className="sr-only">Subscriptions for the selected user</caption>
            <thead><tr><th>Tier</th><th>Status</th><th>Starts</th><th>Expires</th></tr></thead>
            <tbody>{user.subscriptions!.map((s) => (
              <tr key={s.id}><td><TierPill tier={s.tier} /></td><td><StatusBadge status={s.status} /></td><td>{formatDate(s.startsAt)}</td><td>{formatDate(s.expiresAt)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <Card padded={false} className="overflow-hidden">
        <h2 className="p-4 pb-2 font-semibold">Payments ({user.payments?.length ?? 0})</h2>
        {(user.payments ?? []).length === 0 ? (
          <EmptyState title="No payments" message="This user has not submitted a payment." />
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="User payments table — scroll horizontally on small screens" tabIndex={0}>
            <table className="tb-table">
              <caption className="sr-only">Payments for the selected user</caption>
            <thead><tr><th>Amount</th><th>Method</th><th>Status</th><th>Submitted</th></tr></thead>
            <tbody>{user.payments!.map((p) => (
              <tr key={p.id}><td className="tnum">{(p.amount / 100).toFixed(2)} {p.currency}</td><td>{p.method}</td><td><StatusBadge status={p.status} /></td><td>{formatDate(p.createdAt)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <Card padded={false} className="overflow-hidden">
        <h2 className="p-4 pb-2 font-semibold">Referrals made ({user.referrals?.length ?? 0})</h2>
        {(user.referrals ?? []).length === 0 ? (
          <EmptyState title="No referrals" message="This user has not referred anyone yet." />
        ) : (
          <div className="overflow-x-auto" role="region" aria-label="User referrals table — scroll horizontally on small screens" tabIndex={0}>
            <table className="tb-table">
              <caption className="sr-only">Referrals for the selected user</caption>
            <thead><tr><th>Referred user</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{user.referrals!.map((r) => (
              <tr key={r.id}><td>{r.referred?.firstName || 'Unknown'} <span className="text-[var(--color-text-muted)]">@{r.referred?.username || r.referred?.telegramId}</span></td><td><StatusBadge status={r.status} /></td><td>{formatDate(r.createdAt)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
