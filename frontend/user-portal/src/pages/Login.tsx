import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Target, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const initData = (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || '';
  const [code,setCode] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({ initData, code: initData ? undefined : code.trim(), referralCode: referralCode || undefined });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-[var(--color-accent)] flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Session Focus Radar</h1>
          <p className="text-[var(--color-text-muted)]">Market analysis tool for forex traders</p>
        </div>

        <div className="card-elevated">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              {initData ? <p>Connect your verified Telegram account.</p> : <><p>Send /login to the TradingBeast bot in private chat and paste the one-time code.</p><input className="input" type="password" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} placeholder="One-time login code" /></>}
            </div>

            <div>
              <label className="label">Referral Code (Optional)</label>
              <input
                type="text"
                className="input"
                placeholder="ABC123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={8}
                disabled={isLoading || authLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center gap-2"
              disabled={isLoading || authLoading || (!initData && code.trim().length !== 64)}
            >
              {isLoading || authLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Connecting...
                </>
              ) : (
                <>
                  <span>Connect with Telegram</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
              <span>10 free credits every day</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
              <span>Session-aware focus lists (Asian/London/NY)</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
              <span>28 forex pairs + Gold, Silver, Oil, Bitcoin</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <CheckCircle className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
              <span>Multi-timeframe analysis (EMA, RSI, ADR, OR)</span>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-[var(--color-text-muted)]">
            ⚠️ Analysis tool only. Not investment advice. Trading involves risk.
          </p>
        </div>
      </div>
    </div>
  );
}