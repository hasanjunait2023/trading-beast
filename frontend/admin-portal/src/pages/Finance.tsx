import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../services/api';
import type { Metrics, Payment } from '../services/api';
import {
  DollarSign, CheckCircle, Clock, RefreshCw, ArrowRight, Info, CreditCard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const METHOD_COLORS: Record<string, string> = {
  BKASH: '#ec4899',
  NAGAD: '#f97316',
  USDT: '#22c55e',
  STRIPE: '#06b6d4',
  MANUAL: '#94a3b8'
};

function money(cents: number, currency?: string): string {
  const base = `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return currency ? `${base} ${currency}` : base;
}

/** Sum amounts grouped by currency so mixed currencies are never added together. */
function sumsByCurrency(payments: Payment[]): { currency: string; total: number }[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    map.set(p.currency, (map.get(p.currency) || 0) + p.amount);
  }
  return [...map.entries()].map(([currency, total]) => ({ currency, total }));
}

export default function Finance() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pending, setPending] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const [metricsRes, pendingRes] = await Promise.all([
        adminApi.getMetrics(),
        adminApi.getPendingPayments()
      ]);
      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (pendingRes.data.success) setPending(pendingRes.data.data);
    } catch (error) {
      console.error('Failed to load finance data:', error);
      setLoadError('Failed to load finance data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const pendingByCurrency = useMemo(() => sumsByCurrency(pending), [pending]);

  const pendingByMethod = useMemo(() => {
    const map = new Map<string, { method: string; count: number; byCurrency: { currency: string; total: number }[] }>();
    for (const p of pending) {
      const entry = map.get(p.method) || { method: p.method, count: 0, byCurrency: [] };
      entry.count += 1;
      const cur = entry.byCurrency.find((c) => c.currency === p.currency);
      if (cur) cur.total += p.amount;
      else entry.byCurrency.push({ currency: p.currency, total: p.amount });
      map.set(p.method, entry);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [pending]);

  const oldestPending = useMemo(() => pending.slice(0, 5), [pending]);

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
          <h1 className="font-display text-2xl font-bold">Finance</h1>
          <p className="text-[var(--color-text-muted)]">Verified revenue and the pending-verification queue</p>
        </div>
        <button onClick={() => void fetchData()} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="p-3 rounded-lg border bg-red-900/30 border-red-500/30 text-red-300 text-sm">{loadError}</div>
      )}

      {/* Revenue cards — every value comes straight from GET /admin/metrics or the pending queue */}
      <div className="grid grid-2 lg:grid-4 gap-4">
        <div className="card-elevated">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Verified Revenue (all time)</p>
              <p className="font-display text-2xl font-bold mt-1">
                {metrics ? money(metrics.revenue.total) : '—'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Sum of approved payments</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Approved Payments (30d)</p>
              <p className="font-display text-2xl font-bold mt-1">{metrics ? metrics.revenue.approved30d : '—'}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Payments approved in the last 30 days</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Pending Verification</p>
              <p className="font-display text-2xl font-bold mt-1">{metrics ? metrics.revenue.pendingPayments : '—'}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Payments awaiting review</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--color-warning)]/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--color-warning)]" />
            </div>
          </div>
        </div>

        <div className="card-elevated">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--color-text-muted)]">Pending Value</p>
              {pendingByCurrency.length === 0 ? (
                <p className="font-display text-2xl font-bold mt-1">—</p>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {pendingByCurrency.map((s) => (
                    <p key={s.currency} className="font-display text-2xl font-bold leading-tight">
                      {money(s.total, s.currency)}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Value sitting in the review queue</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-2 gap-6">
        {/* Pending queue by method — the only payment breakdown the API exposes */}
        <div className="card">
          <h2 className="font-medium mb-1">Pending Queue by Method</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            Count of payments awaiting verification, grouped by payment method.
          </p>
          {pendingByMethod.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nothing is waiting for verification right now.</p>
            </div>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pendingByMethod} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="method" stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                    <YAxis allowDecimals={false} stroke="#6b7280" fontSize={12} tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #1f2937', borderRadius: '8px' }}
                      labelStyle={{ color: '#f1f5f9' }}
                      formatter={(value: number) => [value, 'Pending payments']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {pendingByMethod.map((entry) => (
                        <Cell key={entry.method} fill={METHOD_COLORS[entry.method] || '#06b6d4'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pendingByMethod.map((entry) => (
                  <div key={entry.method} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                    <span className="font-medium capitalize">{entry.method.toLowerCase()}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {entry.count} pending ·{' '}
                      {entry.byCurrency.map((c) => money(c.total, c.currency)).join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Oldest pending payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Oldest Pending Payments</h2>
            <Link to="/payments" className="btn btn-ghost btn-sm gap-1 text-[var(--color-accent)]">
              Review queue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {oldestPending.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pending payments.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {oldestPending.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.user.firstName || 'Unknown'}</p>
                    <p className="text-sm text-[var(--color-text-muted)] font-mono truncate">
                      @{p.user.username || p.user.telegramId} · {p.transactionId}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-medium">{money(p.amount, p.currency)}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      <span className="capitalize">{p.method.toLowerCase()}</span> · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Honest data note */}
      <div className="card flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--color-text-muted)]">
          Revenue here is limited to what the admin API exposes: the all-time total of approved payments,
          the count of approvals in the last 30 days, and the live pending queue. There is no endpoint for
          approved-payment history, so no revenue trend or per-plan revenue split is shown — those numbers
          would have to be invented, and this page only reports real data.
        </p>
      </div>
    </motion.div>
  );
}
