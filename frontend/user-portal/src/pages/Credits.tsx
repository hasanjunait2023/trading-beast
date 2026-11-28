import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/components/Button';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import {
  ArrowRightIcon,
  CalendarIcon,
  CrosshairIcon,
  GiftIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '@shared/components/icons';
import { userApi, type CreditsData } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { shouldShowUpgradePanel } from '../utils/profileGate';

/**
 * Credits (study 21). "Radar Credits" title, gradient wallet card with the
 * real balance, three stat cards (daily grant, scan cost, next grant at
 * 00:00 UTC), the gradient Run Radar action, and the explainer card. All
 * values come from GET /user/credits — grants accrue on the server in UTC,
 * so this page never computes a spendable balance from local time. No
 * history or purchase UI: neither exists in the API. No Demo badge: no
 * production demo state exists to label.
 */

/** Decorative wallet-card artwork (study 21): a soft glowing trend line —
 *  explicitly decoration, not market data. */
function WalletArt() {
  return (
    <svg
      viewBox="0 0 300 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[55%]"
    >
      <defs>
        <linearGradient id="tb-wallet-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#35d99a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#35d99a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 108 C 45 100, 70 84, 105 88 S 160 60, 195 62 S 255 30, 300 14 L300 120 L0 120 Z"
        fill="url(#tb-wallet-fill)"
      />
      <path
        d="M0 108 C 45 100, 70 84, 105 88 S 160 60, 195 62 S 255 30, 300 14"
        fill="none"
        stroke="#35d99a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="300" cy="14" r="5" fill="#a9ecc9" />
    </svg>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-row)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p className="tnum mt-0.5 text-[22px] leading-tight font-extrabold tracking-tight">{value}</p>
    </div>
  );
}

export default function Credits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
      setError('');
    } catch {
      setError('Could not load your credit balance. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !credits) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading credits">
        <Skeleton height={120} />
        <Skeleton height={80} />
      </div>
    );
  }
  if (error && !credits) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }
  if (!credits) return null;

  return (
    <div className="mx-auto max-w-[880px] space-y-5">
      <div>
        <h1 className="text-[34px] leading-tight font-extrabold tracking-tight sm:text-[40px]">
          Radar Credits
        </h1>
        <p className="mt-1.5 text-[15px] text-[var(--color-text-muted)]">
          Use Radar credits to scan markets for high-potential trading opportunities.
        </p>
      </div>

      {/* Wallet card (study 21): gradient panel, real server balance. */}
      <section
        aria-label="Your wallet"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <WalletArt />
        <div className="relative">
          <p className="flex items-center gap-2.5 text-lg font-bold">
            <WalletIcon size={26} />
            Your Wallet
          </p>
          <p className="tnum mt-3 text-[44px] leading-none font-extrabold">
            {credits.balance} <span className="text-[26px] font-bold">credits</span>
          </p>
          <p className="mt-3 max-w-[420px] text-sm text-white/85">
            One wallet, shared across the bot, Mini App and this portal. Credits never expire.
          </p>
        </div>
      </section>

      {/* Upgrade panel (Conversion chapter): free users always see it;
          paid users only when the balance runs low. Copy is balance-aware
          and states only the real, planned Pro terms. */}
      {user && shouldShowUpgradePanel(credits.balance, user.tier) && (
        <section
          aria-label="Upgrade your plan"
          className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)]"
          style={{ background: 'var(--gradient-session-hero)' }}
        >
          <div className="relative flex flex-wrap items-center gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-[22px] leading-tight font-extrabold tracking-tight">
                {credits.balance < credits.radarCost
                  ? 'Your balance can’t cover a Radar run right now'
                  : 'Get more out of every session'}
              </h2>
              <p className="mt-1.5 max-w-[520px] text-sm leading-relaxed text-white/85">
                {credits.balance < credits.radarCost
                  ? `A run costs ${credits.radarCost} credits and your next daily grant lands at 00:00 UTC. Pro — planned at +300 credits a month — means never waiting on a grant.`
                  : 'Pro is planned with +300 credits a month, advanced alerts and the trading journal — on top of the daily grant you already get.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/membership', { state: { section: 'plans' } })}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-white px-6 font-bold text-[var(--color-accent)] shadow transition-transform active:scale-[0.99]"
            >
              See Pro plan
              <ArrowRightIcon size={20} />
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<GiftIcon size={22} />}
          label="Daily Grant"
          value={`${credits.dailyGrant} credits`}
        />
        <StatCard
          icon={<CrosshairIcon size={22} />}
          label="Scan Cost"
          value={`${credits.radarCost} credits`}
        />
        <StatCard icon={<CalendarIcon size={22} />} label="Next Grant At" value="00:00 UTC" />
      </div>

      {/* Opens Markets with the run confirmation — never posts by itself. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/app/markets', { state: { openRun: true } })}
          className="flex min-h-[60px] flex-1 items-center justify-center gap-2.5 rounded-full px-6 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
          style={{ background: 'var(--gradient-primary-action)' }}
        >
          <CrosshairIcon size={26} />
          Run Radar · {credits.radarCost} credits
          <ArrowRightIcon size={22} />
        </button>
        <Button
          size="lg"
          variant="secondary"
          className="rounded-full"
          onClick={() => navigate('/app/membership')}
        >
          View membership
        </Button>
      </div>

      {/* Explainer (study 21) — honest mechanics only: the handoff forbids
          promising refunds the server has not confirmed. */}
      <section
        aria-label="How Radar credits work"
        className="flex gap-4 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] p-5"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-accent)]">
          <ShieldCheckIcon size={26} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">How Radar credits work</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Running a scan charges {credits.radarCost} credits from your wallet — only when you
            explicitly confirm the run. Browsing, filters and the Session Clock are always free.
            Your daily grant of {credits.dailyGrant} credits is applied by the server at the
            start of each UTC day, and missed grants catch up automatically when you return.
          </p>
        </div>
      </section>
    </div>
  );
}
