import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../services/api';
import type { Metrics, AdminUser } from '../services/api';
import { RefreshCw, Users, ArrowRight, Info, TrendingUp } from 'lucide-react';

type TierFilter = 'ALL' | 'FREE' | 'PRO' | 'ELITE';

const TIER_META: { key: 'free' | 'pro' | 'elite'; label: string; badge: string; bar: string }[] = [
  { key: 'free', label: 'Free', badge: 'badge-free', bar: 'bg-slate-400' },
  { key: 'pro', label: 'Pro', badge: 'badge-pro', bar: 'bg-[var(--color-accent)]' },
  { key: 'elite', label: 'Elite', badge: 'badge-elite', bar: 'bg-amber-400' }
];

export default function Subscriptions() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<TierFilter>('ALL');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, usersRes] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getUsers({ page: 1, limit: 100 })
      ]);
      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (usersRes.data.success) {
        setUsers(usersRes.data.data);
        setUsersTotal(usersRes.data.meta.total);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filteredUsers = useMemo(
    () => (tierFilter === 'ALL' ? users : users.filter((u) => u.tier === tierFilter)),
    [users, tierFilter]
  );

  const total = metrics?.users.total || 0;
  const share = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'FREE': return <span className="badge badge-free">Free</span>;
      case 'PRO': return <span className="badge badge-pro">Pro</span>;
      case 'ELITE': return <span className="badge badge-elite">Elite</span>;
      default: return <span className="badge">{tier}</span>;
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
          <p className="text-[var(--color-text-muted)]">Tier distribution across all users</p>
        </div>
        <button onClick={() => void fetchData()} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tier distribution with share bars */}
      <div className="card">
        <h2 className="font-medium mb-4">Tier Distribution</h2>
        {metrics && (
          <div className="space-y-5">
            {TIER_META.map((tier) => {
              const count = metrics.tiers[tier.key];
              const pct = share(count);
              return (
                <div key={tier.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`badge ${tier.badge}`}>{tier.label}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      <span className="font-display font-bold text-[var(--color-text)]">{count}</span> users · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${tier.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-sm">
              <span className="text-[var(--color-text-muted)]">Currently in a trial period (overlaps the tiers above)</span>
              <span className="font-display font-bold">{metrics.tiers.trial}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--color-success)]" /> Trial → paid conversions
              </span>
              <span className="font-display font-bold">{metrics.trialConversion.converted}</span>
            </div>
          </div>
        )}
      </div>

      {/* Launch status note */}
      <div className="card flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-text-muted)]">
          Pro and Elite are <span className="text-[var(--color-text)] font-medium">not yet launched for self-serve purchase</span>.
          Users reach a paid tier today only through a manually verified payment (Payments page) or a manual
          tier grant on the Users page — there is no automatic checkout or renewal yet.
        </p>
      </div>

      {/* Users by tier */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--color-accent)]" />
            Users by Tier
          </h2>
          <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
            {(['ALL', 'FREE', 'PRO', 'ELITE'] as TierFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  tierFilter === t
                    ? 'bg-[var(--color-accent)] text-black'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users in this tier yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Tier</th>
                  <th>Subscription</th>
                  <th>Payments</th>
                  <th>Referrals</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
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
                    <td className="text-sm">
                      {user.activeSubscription ? (
                        <>
                          <p>{user.activeSubscription.tier} · {user.activeSubscription.status}</p>
                          <p className="text-[var(--color-text-muted)]">
                            Expires {new Date(user.activeSubscription.expiresAt).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">None</span>
                      )}
                    </td>
                    <td>{user.paymentCount}</td>
                    <td>{user.referralCount}</td>
                    <td className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 pt-4 border-t border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            Showing {filteredUsers.length} of {users.length} loaded users ({usersTotal} total).
            Tier changes are made on the Users page.
          </p>
          <Link to="/users" className="btn btn-secondary btn-sm gap-1">
            Manage users <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
