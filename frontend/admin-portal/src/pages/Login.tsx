import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Activity, Shield, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [telegramId, setTelegramId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(telegramId);
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
            <Activity className="w-8 h-8 text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Admin Portal</h1>
          <p className="text-[var(--color-text-muted)]">Session Focus Radar — Administration</p>
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
              <label className="label">One-time admin login code</label>
              <input
                type="password"
                className="input"
                placeholder="Code from /login in the bot"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                required
                disabled={isLoading || authLoading}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Request a code in the private bot chat. Only authorized admin accounts can access.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center gap-2"
              disabled={isLoading || authLoading || !telegramId.trim()}
            >
              {isLoading || authLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Signing in...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
            Secure admin access only. Contact system administrator for permissions.
          </p>
        </div>
      </div>
    </div>
  );
}