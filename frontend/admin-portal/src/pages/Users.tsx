import { useState, useEffect } from 'react';
import { adminApi, AdminUser } from '../services/api';
import { Search, Filter, MoreVertical, Edit, Trash2, CheckCircle, XCircle, Clock, UserPlus, Download } from 'lucide-react';

const TIER_OPTIONS = ['ALL', 'FREE', 'PRO', 'ELITE'] as const;
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED'] as const;

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE' | 'PRO' | 'ELITE'>('ALL');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editTier, setEditTier] = useState<'FREE' | 'PRO' | 'ELITE'>('PRO');
  const [editExpiresAt, setEditExpiresAt] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, tierFilter, search]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers({ page, limit: 20, tier: tierFilter !== 'ALL' ? tierFilter : undefined, search: search || undefined });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotalPages(res.data.meta.totalPages);
        setTotal(res.data.meta.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditTier(user.tier);
    setEditExpiresAt(user.activeSubscription?.expiresAt ? new Date(user.activeSubscription.expiresAt).toISOString().split('T')[0] : '');
  };

  const handleSaveTier = async () => {
    if (!editingUser) return;
    try {
      await adminApi.updateUserTier(editingUser.id, editTier, editExpiresAt || undefined);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update tier:', error);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'FREE': return <span className="badge badge-free">Free</span>;
      case 'PRO': return <span className="badge badge-pro">Pro</span>;
      case 'ELITE': return <span className="badge badge-elite">Elite</span>;
      default: return <span className="badge">{tier}</span>;
    }
  };

  const getStatusBadge = (user: AdminUser) => {
    if (!user.activeSubscription) return <span className="badge badge-free">No Subscription</span>;
    const { status } = user.activeSubscription;
    switch (status) {
      case 'ACTIVE': return <span className="badge badge-approved">Active</span>;
      case 'TRIAL': return <span className="badge badge-trial">Trial</span>;
      case 'EXPIRED': return <span className="badge badge-rejected">Expired</span>;
      case 'CANCELLED': return <span className="badge badge-rejected">Cancelled</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Users</h1>
          <p className="text-[var(--color-text-muted)]">Manage user accounts and subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary">
            <UserPlus className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <input
            type="text"
            className="input"
            placeholder="Search by Telegram ID, username, name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <select
          className="input w-auto"
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value as any); setPage(1); }}
        >
          {TIER_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'All Tiers' : opt}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <p>No users found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Tier</th>
                    <th>Status</th>
                    <th>Subscription</th>
                    <th>Referrals</th>
                    <th>Payments</th>
                    <th>Joined</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div>
                          <p className="font-medium">{user.firstName || 'Unknown'}</p>
                          <p className="text-sm text-[var(--color-text-muted)] font-mono">
                            @{user.username || user.telegramId}
                          </p>
                        </div>
                      </td>
                      <td>{getTierBadge(user.tier)}</td>
                      <td>{getStatusBadge(user)}</td>
                      <td className="text-sm">
                        {user.activeSubscription ? (
                          <>
                            <p>{user.activeSubscription.tier}</p>
                            <p className="text-[var(--color-text-muted)]">
                              Expires: {new Date(user.activeSubscription.expiresAt).toLocaleDateString()}
                            </p>
                          </>
                        ) : (
                          <span className="text-[var(--color-text-muted)]">None</span>
                        )}
                      </td>
                      <td>{user.referralCount}</td>
                      <td>{user.paymentCount}</td>
                      <td className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="text-sm">
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : <span className="text-[var(--color-text-muted)]">Never</span>}
                      </td>
                      <td>
                        <button
                          onClick={() => openEditModal(user)}
                          className="btn btn-ghost btn-sm p-1 text-[var(--color-accent)] hover:text-[var(--color-accent-dim)]"
                          title="Edit tier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-text-muted)]">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Tier Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setEditingUser(null)}>
          <div className="card-elevated w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Edit User Tier</h2>
              <button onClick={() => setEditingUser(null)} className="btn btn-ghost p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[var(--color-bg)] rounded-lg">
                <p className="font-medium">{editingUser.firstName || 'Unknown'}</p>
                <p className="text-sm text-[var(--color-text-muted)]">@{editingUser.username || editingUser.telegramId}</p>
                <p className="text-sm text-[var(--color-text-muted)]">Current: {getTierBadge(editingUser.tier)}</p>
              </div>

              <div>
                <label className="label">New Tier</label>
                <select
                  className="input"
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value as any)}
                >
                  <option value="FREE">Free</option>
                  <option value="PRO">Pro</option>
                  <option value="ELITE">Elite</option>
                </select>
              </div>

              <div>
                <label className="label">Expires At (Optional)</label>
                <input
                  type="date"
                  className="input"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">Leave empty for no expiration (manual management)</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingUser(null)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleSaveTier} className="btn btn-primary flex-1">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}