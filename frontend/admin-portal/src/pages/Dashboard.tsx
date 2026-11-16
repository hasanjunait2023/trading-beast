import { useState, useEffect } from 'react';
import { adminApi, Metrics } from '../services/api';
import { Users, TrendingUp, DollarSign, RefreshCw, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const metricCards = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'text-[var(--color-accent)]', bg: 'bg-[var(--color-accent)]/10' },
  { key: 'newUsers7d', label: 'New Users (7d)', icon: TrendingUp, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10' },
  { key: 'proUsers', label: 'Pro Users', icon: Activity, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info)]/10' },
  { key: 'revenue', label: 'Total Revenue', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { key: 'pendingPayments', label: 'Pending Payments', icon: RefreshCw, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10' },
  { key: 'activationRate', label: 'Activation Rate', icon: TrendingUp, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10' }
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
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

  const getMetricValue = (key: string): string | number => {
    if (!metrics) return '—';
    switch (key) {
      case 'totalUsers': return metrics.users.total;
      case 'newUsers7d': return metrics.users.new7d;
      case 'proUsers': return metrics.tiers.pro;
      case 'revenue': return `$${(metrics.revenue.total / 100).toLocaleString()}`;
      case 'pendingPayments': return metrics.revenue.pendingPayments;
      case 'activationRate': return `${metrics.activation.rate}%`;
      default: return '—';
    }
  };

  const getMetricChange = (key: string) => {
    if (!metrics) return null;
    switch (key) {
      case 'totalUsers': return { value: metrics.users.new30d, label: '+30d' };
      case 'newUsers7d': return { value: metrics.users.new7d, label: 'this week' };
      case 'proUsers': return { value: metrics.tiers.pro, label: 'current' };
      case 'revenue': return { value: `$${(metrics.revenue.approved30d / 100).toLocaleString()}`, label: '+30d' };
      case 'pendingPayments': return { value: metrics.revenue.pendingPayments, label: 'awaiting review' };
      case 'activationRate': return { value: `${metrics.activation.rate}%`, label: '7-day active' };
      default: return null;
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--color-text-muted)]">Platform overview and key metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchMetrics} disabled={isLoading} className="btn btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-2 md:grid-3 lg:grid-6 gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          const value = getMetricValue(card.key);
          const change = getMetricChange(card.key);
          return (
            <div key={card.key} className="card-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{card.label}</p>
                  <p className="font-display text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
              {change && (
                <div className="mt-3 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <span className="font-medium text-[var(--color-text)]">{change.value}</span>
                  <span>{change.label}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tier Distribution */}
      <div className="grid lg:grid-2 gap-6">
        <div className="card">
          <h2 className="font-medium mb-4">User Tiers</h2>
          {metrics && (
            <div className="space-y-3">
              {[
                { key: 'free', label: 'Free', count: metrics.tiers.free, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-text-muted)]/10' },
                { key: 'pro', label: 'Pro', count: metrics.tiers.pro, color: 'text-[var(--color-accent)]', bg: 'bg-[var(--color-accent)]/10' },
                { key: 'elite', label: 'Elite', count: metrics.tiers.elite, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                { key: 'trial', label: 'Trial', count: metrics.tiers.trial, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10' }
              ].map((tier) => (
                <div key={tier.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tier.bg}`}>
                      <span className={`font-medium ${tier.color}`}>{tier.count}</span>
                    </div>
                    <span className="font-medium">{tier.label}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{metrics.users.total > 0 ? ((tier.count / metrics.users.total) * 100).toFixed(1) : 0}%</p>
                    <p className="text-xs text-[var(--color-text-muted)]">of {metrics.users.total} total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-medium mb-4">Referrals & Conversion</h2>
          {metrics && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-info)]/10 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-[var(--color-info)]" />
                  </div>
                  <span className="font-medium">Total Referrals</span>
                </div>
                <span className="font-display font-bold">{metrics.referrals.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-[var(--color-success)]" />
                  </div>
                  <span className="font-medium">Active Referrals</span>
                </div>
                <span className="font-display font-bold">{metrics.referrals.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="font-medium">Trial → Paid Conversions</span>
                </div>
                <span className="font-display font-bold">{metrics.trialConversion.converted}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="font-medium mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary">Trigger Daily Analysis</button>
          <button className="btn btn-secondary">Review Pending Payments</button>
          <button className="btn btn-secondary">Export User Data</button>
          <button className="btn btn-ghost">System Health Check</button>
        </div>
      </div>
    </div>
  );
}