import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Tabs } from '@shared/components/Tabs';
import { Skeleton } from '@shared/components/Skeleton';
import { Brand } from '@shared/components/Brand';
import { ChevronRightIcon, CrownIcon, LeafIcon, MedalIcon } from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { userApi, type CreditsData, type User } from '../services/api';
import { PLAN_OFFERINGS, CREDIT_MODEL_NOTES } from './membershipCatalog';
import { PaymentHistoryList } from './PaymentHistory';

/** Study 16 plan-row icons: leaf = Free, medal = Pro, crown = Elite. */
const PLAN_ICONS: Record<string, typeof LeafIcon> = {
  FREE: LeafIcon,
  PRO: MedalIcon,
  ELITE: CrownIcon,
};

export type MembershipSection = 'current' | 'plans' | 'payments';

/**
 * Membership (study 16). One component, three sections; the route decides
 * the initial section so each alias keeps its intent:
 *  - /app/membership + /subscription → Current subscription
 *  - /plans → Offerings
 *  - /billing → Payments (the old Billing page also carried subscription
 *    info — it lives in the Current section here, one tab away)
 * Current entitlement comes from GET /user/me (profile is the source);
 * offerings come from the approved catalog (see membershipCatalog.ts —
 * Pro/Elite are planned, no prices shown).
 */
