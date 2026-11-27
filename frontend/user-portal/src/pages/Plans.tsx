import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import {
  Gem,
  Zap,
  Crown,
  Check,
  Coins,
  Radar,
  Infinity as InfinityIcon,
  Gift,
  Wallet,
  ShieldCheck,
  CreditCard,
  ArrowRight
} from 'lucide-react';

// Pricing follows docs/CREDIT-FREEMIUM.md (approved model):
// Free = 10 credits/day, never expire; one Radar run = 10 credits.
// Pro/Elite are NOT launched yet — their +300/+900 credit grants are
// "proposed, not yet activated", so they are labelled Planned and no
// prices are shown (prices are still being validated).
const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    icon: Gem,
    color: 'text-[var(--color-text-muted)]',
    bg: 'bg-[var(--color-text-muted)]/10',
    border: 'border-[var(--color-text-muted)]/20',
    creditLine: '10 credits every day',
    features: [
      '10 credits granted daily (UTC)',
      'Credits never expire',
      'Focus Radar: focus, watch & avoid lists',
      'Asian, London & New York sessions',
      'Custom watchlist',
      'Same wallet in Telegram, Mini App & browser'
    ]
  },
  {
    id: 'PRO',
    name: 'Pro',
    icon: Zap,
    color: 'text-[var(--color-accent)]',
    bg: 'bg-[var(--color-accent)]/10',
    border: 'border-[var(--color-accent)]/30',
    comingSoon: true,
    creditLine: '+300 credits per month',
    features: [
      'Everything in Free',
      'Advanced alerts',
      'Correlation tools',
      'Trading journal',
      'Strategy features'
    ]
  },
  {
    id: 'ELITE',
    name: 'Elite',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    comingSoon: true,
    creditLine: '+900 credits per month',
    features: [
      'Everything in Pro',
      'AI-assisted analysis features',
      'Full strategy suite',
      'Priority access to new features as they ship'
    ]
  }
];

const CREDIT_MODEL = [
  {
    icon: Coins,
    title: 'Daily grant',
    text: 'You receive 10 free credits every UTC day. Away for a few days? Grants catch up automatically when you return.'
  },
  {
    icon: Radar,
    title: 'Radar cost',
    text: 'One Focus Radar run costs 10 credits. You only spend credits when you trigger a run — there is no automatic paid scan.'
  },
  {
    icon: InfinityIcon,
    title: 'Never expire',
    text: 'Credits do not expire. Your balance keeps building until you choose to spend it.'
  },
  {
    icon: Gift,
    title: 'Referral bonus',
    text: 'Invite friends with your referral code — you both earn free Pro days for every successful referral.'
  },
  {
    icon: Wallet,
    title: 'One wallet everywhere',
    text: 'A single credit balance is shared across the Telegram bot, the Mini App and this web portal.'
  },
  {
    icon: ShieldCheck,
    title: 'Failed runs refunded',
    text: 'If an analysis run fails on our side, the 10 credits are refunded to your wallet automatically.'
  }
];

export default function Plans() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const currentTier = user?.tier || 'FREE';

  useEffect(() => {
    userApi
      .credits()
      .then((r) => {
        if (r.data.success) setBalance(r.data.data.balance);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Plans & Credits</h1>
        <p className="text-[var(--color-text-muted)]">Simple credit-based pricing — no subscriptions to manage yet</p>
      </div>

      {/* Balance strip */}
      <div className="card-elevated flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center">
            <Coins className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">Your credit balance</p>
            <p className="font-display text-2xl font-bold">
              {balance ?? '—'} <span className="text-base font-medium text-[var(--color-text-muted)]">credits</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${currentTier === 'ELITE' ? 'badge-elite' : currentTier === 'PRO' ? 'badge-pro' : 'badge-free'}`}>
            {currentTier} plan
          </span>
          <span className="text-sm text-[var(--color-text-muted)]">+10 credits daily</span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-1 md:grid-3 gap-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = plan.id === currentTier;
          return (
            <div
              key={plan.id}
              className={`relative p-6 rounded-xl border bg-[var(--color-surface)] transition-all ${plan.border} ${
                isCurrent ? 'ring-2 ring-[var(--color-success)]' : ''
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 text-xs font-semibold bg-[var(--color-success)] text-white rounded-full">Current plan</span>
                </div>
              )}
              {plan.comingSoon && (
                <div className="absolute -top-3 left-4">
                  <span className="px-3 py-1 text-xs font-semibold bg-[var(--color-warning)] text-black rounded-full">Coming soon</span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${plan.bg}`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>
                <h2 className="font-display text-lg font-bold">{plan.name}</h2>
              </div>

              <p className={`font-display text-xl font-bold ${plan.color}`}>{plan.creditLine}</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-5">
                {plan.comingSoon ? 'Planned credit grant — not yet active' : 'Granted automatically, every day'}
              </p>

              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.color}`} />
                    <span>
                      {feature}
                      {plan.comingSoon && <span className="text-[var(--color-text-muted)]"> (planned)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Credit model explainer */}
      <div className="card">
        <h2 className="font-medium mb-1">How credits work</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-5">One simple wallet powers every Radar run.</p>
        <div className="grid grid-1 md:grid-2 lg:grid-3 gap-4">
          {CREDIT_MODEL.map((item) => (
            <div key={item.title} className="p-4 bg-[var(--color-bg)] rounded-lg">
              <item.icon className="w-6 h-6 text-[var(--color-accent)] mb-2" />
              <p className="font-medium mb-1">{item.title}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/subscription" className="btn btn-primary flex-1">
          Manage subscription
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link to="/payments" className="btn btn-secondary flex-1">
          <CreditCard className="w-4 h-4" />
          Make a payment
        </Link>
        <Link to="/referral" className="btn btn-secondary flex-1">
          <Gift className="w-4 h-4" />
          Earn with referrals
        </Link>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ TradingBeast is a market analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
