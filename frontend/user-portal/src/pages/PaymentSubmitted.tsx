import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CrownIcon,
  ListIcon,
} from '@shared/components/icons';
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
 * R3b: presentation rebuilt to the study — mint status card with the
 * Submitted → Verifying → Activated progress derived from the REAL payment
 * status, a payment-reference card (the server record id), and a gradient
 * membership card whose copy follows the actual status. The study's
 * decorative reference format (TBPAY-…) is not reproduced; the real record
 * id is shown instead.
 */

type StepState = 'done' | 'active' | 'rejected' | 'todo';

function stepStates(status: string): { label: string; state: StepState }[] {
  if (status === 'APPROVED') {
    return [
      { label: 'Submitted', state: 'done' },
      { label: 'Verifying', state: 'done' },
      { label: 'Activated', state: 'done' },
    ];
  }
  if (status === 'REJECTED' || status === 'EXPIRED') {
    return [
      { label: 'Submitted', state: 'done' },
      { label: 'Verifying', state: 'rejected' },
      { label: 'Activated', state: 'todo' },
    ];
  }
  return [
    { label: 'Submitted', state: 'done' },
    { label: 'Verifying', state: 'active' },
    { label: 'Activated', state: 'todo' },
  ];
}

function statusPillClasses(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'bg-[var(--color-success-bg)] text-[var(--color-success)]';
    case 'PENDING':
      return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]';
    case 'REJECTED':
    case 'EXPIRED':
      return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]';
    default:
      return 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]';
  }
}

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

  const steps = payment ? stepStates(payment.status) : [];

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
          {/* Status card (study 25): real status, real progress. */}
          <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] px-5 py-6 shadow-[var(--shadow-card-soft)]">
            <div className="text-center">
              <span
                aria-hidden="true"
                className={`mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full ${
                  payment.status === 'APPROVED'
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    : payment.status === 'PENDING'
                      ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                      : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
                }`}
              >
                {payment.status === 'APPROVED' ? (
                  <CheckIcon size={36} />
                ) : payment.status === 'PENDING' ? (
                  <ClockIcon size={36} />
                ) : (
                  <span className="text-3xl font-extrabold">!</span>
                )}
              </span>
              <p
                className={`mt-4 inline-flex rounded-full px-4 py-1.5 text-sm font-bold ${statusPillClasses(payment.status)}`}
              >
                {paymentStatusLabel(payment.status)}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-text-muted)]">
                {payment.status === 'PENDING'
                  ? 'We have received your payment and are verifying it now. Your account will be updated once verification is complete — submission is not approval.'
                  : payment.status === 'APPROVED'
                    ? 'This payment has been verified.'
                    : 'This payment is not pending. See your payment history for the full record.'}
              </p>
            </div>
            <ol className="mx-auto mt-6 flex max-w-md items-start" aria-label="Verification progress">
              {steps.map((step, i) => (
                <li key={step.label} className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                  <span className="flex w-[76px] flex-col items-center gap-1.5 text-center">
                    <span
                      aria-hidden="true"
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-extrabold ${
                        step.state === 'done'
                          ? 'text-white'
                          : step.state === 'active'
                            ? 'border-[3px] border-[var(--color-success)] bg-[var(--color-surface)]'
                            : step.state === 'rejected'
                              ? 'bg-[var(--color-danger)] text-white'
                              : 'bg-[var(--color-border)] text-white'
                      }`}
                      style={step.state === 'done' ? { background: 'var(--gradient-primary-action)' } : undefined}
                    >
                      {step.state === 'done' ? (
                        <CheckIcon size={16} />
                      ) : step.state === 'rejected' ? (
                        '✕'
                      ) : step.state === 'active' ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
                      ) : (
                        ''
                      )}
                    </span>
                    <span
                      className={`text-[12.5px] font-bold ${step.state === 'todo' ? 'text-[var(--color-text-faint)]' : ''}`}
                    >
                      {step.label}
                    </span>
                  </span>
                  {i < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="mt-[17px] h-[3px] flex-1 rounded bg-[var(--color-border)]"
                      style={
                        steps[i + 1].state === 'done' || step.state === 'done'
                          ? { background: 'var(--gradient-primary-action)' }
                          : undefined
                      }
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Payment reference + details. */}
          <Card className="flex items-center gap-3.5 py-4">
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
            >
              <ListIcon size={23} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-[var(--color-text-muted)]">Payment reference</p>
              <p className="tnum break-all text-[17px] font-extrabold tracking-tight">{payment.id}</p>
            </div>
          </Card>

          <Card>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Amount</dt>
                <dd className="tnum font-semibold">
                  {formatMinorUnits(payment.amount, payment.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
                <dt className="text-[var(--color-text-muted)]">Method</dt>
                <dd className="font-semibold">{paymentMethodLabel(payment.method)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
                <dt className="text-[var(--color-text-muted)]">Submitted</dt>
                <dd className="tnum font-semibold">
                  {new Date(payment.createdAt).toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
                <dt className="text-[var(--color-text-muted)]">Status</dt>
                <dd className="font-semibold">{paymentStatusLabel(payment.status)}</dd>
              </div>
              {payment.transactionId && (
                <div className="flex justify-between gap-4 border-t border-[var(--color-border-soft)] pt-2.5">
                  <dt className="text-[var(--color-text-muted)]">Transaction ID</dt>
                  <dd className="break-all text-right font-mono text-[13px] font-semibold">
                    {payment.transactionId}
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          {(payment.status === 'PENDING' || payment.status === 'APPROVED') && (
            <section
              aria-label="Membership upgrade"
              className="relative overflow-hidden rounded-[var(--radius-card-xl)] p-5 text-white shadow-[var(--shadow-hero)]"
              style={{ background: 'var(--gradient-session-hero)' }}
            >
              <div className="relative flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-white/15"
                >
                  <CrownIcon size={28} />
                </span>
                <div>
                  <h2 className="text-[20px] leading-snug font-extrabold tracking-tight">
                    {payment.status === 'PENDING'
                      ? 'Membership Upgrade In Progress'
                      : 'Payment Verified'}
                  </h2>
                  <p className="mt-1 text-sm text-white/90">
                    {payment.status === 'PENDING'
                      ? 'Your account will be activated once verification is complete.'
                      : 'This payment has been verified — see Membership for your current plan.'}
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full rounded-full text-white"
              style={{ background: 'var(--gradient-primary-action)' }}
              onClick={() => navigate('/app/membership/payments')}
            >
              <ClockIcon size={19} /> View payment history <ArrowRightIcon size={19} />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full rounded-full"
              onClick={() => navigate('/app/membership')}
            >
              ← Back to membership
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
