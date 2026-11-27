import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { Metrics } from '../services/api';
import {
  TrendingUp, TrendingDown, Users, DollarSign,
  Activity, RefreshCw, Info
} from 'lucide-react';
import {
  BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6b7280', '#06b6d4', '#fbbf24', '#22c55e'];

/**
 * Metrics & Analytics — every number on this page comes from GET /admin/metrics.
 * The API exposes current totals only (no historical time series), so this page
 * deliberately has no growth charts: showing invented history would mislead
 * business decisions. See Finance for verified revenue and the pending queue.
 */
export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    void fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getMetrics();
      if (res.data.success) {
        setMetrics(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  const tierData = [
    { name: 'Free', value: metrics?.tiers.free || 0 },
    { name: 'Pro', value: metrics?.tiers.pro || 0 },
    { name: 'Elite', value: metrics?.tiers.elite || 0 },
    { name: 'Trial', value: metrics?.tiers.trial || 0 }
  ];

  const referralData = [
    { stage: 'Signed Up', count: metrics?.referrals.total || 0 },
    { stage: 'Credited', count: metrics?.referrals.active || 0 }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Metrics & Analytics</h1>
          <p className="text-[var(--color-text-muted)]">
            Live platform totals from the metrics API
            {lastUpdated && <> · updated {lastUpdated.toLocaleTimeString()}</>}
          </p>
        </div>
        <button onClick={() => void fetchMetrics()} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-2 md:grid-3 lg:grid-6 gap-4">
        {[
          {
            key: 'totalUsers',
            label: 'Total Users',
            value: metrics?.users.total || 0,
            change: `+${metrics?.users.new30d || 0} new (30d)`,
            icon: Users, color: 'text-[var(--color-accent)]', bg: 'bg-[var(--color-accent)]/10'
          },
          {
            key: 'newUsers7d',
            label: 'New Users (7d)',
            value: metrics?.users.new7d || 0,
            change: 'joined this week',
            icon: TrendingUp, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10'
          },
          {
            key: 'proUsers',
            label: 'Pro Users',
            value: metrics?.tiers.pro || 0,
            change: 'current tier count',
            icon: Activity, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info)]/10'
          },
          {
            key: 'eliteUsers',
            label: 'Elite Users',
            value: metrics?.tiers.elite || 0,
            change: 'current tier count',
            icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10'
          },
          {
            key: 'revenue',
            label: 'Total Revenue',
            value: `$${((metrics?.revenue.total || 0) / 100).toLocaleString()}`,
            change: `${metrics?.revenue.approved30d || 0} approvals (30d)`,
            icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10'
          },
          {
            key: 'activationRate',
            label: 'Activation Rate',
            value: `${metrics?.activation.rate || 0}%`,
            change: '7-day active users',
            icon: TrendingUp, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10'
          }
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.key} className="card-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{kpi.label}</p>
                  <p className="font-display text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{kpi.change}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Honest scope note */}
      <div className="card flex items-start gap-3">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-info)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          This page shows <span className="text-[var(--color-text)] font-medium">current totals only</span>.
          The metrics API does not expose historical time series yet, so there are no growth
          charts here — earlier versions of this page plotted simulated history, which has been
          removed. For revenue detail and the pending-verification queue, see{' '}
          <span className="text-[var(--color-text)] font-medium">Finance</span>.
        </p>
      </div>

      {/* Charts row — real aggregates only */}
      <div className="grid lg:grid-2 gap-6">
        {/* Tier Distribution */}
        <div className="card">
          <h2 className="font-medium mb-4">Tier Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierData}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(1)}%` : '')}
                  labelLine={false}
                >
                  {tierData.map((tier, i) => (
                    <Cell key={`cell-${tier.name}`} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                  formatter={(value: number) => [value.toString(), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {tierData.map((tier, i) => (
              <div key={tier.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                <span>{tier.name}: <span className="font-medium">{tier.value}</span></span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-3 text-center">
            Trial overlaps the tiers above (a trialing user also holds a tier).
          </p>
        </div>

        {/* Referrals — real stages only */}
        <div className="card">
          <h2 className="font-medium mb-4">Referrals</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={referralData} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="stage" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                />
                <Bar dataKey="count" name="Referrals" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Signed Up = all referrals recorded · Credited = referrals that earned the Pro-days reward.
          </p>
        </div>
      </div>

      {/* Detail cards */}
      <div className="grid lg:grid-2 gap-6">
        {/* Trial Conversion */}
        <div className="card">
          <h2 className="font-medium mb-4">Trial Conversion</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                </div>
                <div>
                  <p className="font-medium">Converted to Paid</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Trial users who upgraded</p>
                </div>
              </div>
              <span className="font-display font-bold text-[var(--color-success)]">{metrics?.trialConversion.converted || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-info)]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[var(--color-info)]" />
                </div>
                <div>
                  <p className="font-medium">Active Trials</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Currently in trial period</p>
                </div>
              </div>
              <span className="font-display font-bold">{metrics?.tiers.trial || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-[var(--color-warning)]" />
                </div>
                <div>
                  <p className="font-medium">Expired Trials</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Not exposed by the metrics API yet</p>
                </div>
              </div>
              <span className="font-display font-bold text-[var(--color-warning)]">—</span>
            </div>
          </div>
        </div>

        {/* Payments snapshot */}
        <div className="card">
          <h2 className="font-medium mb-4">Payments Snapshot</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div>
                <p className="font-medium">Verified revenue (all time)</p>
                <p className="text-sm text-[var(--color-text-muted)]">Sum of approved payments</p>
              </div>
              <span className="font-display font-bold text-amber-400">
                ${((metrics?.revenue.total || 0) / 100).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div>
                <p className="font-medium">Approvals (last 30 days)</p>
                <p className="text-sm text-[var(--color-text-muted)]">Count of payments approved</p>
              </div>
              <span className="font-display font-bold">{metrics?.revenue.approved30d || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
              <div>
                <p className="font-medium">Pending verification</p>
                <p className="text-sm text-[var(--color-text-muted)]">Waiting in the review queue</p>
              </div>
              <span className="font-display font-bold">{metrics?.revenue.pendingPayments || 0}</span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              A per-method breakdown of approved payments is not exposed by the API yet — the
              Finance page shows the live pending queue grouped by method and currency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
