import { useCallback, useEffect, useState } from 'react';
import { adminApi, type Payment } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { FormField, Input, Select } from '@shared/components/FormField';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { Skeleton } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { StatusBadge } from '../components/ui';
import { downloadCsv, errorMessage, errorStatus, formatDate, formatMoney } from '../lib/format';

const LIMIT = 20;

/**
 * Payments — the pending queue only: GET /admin/payments/pending is the
 * sole list endpoint, and its meta carries {page, limit} with NO total, so
 * pagination is "has next page" based (a full page suggests more).
 * The old page filtered/sliced one unpaginated fetch client-side and
 * showed Approved/Rejected stats computed from a pending-only list — both
 * removed. Approve/Reject go through POST /admin/payments/verify with a
 * confirmation Modal. APPROVE returns 503 unless the server env
 * ENABLE_LEGACY_PAYMENT_APPROVAL=true; that 503 is surfaced honestly.
 */
export default function Payments() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ payment: Payment; action: 'APPROVE' | 'REJECT' } | null>(null);
  const [tier, setTier] = useState<'PRO' | 'ELITE'>('PRO');
  const [durationDays, setDurationDays] = useState(30);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPendingPayments({ page, limit: LIMIT });
      if (res.data.success) setPayments(res.data.data);
      setError('');
    } catch (e) {
      setError(errorMessage(e, 'Could not load pending payments.'));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const openConfirm = (payment: Payment, action: 'APPROVE' | 'REJECT') => {
    setConfirm({ payment, action });
    setTier('PRO');
    setDurationDays(30);
    setVerifyError('');
  };

  const doVerify = async () => {
    if (!confirm) return;
    setVerifying(true);
    setVerifyError('');
    try {
      await adminApi.verifyPayment(
        confirm.payment.id,
        confirm.action,
        confirm.action === 'APPROVE' ? tier : undefined,
        confirm.action === 'APPROVE' ? durationDays : undefined,
      );
      toast.success(confirm.action === 'APPROVE' ? 'Payment approved.' : 'Payment rejected.');
      setConfirm(null);
      void load();
    } catch (e) {
      if (confirm.action === 'APPROVE' && errorStatus(e) === 503) {
        setVerifyError('Approval is disabled on the server pending catalog verification (ENABLE_LEGACY_PAYMENT_APPROVAL is not enabled). The payment was NOT approved.');
      } else {
        setVerifyError(errorMessage(e, 'Verification failed.'));
      }
    } finally {
      setVerifying(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(`pending-payments-page-${page}.csv`, payments.map((p) => ({
      id: p.id, user: p.user.username || p.user.telegramId, amountMinor: p.amount, currency: p.currency,
      method: p.method, transactionId: p.transactionId, status: p.status, createdAt: p.createdAt,
    })));
  };

  const hasNext = payments.length === LIMIT;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        subtitle="Pending verification queue (oldest first). This is the only payment list the admin API exposes."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={payments.length === 0}>Export this page (CSV)</Button>
            <Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>
          </>
        }
      />

      <Card padded={false} className="overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading payments"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load()} />
        ) : payments.length === 0 ? (
          <EmptyState title="Queue is clear" message={page > 1 ? 'No more pending payments on this page.' : 'No payments are waiting for verification.'} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="tb-table">
                <thead><tr><th>User</th><th>Amount</th><th>Method</th><th>Transaction ID</th><th>Screenshot</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium">{p.user.firstName || 'Unknown'}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">@{p.user.username || p.user.telegramId}</p>
                      </td>
                      <td className="tnum font-medium">{formatMoney(p.amount, p.currency)}</td>
                      <td>{p.method}</td>
                      <td className="font-mono text-xs break-all">{p.transactionId}</td>
                      <td>
                        {p.screenshotUrl ? (
                          <Button variant="ghost" size="sm" onClick={() => setScreenshot(p.screenshotUrl!)}>View</Button>
                        ) : <span className="text-sm text-[var(--color-text-muted)]">None</span>}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="text-sm">{formatDate(p.createdAt)}</td>
                      <td>
                        <div className="flex gap-1">
                          <Button variant="secondary" size="sm" onClick={() => openConfirm(p, 'APPROVE')}>Approve</Button>
                          <Button variant="danger" size="sm" onClick={() => openConfirm(p, 'REJECT')}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3">
              <span className="text-sm text-[var(--color-text-muted)]">Page {page} · the API returns no total for this queue</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((v) => v - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={!hasNext} onClick={() => setPage((v) => v + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal open={Boolean(screenshot)} onClose={() => setScreenshot(null)} title="Payment screenshot">
        {screenshot && <img src={screenshot} alt="Payment screenshot submitted by the user" className="max-h-[70vh] w-full rounded-[var(--radius-md)] object-contain" />}
      </Modal>

      <Modal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.action === 'APPROVE' ? 'Approve payment' : 'Reject payment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm?.action === 'APPROVE' ? 'primary' : 'danger'} loading={verifying} onClick={() => void doVerify()}>
              {confirm?.action === 'APPROVE' ? 'Approve & activate' : 'Reject payment'}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className="space-y-4">
            <p>
              {confirm.action === 'APPROVE' ? 'Approve' : 'Reject'} the payment of{' '}
              <strong>{formatMoney(confirm.payment.amount, confirm.payment.currency)}</strong> from{' '}
              {confirm.payment.user.firstName || 'Unknown'} (@{confirm.payment.user.username || confirm.payment.user.telegramId}),
              transaction <span className="font-mono text-xs">{confirm.payment.transactionId}</span>?
            </p>
            {confirm.action === 'APPROVE' && (
              <>
                <FormField label="Tier to activate">
                  <Select value={tier} onChange={(e) => setTier(e.target.value as 'PRO' | 'ELITE')}>
                    <option value="PRO">Pro</option>
                    <option value="ELITE">Elite</option>
                  </Select>
                </FormField>
                <FormField label="Duration (days)" hint="Between 1 and 366 days.">
                  <Input type="number" min={1} max={366} value={durationDays} onChange={(e) => setDurationDays(Math.max(1, Math.min(366, parseInt(e.target.value, 10) || 30)))} />
                </FormField>
                <p className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] px-3 py-2 text-[var(--color-warning)]">
                  Note: approval is disabled on the server unless legacy payment approval is enabled for catalog verification — if so, this will return an error and nothing will be approved.
                </p>
              </>
            )}
            {verifyError && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] px-3 py-2 font-medium text-[var(--color-danger)]">{verifyError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}
