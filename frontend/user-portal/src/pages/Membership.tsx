import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Tabs } from '@shared/components/Tabs';
import { Skeleton } from '@shared/components/Skeleton';
import { Brand } from '@shared/components/Brand';
import {
  CheckIcon,
  ChevronRightIcon,
  CoinsIcon,
  CrownIcon,
  LeafIcon,
  MedalIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { userApi, type CreditsData, type User } from '../services/api';
import { PLAN_OFFERINGS, CREDIT_MODEL_NOTES } from './membershipCatalog';
import { buildComparison } from '../utils/planComparison';
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
  const location = useLocation();
  // Callers (e.g. the insufficient-credits path in Run Radar) can land the
  // user directly on the Plans section via navigation state.
  const stateSection = (location.state as { section?: MembershipSection } | null)?.section;
  const [section, setSection] = useState<MembershipSection>(stateSection ?? initialSection);
  const [me, setMe] = useState<User | null>(null);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    if (stateSection) setSection(stateSection);
  }, [stateSection]);

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
        <div className="space-y-5">
          {/* Conversion hero — honest framing: free is live, paid tiers are
              planned, and nothing is ever charged automatically. */}
          <section
            className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)] sm:p-7"
            style={{ background: 'var(--gradient-session-hero)' }}
          >
            <h2 className="max-w-[520px] text-[26px] leading-tight font-extrabold tracking-tight sm:text-[30px]">
              Never miss a session worth trading
            </h2>
            <p className="mt-2 max-w-[560px] text-[15px] leading-relaxed text-white/85">
              Free already covers every session with 10 credits a day. Pro and
              Elite are on the way with bigger credit grants and the advanced
              toolkit — no prices are published yet, and nothing is ever
              charged automatically.
            </p>
            {credits && (
              <p className="tnum mt-4 inline-flex rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-bold">
                Your balance: {credits.balance} credits · {currentTier.charAt(0) + currentTier.slice(1).toLowerCase()} plan
              </p>
            )}
          </section>

          <div className="grid gap-4 pt-2 md:grid-cols-3">
            {PLAN_OFFERINGS.map((plan) => {
              const isCurrent = plan.id === currentTier;
              const isPopular = plan.id === 'PRO';
              const Icon = PLAN_ICONS[plan.id] ?? LeafIcon;
              return (
                <div key={plan.id} className="relative">
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-white uppercase shadow-[var(--shadow-row)]" style={{ background: 'var(--gradient-primary-action)' }}>
                      Most popular
                    </span>
                  )}
                  <Card
                    className={`flex h-full flex-col ${
                      isPopular
                        ? 'outline outline-2 outline-[var(--color-accent)]'
                        : isCurrent
                          ? 'outline outline-2 outline-[var(--color-success)]'
                          : ''
                    }`}
                  >
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
                      {plan.planned && !isCurrent && (
                        <span className="rounded-full bg-[var(--color-warning)] px-2.5 py-1 text-xs font-semibold text-black">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xl font-bold">{plan.creditLine}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{plan.creditNote}</p>
                    <ul className="mt-4 flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckIcon size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                          <span>
                            {feature}
                            {plan.planned && (
                              <span className="text-[var(--color-text-muted)]"> (planned)</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5">
                      {isCurrent ? (
                        <Button variant="secondary" className="w-full" disabled>
                          Your current plan
                        </Button>
                      ) : plan.planned ? (
                        <>
                          <Button
                            className="w-full text-white"
                            style={{ background: 'var(--gradient-primary-action)' }}
                            onClick={() => navigate(`/app/membership/checkout?plan=${plan.id}`)}
                          >
                            Submit a manual payment
                          </Button>
                          <p className="mt-2 text-center text-xs text-[var(--color-text-muted)]">
                            {plan.name} hasn't launched with public pricing yet —
                            payments are reviewed manually before anything activates.
                          </p>
                        </>
                      ) : (
                        <p className="text-center text-sm text-[var(--color-text-muted)]">
                          Included with every account, free forever.
                        </p>
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>

          {/* Feature comparison — built from the catalog's real feature
              lists only (utils/planComparison). */}
          <Card elevated>
            <h2 className="text-lg font-extrabold tracking-tight">Compare plans</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 pr-3 text-left font-semibold text-[var(--color-text-muted)]">
                      Feature
                    </th>
                    {PLAN_OFFERINGS.map((plan) => (
                      <th
                        key={plan.id}
                        scope="col"
                        className={`px-3 py-2 text-center font-extrabold ${
                          plan.id === 'PRO' ? 'bg-[var(--color-mint-wash)] text-[var(--color-accent)]' : ''
                        }`}
                      >
                        {plan.name}
                        {plan.planned && (
                          <span className="block text-[11px] font-semibold text-[var(--color-text-muted)]">
                            planned
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {buildComparison(PLAN_OFFERINGS).map((row) => (
                    <tr key={row.feature} className="border-t border-[var(--color-border-soft)]">
                      <th scope="row" className="py-2.5 pr-3 text-left font-medium">
                        {row.feature}
                      </th>
                      {row.included.map((included, i) => (
                        <td
                          key={PLAN_OFFERINGS[i].id}
                          className={`px-3 py-2.5 text-center ${
                            PLAN_OFFERINGS[i].id === 'PRO' ? 'bg-[var(--color-mint-wash)]' : ''
                          }`}
                        >
                          {included ? (
                            <CheckIcon size={17} className="inline text-[var(--color-accent)]" aria-label="Included" />
                          ) : (
                            <span className="text-[var(--color-text-faint)]" aria-label="Not included">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Trust row — the real mechanics, stated plainly. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] p-4">
              <ShieldCheckIcon size={24} className="shrink-0 text-[var(--color-accent)]" />
              <div>
                <p className="font-bold">Verified by a person</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  Every payment is reviewed manually before a plan activates.
                  No instant charges, no auto-renew surprises.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] p-4">
              <CoinsIcon size={24} className="shrink-0 text-[var(--color-accent)]" />
              <div>
                <p className="font-bold">Failed runs refunded</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  If a Radar run fails on our side, its credits return to your
                  wallet automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] p-4">
              <WalletIcon size={24} className="shrink-0 text-[var(--color-accent)]" />
              <div>
                <p className="font-bold">One wallet everywhere</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
                  The Telegram bot, Mini App and this portal share one credit
                  balance — and credits never expire.
                </p>
              </div>
            </div>
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
        </div>
      )}

      {section === 'payments' && (
        <Card>
          <PaymentHistoryList />
        </Card>
      )}

      {/* Sticky upgrade CTA (Conversion chapter) — free accounts only.
          Routes into the existing honest checkout flow; Pro is labelled
          planned because no public pricing exists yet. */}
      {currentTier === 'FREE' && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-[var(--radius-card-xl)] p-4 text-white shadow-[var(--shadow-hero)]" style={{ background: 'var(--gradient-session-hero)' }}>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold tracking-tight">You're on the Free plan</p>
            <p className="text-sm text-white/85">
              Pro is coming with +300 credits a month, advanced alerts and the
              trading journal.
            </p>
          </div>
          {section === 'plans' ? (
            <Button
              className="bg-white font-bold text-[var(--color-accent)]"
              onClick={() => navigate('/app/membership/checkout?plan=PRO')}
            >
              Submit a manual payment
            </Button>
          ) : (
            <Button
              className="bg-white font-bold text-[var(--color-accent)]"
              onClick={() => setSection('plans')}
            >
              View Pro plan
            </Button>
          )}
        </div>
      )}

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        TradingBeast is a market analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
