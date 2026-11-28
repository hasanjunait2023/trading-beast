import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Skeleton } from '@shared/components/Skeleton';
import { CheckIcon, CrownIcon, GiftIcon, LeafIcon, MedalIcon } from '@shared/components/icons';
import { CREDIT_MODEL_NOTES, PLAN_OFFERINGS } from '@shared/membership/catalog';
import { userApi, type CreditsData } from '../services/api';
import { useAuth } from '../hooks/useAuth';

/**
 * Membership (conversion chapter). Plan comparison from the approved
 * catalog (shared/membership/catalog — same source as the portal): Free
 * is live; Pro/Elite are labelled Planned with NO prices, because none are
 * approved yet. Pro carries the "Most popular" emphasis. The one real,
 * working path to Pro today is referrals (7 days of Pro for both sides
 * per credited referral) — that is the sticky CTA for free users.
 */

const PLAN_ICONS = { FREE: LeafIcon, PRO: MedalIcon, ELITE: CrownIcon } as const;

export default function Membership({
  onOpenReferral,
  onOpenCredits,
}: {
  onOpenReferral: () => void;
  onOpenCredits: () => void;
}) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditsData | null>(null);

  const loadCredits = useCallback(async () => {
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
    } catch {
      /* hero simply omits the balance until a read succeeds */
    }
  }, []);

  useEffect(() => { void loadCredits(); }, [loadCredits]);

  const currentTier = user?.tier ?? 'FREE';
  const isPro = Boolean(user?.isProActive || user?.isTrialActive);
  const planLabel = user?.isTrialActive
    ? 'Pro trial'
    : `${currentTier.charAt(0)}${currentTier.slice(1).toLowerCase()} plan`;

  return (
    <div className="space-y-4 px-4">
      <div>
        <h1 className="text-[26px] font-extrabold tracking-tight">Membership</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          One wallet, every feature — pick the plan that matches how you trade.
        </p>
      </div>

      {/* Current plan hero. */}
      <section
        aria-label="Your current plan"
        className="rounded-[var(--radius-hero)] p-4 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--grad-hero)' }}
      >
        <p className="text-sm opacity-80">Current plan</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2.5 text-[26px] font-extrabold tracking-tight">
          {planLabel}
          {user?.isTrialActive && user.trialEndsAt && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold">
              Ends {new Date(user.trialEndsAt).toLocaleDateString()}
            </span>
          )}
        </p>
        {credits ? (
          <p className="tnum mt-1 text-[15px] text-white/90">
            Wallet balance: <strong>{credits.balance} credits</strong> · +{credits.dailyGrant}/day ·
            one Radar run = {credits.radarCost} credits
          </p>
        ) : (
          <Skeleton height={20} width="70%" className="mt-2 opacity-40" />
        )}
      </section>

      {/* Plan comparison (approved catalog — no invented prices). */}
      <div className="space-y-3">
        {PLAN_OFFERINGS.map((plan) => {
          const Icon = PLAN_ICONS[plan.id];
          const isCurrent = plan.id === currentTier || (plan.id === 'PRO' && Boolean(user?.isTrialActive));
          const popular = plan.id === 'PRO';
          return (
            <article
              key={plan.id}
              aria-label={`${plan.name} plan${isCurrent ? ' (your current plan)' : ''}`}
              className={`relative rounded-[var(--radius-card-xl)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-row)] ${
                popular ? 'outline-2 outline-[var(--color-accent)]' : ''
              }`}
              style={popular ? { outlineStyle: 'solid' } : undefined}
            >
              {popular && (
                <span
                  className="absolute -top-3 right-4 rounded-full px-3 py-1 text-[11.5px] font-extrabold tracking-wide text-white shadow-[var(--shadow-row)]"
                  style={{ background: 'var(--gradient-primary-action)' }}
                >
                  MOST POPULAR
                </span>
              )}
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-[var(--color-accent)]">
                  <Icon size={26} />
                </span>
                <h2 className="flex-1 text-[20px] font-extrabold tracking-tight">{plan.name}</h2>
                {isCurrent ? (
                  <span className="rounded-full bg-[var(--color-success-bg)] px-3 py-1 text-[12px] font-bold text-[var(--color-success)]">
                    Current plan
                  </span>
                ) : plan.planned ? (
                  <span className="rounded-full bg-[var(--color-unavailable-bg)] px-3 py-1 text-[12px] font-bold text-[var(--color-unavailable-text)]">
                    Coming soon
                  </span>
                ) : null}
              </div>
              <p className="tnum mt-2 text-[17px] font-extrabold text-[var(--color-accent)]">
                {plan.creditLine}
              </p>
              <p className="text-[13px] text-[var(--color-text-muted)]">{plan.creditNote}</p>
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-[14.5px] text-[var(--color-text)]">
                    <CheckIcon size={17} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                    {f}
                  </li>
                ))}
              </ul>
              {plan.planned && !isCurrent && (
                <p className="mt-3 text-[13px] text-[var(--color-text-muted)]">
                  Paid plans aren't on sale yet — no price is shown until the launch catalog is
                  final. Your daily credits keep stacking in the meantime.
                </p>
              )}
            </article>
          );
        })}
      </div>

      {/* How credits work (approved notes, condensed). */}
      <Card>
        <h2 className="text-base font-bold">How credits work</h2>
        <dl className="mt-2 space-y-2.5">
          {CREDIT_MODEL_NOTES.slice(0, 4).map((note) => (
            <div key={note.title}>
              <dt className="text-sm font-bold">{note.title}</dt>
              <dd className="text-sm text-[var(--color-text-muted)]">{note.text}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Sticky conversion CTA. For free users the honest, working upgrade
          path today is referrals (7 days of Pro for both sides); Pro users
          are routed to their wallet instead. */}
      <div className="sticky bottom-[92px] z-20 -mx-1 px-1 pb-1 pt-2 [background:linear-gradient(to_top,var(--color-bg)_75%,transparent)]">
        {isPro ? (
          <button
            type="button"
            onClick={onOpenCredits}
            className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-[17px] font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
            style={{ background: 'var(--gradient-primary-action)' }}
          >
            View your credits
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenReferral}
            className="flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-[17px] font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
            style={{ background: 'var(--gradient-primary-action)' }}
          >
            <GiftIcon size={22} />
            Earn 7 days of Pro free — invite friends
          </button>
        )}
      </div>
    </div>
  );
}
