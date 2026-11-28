import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { FormField, Input } from '@shared/components/FormField';
import { useTheme } from '@shared/theme';

/**
 * Login — unchanged auth flow: the one-time code from the bot's /login is
 * exchanged via POST /auth/code (adminApi.login) and stored as admin_token
 * by the existing AuthProvider.
 */
export default function Login() {
  const { login, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(code.trim());
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Check the code and try again — codes expire after five minutes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-8 text-[var(--color-text)]">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] leading-tight font-bold">TradingBeast Admin</h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Session Focus Radar — administration</p>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleTheme} ariaLabel={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>
        </div>

        <Card elevated>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">{error}</p>
            )}
            <FormField label="One-time admin login code" hint="Request a code with /login in the private bot chat. Only authorized admin accounts can sign in. Codes expire after five minutes.">
              <Input
                type="password"
                autoComplete="one-time-code"
                placeholder="Code from /login in the bot"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                disabled={isLoading || authLoading}
              />
            </FormField>
            <Button type="submit" className="w-full" loading={isLoading || authLoading} disabled={!code.trim()}>
              Sign in
            </Button>
          </form>
          <p className="mt-5 text-center text-xs text-[var(--color-text-muted)]">
            Secure admin access only. Contact the system administrator for permissions.
          </p>
        </Card>
      </div>
    </div>
  );
}
