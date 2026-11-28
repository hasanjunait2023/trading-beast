import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import {
  ArrowRightIcon,
  CardIcon,
  CheckIcon,
  ClockIcon,
  CoinsIcon,
  WalletIcon,
} from '@shared/components/icons';
import { userApi, type Payment } from '../services/api';

/** Study 23 method tiles: wallet for the mobile-money methods, coins for
 *  USDT, card as the generic fallback. */
function methodIcon(method: string): ComponentType<{ size?: number }> {
  switch (method) {
    case 'BKASH':
    case 'NAGAD':
      return WalletIcon;
    case 'USDT':
      return CoinsIcon;
    default:
      return CardIcon;
  }
}

/**
 * Payment History (study 23). Paginated GET /user/payments (meta.page /
 * meta.limit). Amounts are integer minor units, formatted by currency.
 * Sensitive references (transaction IDs) are hidden by default and revealed
 * only on explicit request. Used standalone at /app/membership/payments and
 * /payments, and embedded in the Membership "Payments" tab (the old Billing
 * page's history view).
 */

const PAGE_SIZE = 10;

export function formatMinorUnits(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case 'BKASH':
      return 'bKash';
    case 'NAGAD':
      return 'Nagad';
    case 'USDT':
      return 'USDT (TRC20)';
    default:
      return method;
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pending verification';
    case 'APPROVED':
      return 'Verified';
    case 'REJECTED':
      return 'Rejected';
    case 'EXPIRED':
      return 'Expired';
    default:
      return status;
  }
}

function statusClasses(status: string): string {
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

export function PaymentHistoryList() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await userApi.getPayments(p, PAGE_SIZE);
      setPayments(res.data.data ?? []);
      setError('');
    } catch {
      setError('Could not load your payment history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading && payments.length === 0) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading payments">
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    );
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => void load(page)} />;
  }
  if (payments.length === 0 && page === 1) {
    return (
      <EmptyState
        title="No payments yet"
        message="Payments you submit for manual verification will appear here with their status."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2" aria-label="Payment history">
        {payments.map((p) => {
          const Icon = methodIcon(p.method);
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-[var(--radius-row)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3.5 py-3 shadow-[var(--shadow-row)]"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
              >
                <Icon size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="tnum text-[15px] font-bold">
                  {new Date(p.createdAt).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-[13px] text-[var(--color-text-muted)]">
                  {paymentMethodLabel(p.method)}
                  {p.transactionId &&
                    (revealed.has(p.id) ? (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="break-all text-left font-mono text-[12px] underline"
                          onClick={() => toggleReveal(p.id)}
                          aria-label={`Hide reference for payment on ${new Date(p.createdAt).toLocaleDateString()}`}
                        >
                          {p.transactionId}
                        </button>
                      </>
                    ) : (
                      <>
                        {' · '}
                        <button
                          type="button"
                          className="font-semibold text-[var(--color-link)] underline"
                          onClick={() => toggleReveal(p.id)}
                          aria-label="Show payment reference"
                        >
                          Show reference
                        </button>
                      </>
                    ))}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tnum text-[16px] font-extrabold">
                  {formatMinorUnits(p.amount, p.currency)}
                </p>
                <p className="text-[12px] text-[var(--color-text-muted)]">{p.currency}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${statusClasses(p.status)}`}
              >
                {p.status === 'APPROVED' ? (
                  <CheckIcon size={13} />
                ) : p.status === 'PENDING' ? (
                  <ClockIcon size={13} />
                ) : (
                  <span aria-hidden="true">✕</span>
                )}
                {paymentStatusLabel(p.status)}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          ← Previous
        </Button>
        <span className="tnum text-sm text-[var(--color-text-muted)]">Page {page}</span>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading || payments.length < PAGE_SIZE}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </div>
      {payments.length === 0 && page > 1 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          This page is empty — go back to the previous page.
        </p>
      )}
    </div>
  );
}

export default function PaymentHistoryPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Payment History"
        subtitle="Track all your transactions and their status."
      />
      <PaymentHistoryList />
      <Button
        size="lg"
        className="w-full rounded-full text-white"
        style={{ background: 'var(--gradient-primary-action)' }}
        onClick={() => navigate('/app/membership/checkout')}
      >
        <CardIcon size={20} /> Make a Payment Now <ArrowRightIcon size={19} />
      </Button>
      <p className="text-sm text-[var(--color-text-muted)]">
        Looking for your current subscription? See{' '}
        <button
          type="button"
          className="font-semibold text-[var(--color-link)] underline"
          onClick={() => navigate('/app/membership')}
        >
          Membership
        </button>
        .
      </p>
    </div>
  );
}
