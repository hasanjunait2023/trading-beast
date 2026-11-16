import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Gem, Crown, Zap, Check, Clock, CreditCard, Smartphone, Globe } from 'lucide-react';

const TIERS = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    period: '/month',
    color: 'text-[var(--color-text-muted)]',
    bg: 'bg-[var(--color-text-muted)]/10',
    border: 'border-[var(--color-text-muted)]/20',
    features: [
      '3 focus pairs per session',
      'Delayed updates (15 min)',
      'Basic analysis only',
      'No watch/avoid lists',
      'No session alerts',
      'Community support'
    ],
    cta: 'Current Plan'
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 9.99,
    period: '/month',
    color: 'text-[var(--color-accent)]',
    bg: 'bg-[var(--color-accent)]/10',
    border: 'border-[var(--color-accent)]/30',
    popular: true,
    features: [
      'All pairs, live focus',
      'Full watch/avoid lists',
      'Session start alerts',
      'Complete analysis details',
      'Custom watchlist (50 pairs)',
      'Priority email support',
      'Telegram bot integration'
    ],
    cta: 'Upgrade to Pro'
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 29.99,
    period: '/month',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/30',
    features: [
      'Everything in Pro',
      'Custom alert rules',
      'API access (REST)',
      'Webhook notifications',
      'Historical data export',
      'Dedicated support channel',
      'Early feature access'
    ],
    cta: 'Upgrade to Elite'
  }
];

export default function Subscription() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'current' | 'billing' | 'history'>('current');
  void activeTab;
  void setActiveTab;
  const currentTier = user?.tier || 'FREE';
  const isTrialActive = user?.isTrialActive;
  const trialDaysLeft = isTrialActive && user?.trialEndsAt
    ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Subscription</h1>
        <p className="text-[var(--color-text-muted)]">Manage your plan and billing</p>
      </div>

      {/* Current Plan */}
      <div className="card-elevated">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${TIERS.find(t => t.id === currentTier)?.bg || 'bg-[var(--color-text-muted)]/10'}`}>
              {currentTier === 'FREE' && <Gem className="w-8 h-8 text-[var(--color-text-muted)]" />}
              {currentTier === 'PRO' && <Zap className="w-8 h-8 text-[var(--color-accent)]" />}
              {currentTier === 'ELITE' && <Crown className="w-8 h-8 text-amber-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold">{TIERS.find(t => t.id === currentTier)?.name || currentTier}</h2>
                {isTrialActive && (
                  <span className="badge badge-trial">Trial: {trialDaysLeft}d left</span>
                )}
                {!isTrialActive && currentTier !== 'FREE' && (
                  <span className="badge badge-approved">Active</span>
                )}
              </div>
              <p className="text-[var(--color-text-muted)]">
                {isTrialActive
                  ? `Pro trial ends in ${trialDaysLeft} days`
                  : currentTier === 'FREE'
                  ? 'Upgrade to unlock all features'
                  : 'Subscription active'}
              </p>
            </div>
          </div>
          {currentTier !== 'ELITE' && (
            <button className="btn btn-primary" onClick={() => setActiveTab('billing')}>
              {isTrialActive ? 'Upgrade Now' : currentTier === 'FREE' ? 'Get Pro' : 'Upgrade to Elite'}
            </button>
          )}
        </div>

        {/* Trial countdown */}
        {isTrialActive && (
          <div className="mb-6 p-4 bg-[var(--color-bg)] rounded-lg border border-[var(--color-warning)]/30">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--color-warning)]" />
              <div>
                <p className="font-medium">Pro Trial Active</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining until trial expires.
                  Upgrade now to keep Pro features uninterrupted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current subscription details */}
        {user?.subscription && !isTrialActive && (
          <div className="grid grid-2 md:grid-4 gap-4 text-sm">
            <div className="p-3 bg-[var(--color-bg)] rounded-lg">
              <p className="text-[var(--color-text-muted)]">Status</p>
              <p className="font-medium capitalize">{user.subscription.status.toLowerCase()}</p>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-lg">
              <p className="text-[var(--color-text-muted)]">Expires</p>
              <p className="font-medium">{new Date(user.subscription.expiresAt).toLocaleDateString()}</p>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-lg">
              <p className="text-[var(--color-text-muted)]">Tier</p>
              <p className="font-medium">{user.subscription.tier}</p>
            </div>
            <div className="p-3 bg-[var(--color-bg)] rounded-lg">
              <p className="text-[var(--color-text-muted)]">Auto-renew</p>
              <p className="font-medium">{user.subscription.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tier Comparison */}
      <div className="card">
        <h2 className="font-medium mb-6">Compare Plans</h2>
        <div className="grid grid-1 md:grid-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative p-6 rounded-xl border transition-all ${
                tier.border
              } ${tier.popular ? 'ring-2 ring-[var(--color-accent)]' : ''} ${tier.id === currentTier ? 'ring-2 ring-[var(--color-success)]' : ''}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-semibold bg-[var(--color-accent)] text-black rounded-full">Most Popular</span>
                </div>
              )}
              {tier.id === currentTier && !tier.popular && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 text-xs font-semibold bg-[var(--color-success)] text-white rounded-full">Current</span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="font-display text-lg font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`font-display text-4xl font-bold ${tier.color}`}>
                    {tier.price === 0 ? 'Free' : '$' + tier.price}
                  </span>
                  <span className={`text-[var(--color-text-muted)] ${tier.price === 0 ? 'hidden' : ''}`}>{tier.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 ${tier.color}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`btn w-full ${tier.id === currentTier ? 'btn-secondary' : tier.id === 'PRO' ? 'btn-primary' : 'btn-secondary'}`}
                disabled={tier.id === currentTier}
                onClick={() => tier.id !== currentTier && setActiveTab('billing')}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods info */}
      <div className="card">
        <h2 className="font-medium mb-4">Payment Methods</h2>
        <div className="grid grid-1 md:grid-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
            <Smartphone className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-medium">bKash / Nagad</p>
              <p className="text-sm text-[var(--color-text-muted)]">Manual verification via screenshot</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
            <CreditCard className="w-6 h-6 text-[var(--color-accent)]" />
            <div>
              <p className="font-medium">USDT (TRC20)</p>
              <p className="text-sm text-[var(--color-text-muted)]">Auto-verified on-chain</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg opacity-50">
            <Globe className="w-6 h-6 text-[var(--color-text-muted)]" />
            <div>
              <p className="font-medium">Stripe (Card)</p>
              <p className="text-sm text-[var(--color-text-muted)]">Coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ All subscriptions provide access to market analysis tools only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}