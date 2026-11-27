import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi, Payment } from '../services/api';
import {
  Receipt,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle
} from 'lucide-react';

function isVerified(status: string) {
  return status === 'APPROVED' || status === 'VERIFIED';
}

function statusBadge(status: string) {
  if (isVerified(status)) {
    return (
      <span className="badge badge-approved">
        <CheckCircle className="w-3 h-3 mr-1" /> Verified
      </span>
    );
  }
  switch (status) {
    case 'PENDING':
      return (
        <span className="badge badge-pending">
          <Clock className="w-3 h-3 mr-1" /> Pending
        </span>
      );
    case 'REJECTED':
      return (
        <span className="badge badge-rejected">
          <XCircle className="w-3 h-3 mr-1" /> Rejected
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="badge badge-rejected">
          <XCircle className="w-3 h-3 mr-1" /> Expired
        </span>
      );
    default:
      return <span className="badge">{status}</span>;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function methodLabel(method: string) {
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

/** Submitted → (Under review) → Verified / Rejected / Expired */
function StatusTimeline({ payment }: { payment: Payment }) {
  const verified = isVerified(payment.status);
  const finished = verified || payment.status === 'REJECTED' || payment.status === 'EXPIRED';

  const steps = [
    {
      label: 'Submitted',
      date: payment.createdAt,
      state: 'done' as const,
      icon: Send
    },
    ...(payment.status === 'PENDING'
      ? [
          {
            label: 'Under review',
            date: null as string | null,
            state: 'active' as const,
            icon: Clock
          }
        ]
      : []),
    {
      label: verified
        ? 'Verified'
        : payment.status === 'REJECTED'
          ? 'Rejected'
          : payment.status === 'EXPIRED'
            ? 'Expired'
            : 'Verified',
      date: verified ? payment.verifiedAt ?? payment.updatedAt ?? null : finished ? payment.updatedAt ?? null : null,
      state: verified ? ('done' as const) : finished ? ('failed' as const) : ('upcoming' as const),
      icon: verified ? CheckCircle : finished ? XCircle : CheckCircle
    }
  ];

  return (
    <div className="flex items-start mt-4" aria-label={`Payment status: ${payment.status}`}>
      {steps.map((step, i) => (
        <div key={step.label} className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center text-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                step.state === 'done'
                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                  : step.state === 'failed'
                    ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                    : step.state === 'active'
                      ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] animate-pulse'
                      : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
              }`}
            >
              <step.icon className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium mt-1.5 whitespace-nowrap">{step.label}</p>
            {step.date && (
              <p className="text-[11px] text-[var(--color-text-muted)] whitespace-nowrap">
                {new Date(step.date).toLocaleDateString()}
              </p>
            )}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mt-4 rounded ${
                steps[i + 1].state === 'done' || steps[i + 1].state === 'failed'
                  ? 'bg-[var(--color-success)]/40'
                  : 'bg-[var(--color-border)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-32 rounded bg-[var(--color-surface-elevated)]" />
            <div className="h-6 w-24 rounded bg-[var(--color-surface-elevated)]" />
          </div>
          <div className="grid grid-2 md:grid-4 gap-3">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-12 rounded-lg bg-[var(--color-surface-elevated)]" />
            ))}
          </div>
          <div className="h-8 w-2/3 rounded bg-[var(--color-surface-elevated)] mt-5" />
        </div>
      ))}
    </div>
  );
}

export default function Billing() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await userApi.getPayments();
      if (res.data.success) setPayments(res.data.data);
    } catch {
      setError('Could not load your payment history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing</h1>
          <p className="text-[var(--color-text-muted)]">Your payment history and verification status</p>
        </div>
        <Link to="/payments" className="btn btn-primary">
          <CreditCard className="w-4 h-4" />
          New Payment
        </Link>
      </div>

      {error && (
        <div className="card border-[var(--color-danger)]/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchPayments} className="btn btn-secondary btn-sm">
              Retry
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <BillingSkeleton />
      ) : payments.length === 0 && !error ? (
        <div className="card text-center py-12">
          <Receipt className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)] opacity-60" />
          <p className="font-medium">No payments yet</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 mb-5">
            When you submit a payment, its receipt and verification status will appear here.
          </p>
          <Link to="/payments" className="btn btn-primary">
            <CreditCard className="w-4 h-4" />
            Submit your first payment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <article key={payment.id} className="card">
              {/* Receipt header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-dashed border-[var(--color-border)]">
                <div>
                  <p className="font-display text-xl font-bold">
                    ${(payment.amount / 100).toFixed(2)}{' '}
                    <span className="text-sm font-medium text-[var(--color-text-muted)]">{payment.currency}</span>
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    via {methodLabel(payment.method)} · {formatDate(payment.createdAt)}
                  </p>
                </div>
                {statusBadge(payment.status)}
              </div>

              {/* Receipt details */}
              <dl className="grid grid-2 md:grid-4 gap-3 mt-4 text-sm">
                <div className="p-3 bg-[var(--color-bg)] rounded-lg">
                  <dt className="text-[var(--color-text-muted)]">Method</dt>
                  <dd className="font-medium mt-0.5">{methodLabel(payment.method)}</dd>
                </div>
                <div className="p-3 bg-[var(--color-bg)] rounded-lg">
                  <dt className="text-[var(--color-text-muted)]">Transaction ID</dt>
                  <dd className="font-mono font-medium mt-0.5 break-all">{payment.transactionId || '—'}</dd>
                </div>
                <div className="p-3 bg-[var(--color-bg)] rounded-lg">
                  <dt className="text-[var(--color-text-muted)]">Submitted</dt>
                  <dd className="font-medium mt-0.5">{new Date(payment.createdAt).toLocaleDateString()}</dd>
                </div>
                <div className="p-3 bg-[var(--color-bg)] rounded-lg">
                  <dt className="text-[var(--color-text-muted)]">Verified</dt>
                  <dd className="font-medium mt-0.5">
                    {isVerified(payment.status) && payment.verifiedAt
                      ? new Date(payment.verifiedAt).toLocaleDateString()
                      : '—'}
                  </dd>
                </div>
              </dl>

              <StatusTimeline payment={payment} />

              {payment.status === 'REJECTED' && (
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  This payment could not be verified. Double-check the transaction ID and screenshot, then
                  submit again from Payments — or contact support via Help.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Payments are for market analysis tool access only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
