import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { userApi, type Payment } from '../services/api';
import {
  formatMinorUnits,
  paymentMethodLabel,
  paymentStatusLabel,
} from './PaymentHistory';

interface SubmittedState {
  paymentId?: string;
  status?: string;
  method?: string;
  amount?: number;
  currency?: string;
  submittedAt?: string;
}

/**
 * Payment Submitted (study 25). The pending state is confirmed from the
 * checkout response (navigation state) and/or the server payment history —
 * never assumed. Direct entry without a fresh submission checks history for
 * the most recent payment: a PENDING one shows the pending state; any other
 * status is shown as-is; and if nothing is found, the page says so plainly
 * instead of implying a payment was approved. Aliased at /payment/success
 * (the old route name — "success" here only ever meant "submitted").
 */
export default function PaymentSubmitted() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as SubmittedState | null) ?? null;
  const [latest, setLatest] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    userApi
      .getPayments(1, 1)
      .then((res) => {
        if (alive) setLatest(res.data.data?.[0] ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Prefer the server record (matched by id when we have one); fall back to
  // the checkout response state, then to the latest history entry.
  const fromState: Payment | null =
    state?.paymentId && state.method && typeof state.amount === 'number'
      ? {
          id: state.paymentId,
          amount: state.amount,
          currency: state.currency ?? 'USD',
          method: state.method,
          status: state.status ?? 'PENDING',
          createdAt: state.submittedAt ?? new Date().toISOString(),
        }
      : null;
  const payment =
    latest && fromState && latest.id === fromState.id
      ? latest
      : (fromState ?? latest);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Payment submitted" subtitle="Your payment is with the verification team." />

      {loading && !payment ? (
        <Skeleton height={160} />
      ) : !payment ? (
        <Card>
          <EmptyState
            title="No payment submission found"
            message="We could not find a payment submission on your account. If you just paid, submit it for verification first — nothing has been approved or recorded from this page."
            action={
              <Button onClick={() => navigate('/app/membership/checkout')}>
                Submit a payment
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card elevated>
            <div className="text-center">
              <p className="text-5xl" aria-hidden="true">
                {payment.status === 'PENDING' ? '🕐' : payment.status === 'APPROVED' ? '✅' : '⚠️'}
              </p>
              <p className="mt-3 inline-flex rounded-full bg-[var(--color-warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--color-warning)]">
                {paymentStatusLabel(payment.status)}
              </p>
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                {payment.status === 'PENDING'
                  ? 'We have received your payment and are verifying it now. Your account will be updated once verification is complete — submission is not approval.'
                  : payment.status === 'APPROVED'
                    ? 'This payment has been verified.'
                    : 'This payment is not pending. See your payment history for the full record.'}
              </p>
              <p className="tnum mt-4 text-sm text-[var(--color-text-muted)]">
                Submitted → Verifying → Activated
              </p>
            </div>
            <dl className="mt-5 space-y-2 border-t border-[var(--color-border)] pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Amount</dt>
                <dd className="tnum font-semibold">
                  {formatMinorUnits(payment.amount, payment.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Method</dt>
                <dd className="font-semibold">{paymentMethodLabel(payment.method)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Submitted</dt>
                <dd className="tnum font-semibold">
                  {new Date(payment.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Status</dt>
                <dd className="font-semibold">{paymentStatusLabel(payment.status)}</dd>
              </div>
            </dl>
          </Card>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => navigate('/app/membership/payments')}>
              View payment history
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => navigate('/app/membership')}
            >
              Back to membership
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
