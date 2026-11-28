import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, FormField } from '@shared/components/FormField';
import { UnavailableState } from '@shared/components/UnavailableState';
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
 */

const METHODS: { id: PaymentMethod; name: string; note: string }[] = [
  { id: 'BKASH', name: 'bKash', note: 'Manual verification' },
  { id: 'NAGAD', name: 'Nagad', note: 'Manual verification' },
  { id: 'USDT', name: 'USDT (TRC20)', note: 'Manual verification' },
];

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
        subtitle="Complete your membership purchase and submit your payment for verification."
      />

      <Card elevated>
        <h2 className="font-bold">Order details</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Plan</dt>
            <dd className="font-semibold">
              {planName ? `${planName} membership` : 'Membership payment'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Order total</dt>
            <dd className="tnum font-semibold">
              {amountValid ? formatMinorUnits(amountMinor, 'USD') : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-text-muted)]">Review</dt>
            <dd className="font-semibold">Manual verification — starts as Pending</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Paid tiers are priced during verification against the offer you arranged — submitting
          this form records your payment for review; it does not activate a plan by itself.
        </p>
      </Card>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm">
              <p className="font-semibold text-[var(--color-danger)]">Could not submit</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <FormField label="Payment method">
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={method === m.id}
                  onClick={() => setMethod(m.id)}
                  className={`rounded-[var(--radius-md)] border-2 p-3 text-left transition-colors ${
                    method === m.id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-[var(--color-text-muted)]">{m.note}</span>
                </button>
              ))}
            </div>
          </FormField>

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

          <FormField
            label="Transaction ID"
            hint="Use the complete transaction ID from your payment confirmation."
          >
            <Input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter the transaction / reference ID"
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

          <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] p-3 text-sm">
            <p className="font-semibold">Review status: Under verification</p>
            <p className="mt-1">
              After you submit, the team verifies your payment and activates your membership
              once it is confirmed. Submission alone does not activate anything.
            </p>
            <p className="tnum mt-2 text-[var(--color-text-muted)]">
              Steps: Payment submitted → Under review → Membership activated
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" className="flex-1" loading={submitting} disabled={submitting}>
              Submit for verification
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="flex-1"
              disabled={submitting}
              onClick={() => navigate('/app/membership')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

    </div>
  );
}
