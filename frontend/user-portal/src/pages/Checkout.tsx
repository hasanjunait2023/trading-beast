import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, FormField } from '@shared/components/FormField';
import { UnavailableState } from '@shared/components/UnavailableState';
import {
  ArrowRightIcon,
  CheckIcon,
  CrownIcon,
  HashIcon,
  ListIcon,
  LockIcon,
  SearchIcon,
  SendIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '@shared/components/icons';
import { ApiError, userApi, type PaymentMethod } from '../services/api';
import { isTelegram } from '../telegram';
import { formatMinorUnits } from './PaymentHistory';

/**
 * Payment Submission (study 24) — the existing manual payment flow, moved to
 * its own route. Semantics preserved from the previous Payments page and the
 * backend contract (POST /api/user/payment):
 *  - methods are exactly the server enum: BKASH, NAGAD, USDT;
 *  - the amount is entered in USD and submitted as INTEGER minor units;
 *  - a transaction/reference ID is required; the screenshot is an optional
 *    HTTPS URL per the API (the old file-upload control only created a local
 *    object URL that the server never received, so it is not carried over);
 *  - the create returns PENDING — submission is not approval.
 * No merchant destination is printed: none is configured in code or config
 * (the old page showed placeholder numbers), so the user sends the payment
 * through their chosen channel first, then records the reference here.
 * Inside Telegram, digital purchases require Telegram Stars, which is not
 * integrated — the honest host state is shown instead of a fake flow.
 * R3b: presentation rebuilt to the study — plan hero, section cards with
 * mint icon chips, radio payment methods, review-status steps and a
 * gradient submit action. The study's bKash/Nagad brand logos are not
 * reproduced (no brand assets in the repo); methods render as text radio
 * cards. The study's plan feature checks are replaced with the real
 * mechanics (manual verification, activation after review).
 */

const METHODS: { id: PaymentMethod; name: string; note: string }[] = [
  { id: 'BKASH', name: 'bKash', note: 'Manual verification' },
  { id: 'NAGAD', name: 'Nagad', note: 'Manual verification' },
  { id: 'USDT', name: 'USDT (TRC20)', note: 'Manual verification' },
];

function CardHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
      >
        {icon}
      </span>
      <h2 className="text-[17px] font-bold">{title}</h2>
    </div>
  );
}

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const inTelegramHost = isTelegram();
  const planParam = new URLSearchParams(location.search).get('plan');
  const planName =
    planParam === 'PRO' ? 'Pro' : planParam === 'ELITE' ? 'Elite' : null;

  const [method, setMethod] = useState<PaymentMethod>('BKASH');
  // Default preserved from the existing payment flow (USD 9.99).
  const [amountUsd, setAmountUsd] = useState('9.99');
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const amountNumber = parseFloat(amountUsd);
  const amountMinor = Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : NaN;
  const amountValid = Number.isInteger(amountMinor) && amountMinor > 0;
  const screenshotValid =
    screenshotUrl.trim() === '' || screenshotUrl.trim().startsWith('https://');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!transactionId.trim()) {
      setError('Transaction ID is required — use the complete ID from your payment confirmation.');
      return;
    }
    if (!amountValid) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    if (!screenshotValid) {
      setError('Screenshot URL must start with https:// (or leave it empty).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await userApi.submitPayment({
        amount: amountMinor,
        currency: 'USD',
        method,
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotUrl.trim() ? screenshotUrl.trim() : undefined,
      });
      navigate('/app/membership/payment-submitted', {
        replace: true,
        state: {
          paymentId: res.data.data?.paymentId,
          status: res.data.data?.status ?? 'PENDING',
          method,
          amount: amountMinor,
          currency: 'USD',
          submittedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That transaction ID has already been submitted. Check your payment history — duplicates are not recorded twice.');
      } else {
        setError(err instanceof Error ? err.message : 'Payment submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (inTelegramHost) {
    return (
      <div className="space-y-4">
        <PageHeader title="Submit Payment" subtitle="Membership purchase" />
        <UnavailableState
          title="Payments are not available inside Telegram yet"
          reason="Digital purchases inside Telegram must go through Telegram Stars, which TradingBeast has not integrated. No Stars charge will be made here. To submit a manual payment, open the web portal in your browser and sign in with a one-time code from the bot (/login)."
        />
        <Button variant="secondary" onClick={() => navigate('/app/membership')}>
          Back to Membership
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Submit Payment"
        subtitle="Complete your membership purchase and submit your payment for quick verification."
      />

      {/* Plan hero (study 24). */}
      <section
        aria-label="Membership plan"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <div className="relative">
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/15"
            >
              <CrownIcon size={28} />
            </span>
            <div>
              <p className="text-[13px] font-semibold tracking-wide text-white/85">Membership Plan</p>
              <p className="text-[26px] leading-tight font-extrabold tracking-tight">
                {planName ? `${planName} membership` : 'Membership payment'}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                <CheckIcon size={12} />
              </span>
              Manual verification
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                <CheckIcon size={12} />
              </span>
              Starts as Pending
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                <CheckIcon size={12} />
              </span>
              Activation after review
            </span>
          </div>
        </div>
      </section>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm">
            <p className="font-semibold text-[var(--color-danger)]">Could not submit</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <Card>
          <CardHeading icon={<ListIcon size={20} />} title="Order Details" />
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Plan</dt>
              <dd className="font-semibold">
                {planName ? `${planName} membership` : 'Membership payment'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
              <dt className="text-[var(--color-text-muted)]">Order Total</dt>
              <dd className="tnum font-semibold">
                {amountValid ? formatMinorUnits(amountMinor, 'USD') : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
              <dt className="text-[var(--color-text-muted)]">Review</dt>
              <dd className="font-semibold">Manual verification — starts as Pending</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Paid tiers are priced during verification against the offer you arranged — submitting
            this form records your payment for review; it does not activate a plan by itself.
          </p>
          <div className="mt-4">
            <FormField label="Amount (USD)" hint="Submitted to the server as integer minor units (cents).">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
                required
              />
            </FormField>
          </div>
        </Card>

        <Card>
          <CardHeading icon={<WalletIcon size={20} />} title="Select Payment Method" />
          <div className="mt-4 grid grid-cols-1 gap-2 min-[480px]:grid-cols-3" role="radiogroup" aria-label="Payment method">
            {METHODS.map((m) => {
              const selected = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2.5 rounded-[var(--radius-md)] border-2 p-3 text-left transition-colors ${
                    selected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-border-strong)]'
                    }`}
                  >
                    {selected && (
                      <span className="h-[11px] w-[11px] rounded-full bg-[var(--color-accent)]" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{m.name}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">{m.note}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeading icon={<HashIcon size={20} />} title="Transaction ID" />
          <div className="mt-4 space-y-4">
            <FormField
              label="Transaction ID"
              hint="Use the complete transaction ID from your payment confirmation."
            >
              <Input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter bKash / Nagad transaction ID"
                required
              />
            </FormField>
            <FormField
              label="Screenshot URL (optional)"
              hint="An https:// link to your payment screenshot, if you have one hosted."
            >
              <Input
                type="url"
                value={screenshotUrl}
                onChange={(e) => setScreenshotUrl(e.target.value)}
                placeholder="https://…"
              />
            </FormField>
          </div>
        </Card>

        {/* Review status explainer (study 24). */}
        <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-5 shadow-[var(--shadow-card-soft)]">
          <div className="flex items-start gap-3.5">
            <span aria-hidden="true" className="shrink-0 text-[var(--color-success)]">
              <ShieldCheckIcon size={40} />
            </span>
            <div>
              <h2 className="text-[18px] font-extrabold tracking-tight">
                Review Status: <span className="text-[var(--color-success)]">Under Verification</span>
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                After you submit, our team will verify your payment and activate your membership.
                You'll get a notification once it's confirmed. Submission alone does not activate
                anything.
              </p>
            </div>
          </div>
          <ol className="mt-5 flex items-start" aria-label="Verification steps">
            {[
              { icon: <SendIcon size={19} />, label: 'Payment Submitted', state: 'done' },
              { icon: <SearchIcon size={19} />, label: 'Under Review', state: 'todo' },
              { icon: <CheckIcon size={19} />, label: 'Membership Activated', state: 'todo' },
            ].map((step, i, arr) => (
              <li key={step.label} className={`flex items-start ${i < arr.length - 1 ? 'flex-1' : ''}`}>
                <span className="flex w-[92px] flex-col items-center gap-1.5 text-center">
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      step.state === 'done'
                        ? 'text-white'
                        : 'border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-faint)]'
                    }`}
                    style={step.state === 'done' ? { background: 'var(--gradient-primary-action)' } : undefined}
                  >
                    {step.icon}
                  </span>
                  <span className="text-[12px] leading-tight font-bold">{step.label}</span>
                </span>
                {i < arr.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`mt-[22px] h-[3px] flex-1 rounded ${i === 0 ? '' : 'bg-[var(--color-border)]'}`}
                    style={i === 0 ? { background: 'var(--gradient-primary-action)' } : undefined}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-2">
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full text-white"
            style={{ background: 'var(--gradient-primary-action)' }}
            loading={submitting}
            disabled={submitting}
          >
            <SendIcon size={19} /> Submit for verification <ArrowRightIcon size={19} />
          </Button>
          <Button
            type="button"
            size="lg"
            variant="ghost"
            className="w-full"
            disabled={submitting}
            onClick={() => navigate('/app/membership')}
          >
            Cancel
          </Button>
          <p className="flex items-center justify-center gap-1.5 pt-1 text-center text-[13px] text-[var(--color-text-muted)]">
            <LockIcon size={15} className="text-[var(--color-accent)]" />
            Your payment is safe and will be manually verified by the{' '}
            <strong className="text-[var(--color-accent)]">TradingBeast</strong> team.
          </p>
        </div>
      </form>
    </div>
  );
}
