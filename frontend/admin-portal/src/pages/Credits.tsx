import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../services/api';
import type { Metrics } from '../services/api';
import {
  Coins, RefreshCw, Sun, Radar, Infinity as InfinityIcon, Wallet,
  Undo2, ShieldCheck, UserPlus, ArrowRight, FlaskConical
} from 'lucide-react';

const LIVE_RULES = [
  {
    icon: Sun,
    title: '10 credits every day',
    text: 'Every user receives 10 credits per UTC calendar day, granted at the 00:00 UTC boundary. Grants are applied lazily — if a user is offline for several days, the missed days catch up automatically on their next visit.'
  },
  {
    icon: Radar,
    title: 'A Radar run costs 10',
    text: 'One explicit Radar trigger costs exactly 10 credits — one full day of free grants. There is no recurring automatic paid scan; users always trigger runs themselves.'
  },
  {
    icon: InfinityIcon,
    title: 'Credits never expire',
    text: 'Balances do not expire and are never reset. Unused credits keep accumulating for as long as the account exists.'
  },
  {
    icon: Wallet,
    title: 'One wallet, everywhere',
    text: 'The same wallet is shared across Telegram chat, the Mini App and the browser portal. A grant or spend on any surface is immediately reflected on all of them.'
  },
  {
    icon: Undo2,
    title: 'Failed runs are refunded',
    text: 'If an analysis run fails with an exception after credits were reserved, the debit is automatically refunded in full. Duplicate triggers of the same run are rejected, so a user can never be charged twice for one run.'
  },
  {
    icon: UserPlus,
    title: 'Referral reward',
    text: 'When a referred user is credited, the referrer earns 7 days of Pro, as shown in the bot’s referral screen. There is no referral limit.'
  }
];

const LEDGER_KINDS = [
  { kind: 'DAILY_GRANT', sign: '+', text: 'Daily 10-credit grant (one entry per catch-up, referenced by UTC day)' },
  { kind: 'RADAR_DEBIT', sign: '−', text: '10-credit debit when a Radar run is reserved' },
  { kind: 'RADAR_REFUND', sign: '+', text: 'Automatic refund of a failed Radar run' }
];

export default function Credits() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getMetrics();
      if (res.data.success) setMetrics(res.data.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchMetrics();
  }, []);

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
          <h1 className="font-display text-2xl font-bold">Credits</h1>
          <p className="text-[var(--color-text-muted)]">How the credit economy works — the live model and what is planned</p>
        </div>
        <button onClick={() => void fetchMetrics()} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Live aggregates — the only credit-economy numbers the admin API exposes */}
      <div className="grid grid-2 lg:grid-4 gap-4">
        <div className="card-elevated">
          <p className="text-sm text-[var(--color-text-muted)]">Users earning daily grants</p>
          <p className="font-display text-2xl font-bold mt-1">{metrics ? metrics.users.total : '—'}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Every account receives the daily grant</p>
        </div>
        <div className="card-elevated">
          <p className="text-sm text-[var(--color-text-muted)]">Daily issuance at current size</p>
          <p className="font-display text-2xl font-bold mt-1">
            {metrics ? (metrics.users.total * 10).toLocaleString() : '—'}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Credits/day if every user accrues (10 × users)</p>
        </div>
        <div className="card-elevated">
          <p className="text-sm text-[var(--color-text-muted)]">Total referrals</p>
          <p className="font-display text-2xl font-bold mt-1">{metrics ? metrics.referrals.total : '—'}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Referral records created</p>
        </div>
        <div className="card-elevated">
          <p className="text-sm text-[var(--color-text-muted)]">Credited referrals</p>
          <p className="font-display text-2xl font-bold mt-1">{metrics ? metrics.referrals.active : '—'}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Referrals that earned the Pro reward</p>
        </div>
      </div>

      {/* Live model */}
      <div className="card">
        <h2 className="font-medium mb-1 flex items-center gap-2">
          <Coins className="w-5 h-5 text-[var(--color-accent)]" />
          The Live Model
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Approved and running since the 2026-11-28 rollout. These rules are enforced by the backend credit service.
        </p>
        <div className="grid md:grid-2 gap-4">
          {LIVE_RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <div key={rule.title} className="p-4 bg-[var(--color-bg)] rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <h3 className="font-medium">{rule.title}</h3>
                </div>
                <p className="text-sm text-[var(--color-text-muted)]">{rule.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ledger explainer */}
      <div className="card">
        <h2 className="font-medium mb-1 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
          How the Ledger Works
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Every balance change is written as a ledger entry with a unique reference, inside a serializable
          transaction — so concurrent triggers cannot double-spend, and every credit can be traced to the
          entry that created it.
        </p>
        <div className="space-y-2">
          {LEDGER_KINDS.map((entry) => (
            <div key={entry.kind} className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
              <span className={`font-display font-bold w-5 text-center ${entry.sign === '+' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {entry.sign}
              </span>
              <span className="font-mono text-sm font-medium flex-shrink-0">{entry.kind}</span>
              <span className="text-sm text-[var(--color-text-muted)]">{entry.text}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          Individual wallet balances are visible to each user in their own portal and Mini App. The admin API
          does not expose per-user balances, so no balance figures are shown here.
        </p>
      </div>

      {/* Planned — clearly separated from the live model */}
      <div className="card border-dashed">
        <h2 className="font-medium mb-1 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-[var(--color-warning)]" />
          Planned — Not Active Yet
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Approved direction from the credit model document, but <span className="text-[var(--color-text)] font-medium">not activated</span>:
          no paid credit grants or top-ups exist today, and paid tiers are granted manually only.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <span className="font-medium">Pro — planned grant</span>
            <span className="text-sm text-[var(--color-text-muted)]">+300 credits per verified monthly renewal <span className="badge badge-pending ml-2">Planned</span></span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <span className="font-medium">Elite — planned grant</span>
            <span className="text-sm text-[var(--color-text-muted)]">+900 credits per verified monthly renewal <span className="badge badge-pending ml-2">Planned</span></span>
          </div>
          <div className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
            <span className="font-medium">Credit top-ups</span>
            <span className="text-sm text-[var(--color-text-muted)]">Optional purchases, later <span className="badge badge-pending ml-2">Planned</span></span>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-4">
          Paid tiers will also differentiate advanced alerts, correlation, journal, strategy and AI features —
          each gated until it is actually implemented. Prices are still to be validated against data costs
          and conversion.
        </p>
      </div>

      <div className="flex justify-end">
        <Link to="/users" className="btn btn-secondary btn-sm gap-1">
          View users <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}
