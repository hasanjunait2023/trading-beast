import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Receipt, LayoutDashboard, SearchCheck, BadgeCheck, BellRing } from 'lucide-react';

export interface SubmittedPayment {
  amount: number; // cents, as submitted to the API
  currency: string;
  method: string;
  transactionId: string;
  submittedAt: string; // ISO string
}

const NEXT_STEPS = [
  {
    icon: SearchCheck,
    title: 'Admin verification',
    text: 'An admin checks your transaction ID and payment screenshot against the payment records.'
  },
  {
    icon: BadgeCheck,
    title: 'Plan & credits updated',
    text: 'Once verified, your tier is activated and any plan credits are applied to your wallet.'
  },
  {
    icon: BellRing,
    title: 'Track it in Billing',
    text: 'Your receipt moves from Pending to Verified in Billing — check there any time for the latest status.'
  }
];

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

export default function PaymentSuccess() {
  const location = useLocation();
  const submitted = (location.state as { payment?: SubmittedPayment } | null)?.payment;

  // Draw-in animation for the confirmation check mark.
  const checkProgress = useMotionValue(0);
  useEffect(() => {
    const controls = animate(checkProgress, 1, { delay: 0.25, duration: 0.45, ease: 'easeOut' });
    return () => controls.stop();
  }, [checkProgress]);

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      {/* Animated confirmation mark */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="w-20 h-20 rounded-full bg-[var(--color-success)]/15 flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" aria-hidden="true">
            <motion.path
              d="M4 12.5 L9.5 18 L20 6.5"
              stroke="var(--color-success)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pathLength: checkProgress }}
            />
          </svg>
        </motion.div>
        <h1 className="font-display text-2xl font-bold mt-5">Payment submitted</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Thanks — we received your payment details. It is now waiting for verification.
        </p>
      </div>

      {/* Submitted details */}
      {submitted ? (
        <div className="card">
          <h2 className="font-medium mb-4">Submission summary</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Amount</dt>
              <dd className="font-display font-bold">
                ${(submitted.amount / 100).toFixed(2)} {submitted.currency}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Method</dt>
              <dd className="font-medium">{methodLabel(submitted.method)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Transaction ID</dt>
              <dd className="font-mono font-medium break-all text-right">{submitted.transactionId}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Submitted</dt>
              <dd className="font-medium">
                {new Date(submitted.submittedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-[var(--color-text-muted)]">Status</dt>
              <dd>
                <span className="badge badge-pending">Pending verification</span>
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Your latest submission is being verified. You can follow its status any time in Billing.
          </p>
        </div>
      )}

      {/* What happens next */}
      <div className="card">
        <h2 className="font-medium mb-4">What happens next</h2>
        <ol className="space-y-4">
          {NEXT_STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-5 h-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {i + 1}. {step.title}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/billing" className="btn btn-primary flex-1">
          <Receipt className="w-4 h-4" />
          Track in Billing
        </Link>
        <Link to="/dashboard" className="btn btn-secondary flex-1">
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Payments are for market analysis tool access only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
