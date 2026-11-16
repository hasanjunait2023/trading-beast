import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import type { Metrics } from '../services/api';
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign,
  Activity, RefreshCw, Calendar, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7'];

export default function Metrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock historical data for charts (in real app, fetch from API)
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
    generateMockHistoricalData();
  }, [timeRange]);

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

  const generateMockHistoricalData = () => {
    // Generate mock data for charts
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const data = [];
    let users = metrics?.users.total || 100;
    let revenue = 0;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Simulate growth
      const newUsers = Math.floor(Math.random() * 5) + 1;
      const newRevenue = Math.floor(Math.random() * 2000) + 100;
      users += newUsers;
      revenue += newRevenue;

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: users - Math.floor(Math.random() * 10),
        newUsers,
        revenue,
        newRevenue,
        proUsers: Math.floor(users * 0.3),
        freeUsers: Math.floor(users * 0.6),
        eliteUsers: Math.floor(users * 0.1)
      });
    }
    setHistoricalData(data);
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
          <h1 className="font-display text-2xl font-bold">Metrics & Analytics</h1>
          <p className="text-[var(--color-text-muted)]">Platform performance and business intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-[var(--color-border)] rounded-lg overflow-hidden">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-[var(--color-accent)] text-black'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {range === '7d' ? '7D' : range === '30d' ? '30D' : '90D'}
              </button>
            ))}
          </div>
          <button onClick={fetchMetrics} disabled={isLoading} className="btn btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-2 md:grid-4 lg:grid-6 gap-4">
        {[
          {
            key: 'totalUsers',
            label: 'Total Users',
            value: metrics?.users.total || 0,
            change: `+${metrics?.users.new30d || 0} (30d)`,
            icon: Users, color: 'text-[var(--color-accent)]', bg: 'bg-[var(--color-accent)]/10'
          },
          {
            key: 'newUsers7d',
            label: 'New Users (7d)',
            value: metrics?.users.new7d || 0,
            change: `${metrics?.users.new7d || 0} this week`,
            icon: TrendingUp, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10'
          },
          {
            key: 'proUsers',
            label: 'Pro Users',
            value: metrics?.tiers.pro || 0,
            change: `${metrics?.tiers.pro || 0} active`,
            icon: Activity, color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info)]/10'
          },
          {
            key: 'eliteUsers',
            label: 'Elite Users',
            value: metrics?.tiers.elite || 0,
            change: `${metrics?.tiers.elite || 0} active`,
            icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10'
          },
          {
            key: 'revenue',
            label: 'Total Revenue',
            value: `$${((metrics?.revenue.total || 0) / 100).toLocaleString()}`,
            change: `$${((metrics?.revenue.approved30d || 0) / 100).toLocaleString()} (30d)`,
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

      {/* Charts */}
      <div className="grid lg:grid-2 gap-6">
        {/* User Growth */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">User Growth</h2>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]"></span>
                Total Users
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
                New Users
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNewUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend />
                <Area type="monotone" dataKey="users" name="Total Users" stroke="#06b6d4" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                <Area type="monotone" dataKey="newUsers" name="New Users" stroke="#22c55e" fillOpacity={1} fill="url(#colorNewUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Revenue Growth</h2>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Total Revenue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--color-warning)]"></span>
                Monthly Revenue
              </span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMonthlyRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `$${(v/100).toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number) => [`$${(value/100).toLocaleString()}`, '']}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Total Revenue" stroke="#fbbf24" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="newRevenue" name="Monthly Revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorMonthlyRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second row of charts */}
      <div className="grid lg:grid-2 gap-6">
        {/* Tier Distribution */}
        <div className="card">
          <h2 className="font-medium mb-4">Tier Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Free', value: metrics?.tiers.free || 0, color: '#6b7280' },
                    { name: 'Pro', value: metrics?.tiers.pro || 0, color: '#06b6d4' },
                    { name: 'Elite', value: metrics?.tiers.elite || 0, color: '#fbbf24' },
                    { name: 'Trial', value: metrics?.tiers.trial || 0, color: '#22c55e' }
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {['Free', 'Pro', 'Elite', 'Trial'].map((name, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i]} />
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
            {[
              { name: 'Free', color: '#6b7280', value: metrics?.tiers.free || 0 },
              { name: 'Pro', color: '#06b6d4', value: metrics?.tiers.pro || 0 },
              { name: 'Elite', color: '#fbbf24', value: metrics?.tiers.elite || 0 },
              { name: 'Trial', color: '#22c55e', value: metrics?.tiers.trial || 0 }
            ].map((tier) => (
              <div key={tier.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tier.color }}></span>
                <span>{tier.name}: <span className="font-medium">{tier.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Referral Funnel */}
        <div className="card">
          <h2 className="font-medium mb-4">Referral Funnel</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { stage: 'Invited', count: (metrics?.referrals.total || 0) * 3 },
                { stage: 'Signed Up', count: metrics?.referrals.total || 0 },
                { stage: 'Activated', count: Math.floor((metrics?.referrals.total || 0) * 0.7) },
                { stage: 'Credited', count: metrics?.referrals.active || 0 }
              ]} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="stage" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} width={80} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                />
                <Bar dataKey="count" name="Users" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
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
                  <p className="text-sm text-[var(--color-text-muted)]">Trials that didn't convert</p>
                </div>
              </div>
              <span className="font-display font-bold text-[var(--color-warning)]">—</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="card">
          <h2 className="font-medium mb-4">Payment Methods</h2>
          <div className="space-y-3">
            {[
              { method: 'bKash', count: Math.floor((metrics?.revenue.approved30d || 0) * 0.4), color: 'text-pink-500' },
              { method: 'Nagad', count: Math.floor((metrics?.revenue.approved30d || 0) * 0.3), color: 'text-orange-500' },
              { method: 'USDT', count: Math.floor((metrics?.revenue.approved30d || 0) * 0.2), color: 'text-green-500' },
              { method: 'Other', count: Math.floor((metrics?.revenue.approved30d || 0) * 0.1), color: 'text-[var(--color-text-muted)]' }
            ].map((pm) => (
              <div key={pm.method} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${pm.color}20` }}>
                    <span className={pm.color}>💳</span>
                  </div>
                  <span className="font-medium">{pm.method}</span>
                </div>
                <div className="text-right">
                  <p className="font-medium">${(pm.count / 100).toLocaleString()}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {metrics?.revenue.approved30d ? ((pm.count / metrics.revenue.approved30d) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}