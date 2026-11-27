import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { CreditCard, Upload, CheckCircle, XCircle, Clock, AlertCircle, Smartphone, ImageIcon, DollarSign } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'BKASH', name: 'bKash', icon: Smartphone, color: 'text-pink-500', instructions: 'Send to +8801XXXXXXXXX (Merchant)' },
  { id: 'NAGAD', name: 'Nagad', icon: Smartphone, color: 'text-orange-500', instructions: 'Send to +8801XXXXXXXXX (Merchant)' },
  { id: 'USDT', name: 'USDT (TRC20)', icon: DollarSign, color: 'text-green-500', instructions: 'Send to TRC20 address: TXXXXXXXXXXXXXXXXXXXXXXXXXXXX' }
];

export default function Payments() {
  useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'BKASH' | 'NAGAD' | 'USDT'>('BKASH');
  const [amount, setAmount] = useState(9.99);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await userApi.getPayments();
      if (res.data.success) setPayments(res.data.data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!transactionId.trim()) {
      setError('Transaction ID is required');
      return;
    }
    if (selectedMethod !== 'USDT' && !screenshot) {
      setError('Payment screenshot is required for bKash/Nagad');
      return;
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl: string | undefined;
      if (screenshot) {
        // In a real app, upload to storage service
        // For now, create object URL
        screenshotUrl = URL.createObjectURL(screenshot);
      }

      const submittedPayment = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD',
        method: selectedMethod,
        transactionId: transactionId.trim(),
        submittedAt: new Date().toISOString()
      };

      await userApi.submitPayment({ ...submittedPayment, screenshotUrl });

      setShowModal(false);
      setTransactionId('');
      setScreenshot(null);
      setError('');
      navigate('/payment/success', { state: { payment: submittedPayment } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment submission failed');
    } finally {
      setIsSubmitting(false);
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

  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod)!;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Payments</h1>
          <p className="text-[var(--color-text-muted)]">Submit and track your subscription payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <CreditCard className="w-4 h-4" />
          New Payment
        </button>
      </div>

      {/* Payment History */}
      <div className="card">
        <h2 className="font-medium mb-4">Payment History</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No payments yet</p>
            <p className="text-sm mt-1">Submit your first payment to upgrade to Pro</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Transaction ID</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="text-sm">{new Date(payment.createdAt).toLocaleDateString()}</td>
                    <td className="font-mono font-medium">${(payment.amount / 100).toFixed(2)} {payment.currency}</td>
                    <td className="capitalize">{payment.method.toLowerCase()}</td>
                    <td className="font-mono text-sm">{payment.transactionId}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowModal(false)}>
          <div className="card-elevated w-full max-w-md animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-bold">New Payment</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Method Selection */}
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMethod(m.id as any)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedMethod === m.id
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                          : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                      }`}
                    >
                      <m.icon className={`w-5 h-5 mx-auto mb-1 ${m.color}`} />
                      <p className="text-sm font-medium text-center">{m.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="label">Amount (USD)</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              {/* Transaction ID */}
              <div>
                <label className="label">Transaction ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter transaction ID from payment app"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />
              </div>

              {/* Screenshot Upload */}
              {(selectedMethod === 'BKASH' || selectedMethod === 'NAGAD') && (
                <div>
                  <label className="label">Payment Screenshot</label>
                  <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 text-center hover:border-[var(--color-accent)]/50 transition-colors">
                    {screenshot ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <ImageIcon className="w-6 h-6 text-[var(--color-accent)]" />
                          <div>
                            <p className="font-medium">{screenshot.name}</p>
                            <p className="text-sm text-[var(--color-text-muted)]">{(screenshot.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScreenshot(null)}
                          className="btn btn-ghost btn-sm text-red-400"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mx-auto mb-2 text-[var(--color-text-muted)]" />
                        <p className="text-[var(--color-text-muted)]">Click or drag to upload screenshot</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">PNG, JPG up to 5MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          id="screenshot-upload"
                          onChange={(e) => e.target.files?.[0] && setScreenshot(e.target.files[0])}
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('screenshot-upload')?.click()}
                          className="btn btn-secondary mt-3"
                        >
                          Choose File
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Method Instructions */}
              <div className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                <p className="text-sm text-[var(--color-text-muted)]">
                  <strong>Instructions:</strong> {method.instructions}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Payments are for market analysis tool subscription only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}