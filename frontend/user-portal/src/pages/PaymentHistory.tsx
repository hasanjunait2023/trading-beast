import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { userApi, type Payment } from '../services/api';

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
      <div className="overflow-x-auto" role="region" aria-label="Payment history table — scroll horizontally on small screens" tabIndex={0}>
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Payment history</caption>
          <thead>
            <tr className="text-[var(--color-text-muted)]">
              <th scope="col" className="px-2 py-2 font-semibold">Date</th>
              <th scope="col" className="px-2 py-2 font-semibold">Method</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Amount</th>
              <th scope="col" className="px-2 py-2 font-semibold">Reference</th>
              <th scope="col" className="px-2 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]">
                <td className="tnum px-2 py-2.5">
                  {new Date(p.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </td>
                <td className="px-2 py-2.5">{paymentMethodLabel(p.method)}</td>
                <td className="tnum px-2 py-2.5 text-right font-semibold">
                  {formatMinorUnits(p.amount, p.currency)}
                </td>
                <td className="px-2 py-2.5">
                  {p.transactionId ? (
                    revealed.has(p.id) ? (
                      <button
                        type="button"
                        className="break-all text-left font-mono text-[13px] underline"
                        onClick={() => toggleReveal(p.id)}
                        aria-label={`Hide reference for payment on ${new Date(p.createdAt).toLocaleDateString()}`}
                      >
                        {p.transactionId}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-[13px] font-semibold text-[var(--color-link)] underline"
                        onClick={() => toggleReveal(p.id)}
                        aria-label="Show payment reference"
                      >
                        Show reference
                      </button>
                    )
                  ) : (
                    <span className="text-[var(--color-text-muted)]">—</span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses(p.status)}`}
                  >
                    {paymentStatusLabel(p.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div className="space-y-4">
      <PageHeader
        title="Payment History"
        subtitle="Manual payments and their verification status."
        actions={
          <Button onClick={() => navigate('/app/membership/checkout')}>New payment</Button>
        }
      />
      <Card>
        <PaymentHistoryList />
      </Card>
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