export default function Membership({ initialSection }: { initialSection: MembershipSection }) {
  const { user: cachedUser } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<MembershipSection>(initialSection);
  const [me, setMe] = useState<User | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([userApi.me(), userApi.credits()]).then(([meRes, creditsRes]) => {
      if (!alive) return;
      if (meRes.status === 'fulfilled' && meRes.value.data.data) setMe(meRes.value.data.data);
      if (creditsRes.status === 'fulfilled' && creditsRes.value.data.data) {
        setCredits(creditsRes.value.data.data);
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const user = me ?? cachedUser;
  const currentTier = user?.tier ?? 'FREE';
  const sub = user?.subscription ?? null;
  const trialDaysLeft =
    user?.isTrialActive && user?.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader title="Membership" subtitle="Your plan, the available offerings and your payments." />
      <Tabs
        ariaLabel="Membership sections"
        activeId={section}
        onChange={(id) => setSection(id as MembershipSection)}
        tabs={[
          { id: 'current', label: 'Current plan' },
          { id: 'plans', label: 'Plans' },
          { id: 'payments', label: 'Payments' },
        ]}
      />

      {section === 'current' && (
        <div className="space-y-4">
          {/* Study 16 composition: brand card, plan rows, gradient action. */}
          <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-4 shadow-[var(--shadow-card-soft)] sm:p-5">
            <div className="flex flex-wrap items-center gap-3.5">
              <Brand variant="tile" size={56} markOnly />
              <div className="min-w-0">
                <p className="text-[21px] font-extrabold tracking-tight">TradingBeast</p>
                <span className="mt-1 inline-flex rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[13px] font-bold text-[var(--color-accent)]">
                  Current plan · {currentTier.charAt(0) + currentTier.slice(1).toLowerCase()}
                </span>
              </div>
              {credits && (
                <p className="tnum ml-auto text-sm text-[var(--color-text-muted)]">
                  Balance: <strong className="text-[var(--color-text)]">{credits.balance} credits</strong>
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-2.5 shadow-[var(--shadow-card-soft)]">
            <div className="space-y-2">
              {PLAN_OFFERINGS.map((plan) => {
                const Icon = PLAN_ICONS[plan.id] ?? LeafIcon;
                const isCurrent = plan.id === currentTier;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSection('plans')}
                    aria-label={`View the ${plan.name} plan${isCurrent ? ' (your current plan)' : ''}`}
                    className="flex min-h-[64px] w-full items-center gap-3.5 rounded-[var(--radius-row)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[var(--shadow-row)] transition-transform active:scale-[0.99]"
                  >
                    <span className="text-[var(--color-accent)]">
                      <Icon size={27} />
                    </span>
                    <span className="flex-1 text-[19px] font-extrabold tracking-tight">{plan.name}</span>
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                        Current plan
                      </span>
                    )}
                    {plan.planned && (
                      <span className="rounded-full bg-[var(--color-warning-bg)] px-2.5 py-1 text-xs font-bold text-[var(--color-warning)]">
                        Coming soon
                      </span>
                    )}
                    <ChevronRightIcon size={20} className="shrink-0 text-[var(--color-text-faint)]" />
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full rounded-full text-white"
            style={{ background: 'var(--gradient-primary-action)' }}
            onClick={() => setSection('plans')}
          >
            View plan options
          </Button>
          <p className="text-center">
            <button
              type="button"
              className="text-[16px] font-bold text-[var(--color-accent)] underline underline-offset-4"
              onClick={() => navigate('/app/membership/payments')}
            >
              Payment history
            </button>
          </p>

          <Card elevated>
            {loading && !user ? (
              <Skeleton height={80} />
            ) : (
              <>
                {user?.isTrialActive ? (
                  <p className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm">
                    <strong>Pro trial active</strong> — {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}{' '}
                    remaining
                    {user.trialEndsAt
                      ? ` (ends ${new Date(user.trialEndsAt).toLocaleDateString()})`
                      : ''}
                    .
                  </p>
                ) : sub ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-3">
                      <dt className="text-[var(--color-text-muted)]">Status</dt>
                      <dd className="mt-0.5 font-semibold capitalize">{sub.status.toLowerCase()}</dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-3">
                      <dt className="text-[var(--color-text-muted)]">Tier</dt>
                      <dd className="mt-0.5 font-semibold">{sub.tier}</dd>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-3">
                      <dt className="text-[var(--color-text-muted)]">Renews / expires</dt>
                      <dd className="tnum mt-0.5 font-semibold">
                        {new Date(sub.expiresAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                    You are on the Free plan — 10 credits arrive every UTC day and never expire.
                    Paid tiers are planned but not launched yet (see the Plans tab).
                  </p>
                )}
              </>
            )}
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/app/membership/checkout')}>
              Submit a payment
            </Button>
          </div>
        </div>
      )}

      {section === 'plans' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {PLAN_OFFERINGS.map((plan) => {
              const isCurrent = plan.id === currentTier;
              const Icon = PLAN_ICONS[plan.id] ?? LeafIcon;
              return (
                <Card key={plan.id} className={isCurrent ? 'outline outline-2 outline-[var(--color-success)]' : ''}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold">
                      <span className="text-[var(--color-accent)]">
                        <Icon size={24} />
                      </span>
                      {plan.name}
                    </h2>
                    {isCurrent && (
                      <span className="rounded-full bg-[var(--color-success)] px-2.5 py-1 text-xs font-semibold text-white">
                        Current plan
                      </span>
                    )}
                    {plan.planned && (
                      <span className="rounded-full bg-[var(--color-warning)] px-2.5 py-1 text-xs font-semibold text-black">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xl font-bold">{plan.creditLine}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{plan.creditNote}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <span aria-hidden="true" className="mt-0.5 text-[var(--color-accent)]">✓</span>
                        <span>
                          {feature}
                          {plan.planned && (
                            <span className="text-[var(--color-text-muted)]"> (planned)</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
          <Card>
            <h2 className="font-bold">How credits work</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              One simple wallet powers every Radar run.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CREDIT_MODEL_NOTES.map((item) => (
                <div key={item.title} className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-4">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--color-text-muted)]">{item.text}</p>
                </div>
              ))}
            </div>
          </Card>
          <p className="text-sm text-[var(--color-text-muted)]">
            Paid tiers are not launched yet, so no prices are shown. If you have already arranged
            a manual payment, you can{' '}
            <button
              type="button"
              className="font-semibold text-[var(--color-link)] underline"
              onClick={() => navigate('/app/membership/checkout')}
            >
              submit it for verification
            </button>
            .
          </p>
        </div>
      )}

      {section === 'payments' && (
        <Card>
          <PaymentHistoryList />
        </Card>
      )}

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        TradingBeast is a market analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
