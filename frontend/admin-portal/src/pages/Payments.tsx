import { useState, useEffect } from 'react';
import { adminApi, Payment } from '../services/api';
import { Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, ImageIcon, FileText, Eye, Download, CreditCard, RefreshCw } from 'lucide-react';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const;
const METHOD_OPTIONS = ['ALL', 'BKASH', 'NAGAD', 'USDT', 'STRIPE', 'MANUAL'] as const;

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'>('PENDING');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'BKASH' | 'NAGAD' | 'USDT' | 'STRIPE' | 'MANUAL'>('ALL');
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState<{ id: string; action: 'APPROVE' | 'REJECT'; tier: 'PRO' | 'ELITE'; duration: number } | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, methodFilter, search]);

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPendingPayments();
      if (res.data.success) {
        let filtered = res.data.data;

        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter((p: Payment) =>
            p.user.telegramId.includes(s) ||
            p.user.username?.toLowerCase().includes(s) ||
            p.user.firstName?.toLowerCase().includes(s) ||
            p.transactionId.toLowerCase().includes(s)
          );
        }
        if (statusFilter !== 'ALL') {
          filtered = filtered.filter((p: Payment) => p.status === statusFilter);
        }
        if (methodFilter !== 'ALL') {
          filtered = filtered.filter((p: Payment) => p.method === methodFilter);
        }

        setTotal(filtered.length);
        setTotalPages(Math.ceil(filtered.length / 20));
        setPayments(filtered.slice((page - 1) * 20, page * 20));
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    if (action === 'APPROVE') {
      setVerifyingPayment({ id: paymentId, action, tier: 'PRO', duration: 30 });
    } else {
      try {
        await adminApi.verifyPayment(paymentId, 'REJECT');
        fetchPayments();
      } catch (error) {
        console.error('Failed to reject payment:', error);
      }
    }
  };

  const handleConfirmVerify = async () => {
    if (!verifyingPayment) return;
    try {
      await adminApi.verifyPayment(
        verifyingPayment.id,
        verifyingPayment.action,
        verifyingPayment.tier,
        verifyingPayment.duration
      );
      setVerifyingPayment(null);
      fetchPayments();
    } catch (error) {
      console.error('Failed to verify payment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="badge badge-approved"><CheckCircle className="w-3 h-3 mr-1" /> Approved</span>;
      case 'REJECTED': return <span className="badge badge-rejected"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      case 'PENDING': return <span className="badge badge-pending"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'EXPIRED': return <span className="badge badge-rejected"><XCircle className="w-3 h-3 mr-1" /> Expired</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'BKASH': return <span className="text-pink-500">📱</span>;
      case 'NAGAD': return <span className="text-orange-500">📱</span>;
      case 'USDT': return <span className="text-green-500">₿</span>;
      case 'STRIPE': return <CreditCard className="w-4 h-4 text-[var(--color-accent)]" />;
      default: return <FileText className="w-4 h-4 text-[var(--color-text-muted)]" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Payments</h1>
          <p className="text-[var(--color-text-muted)]">Review and verify subscription payments</p>
        </div>
        <button onClick={fetchPayments} disabled={isLoading} className="btn btn-secondary btn-sm">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-2 md:grid-4 gap-4">
        {[
          { label: 'Pending', count: payments.filter(p => p.status === 'PENDING').length, color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning)]/10', icon: Clock },
          { label: 'Approved', count: payments.filter(p => p.status === 'APPROVED').length, color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success)]/10', icon: CheckCircle },
          { label: 'Rejected', count: payments.filter(p => p.status === 'REJECTED').length, color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger)]/10', icon: XCircle },
          { label: 'Total Amount', count: `$${(payments.filter(p => p.status === 'APPROVED').reduce((sum, p) => sum + p.amount, 0) / 100).toLocaleString()}`, color: 'text-amber-400', bg: 'bg-amber-400/10', icon: CreditCard }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card-elevated">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[var(--color-text-muted)]">{stat.label}</p>
                  <p className="font-display text-2xl font-bold">{stat.count}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            className="input"
            placeholder="Search by user, transaction ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
        >
          {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'All Status' : opt}</option>)}
        </select>
        <select
          className="input w-auto"
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value as any); setPage(1); }}
        >
          {METHOD_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'ALL' ? 'All Methods' : opt}</option>)}
        </select>
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payments found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Transaction ID</th>
                    <th>Screenshot</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Verified</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div>
                          <p className="font-medium">{payment.user.firstName || 'Unknown'}</p>
                          <p className="text-sm text-[var(--color-text-muted)] font-mono">
                            @{payment.user.username || payment.user.telegramId}
                          </p>
                        </div>
                      </td>
                      <td className="font-mono font-medium">${(payment.amount / 100).toFixed(2)} {payment.currency}</td>
                      <td className="flex items-center gap-2">
                        {getMethodIcon(payment.method)}
                        <span className="capitalize text-sm">{payment.method.toLowerCase()}</span>
                      </td>
                      <td className="font-mono text-sm">{payment.transactionId}</td>
                      <td>
                        {payment.screenshotUrl ? (
                          <button
                            onClick={() => setViewingScreenshot(payment.screenshotUrl)}
                            className="btn btn-ghost btn-sm p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[var(--color-text-muted)] text-sm">No screenshot</span>
                        )}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td className="text-sm">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="text-sm">
                        {payment.verifiedAt ? new Date(payment.verifiedAt).toLocaleDateString() : <span className="text-[var(--color-text-muted)]">—</span>}
                      </td>
                      <td>
                        {payment.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleVerify(payment.id, 'APPROVE')}
                              className="btn btn-ghost btn-sm p-1 text-[var(--color-success)] hover:text-[var(--color-success)]"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVerify(payment.id, 'REJECT')}
                              className="btn btn-ghost btn-sm p-1 text-[var(--color-danger)] hover:text-[var(--color-danger)]"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)]">
                <span className="text-sm text-[var(--color-text-muted)]">
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Screenshot Modal */}
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setViewingScreenshot(null)}>
          <div className="relative max-w-4xl max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 z-10 btn btn-ghost p-2 bg-[var(--color-surface)] rounded-full" onClick={() => setViewingScreenshot(null)}>
              <XCircle className="w-5 h-5" />
            </button>
            <img src={viewingScreenshot} alt="Payment screenshot" className="max-w-full max-h-[80vh] rounded-lg shadow-lg" />
          </div>
        </div>
      )}

      {/* Verify Payment Modal */}
      {verifyingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setVerifyingPayment(null)}>
          <div className="card-elevated w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">Approve Payment</h2>
              <button onClick={() => setVerifyingPayment(null)} className="btn btn-ghost p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Subscription Tier</label>
                <select
                  className="input"
                  value={verifyingPayment.tier}
                  onChange={(e) => setVerifyingPayment({ ...verifyingPayment, tier: e.target.value as 'PRO' | 'ELITE' })}
                >
                  <option value="PRO">Pro</option>
                  <option value="ELITE">Elite</option>
                </select>
              </div>

              <div>
                <label className="label">Duration (Days)</label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  max="365"
                  value={verifyingPayment.duration}
                  onChange={(e) => setVerifyingPayment({ ...verifyingPayment, duration: parseInt(e.target.value) || 30 })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setVerifyingPayment(null)} className="btn btn-secondary flex-1">Cancel</button>
                <button onClick={handleConfirmVerify} className="btn btn-primary flex-1">Approve & Activate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}