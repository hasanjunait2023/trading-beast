import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Input, FormField } from '@shared/components/FormField';
import { useAuth } from '../hooks/useAuth';
import { useBotUsername, botUrl } from '../hooks/useBotConfig';
import { getInitData, getInitialReferralCode, isTelegram } from '../telegram';

/**
 * Sign in (studies 01 / 01b). Inside Telegram the host auto-connects once
 * with the signed initData. In a browser: Open-Telegram-bot action, the
 * /login instruction, a one-time-code field (POST /api/auth/code) and Sign
 * in. An expired/invalid code produces a clear error plus back-to-bot
 * guidance. Return destinations are allowlisted internal paths only.
 */

function safeReturnTo(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from === 'string' && from.startsWith('/app')) return from;
  return '/app';
}

export default function Login() {
  const { user, login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const botUsername = useBotUsername();
  const inTelegram = isTelegram();
  const initData = getInitData();
  const [code, setCode] = useState('');
  // Prefilled from the Telegram start_param (ref_<CODE>) or a ?ref= link;
  // the user can still edit or clear it before connecting.
  const [referralCode, setReferralCode] = useState(
    () => getInitialReferralCode()?.toUpperCase() ?? '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = useCallback(async () => {
    setError('');
    setIsLoading(true);
    try {
      await login({
        initData: initData || undefined,
        code: initData ? undefined : code.trim(),
        referralCode: referralCode || undefined,
      });
      navigate(safeReturnTo(location.state), { replace: true });
    } catch (err) {
      setError(
        initData
          ? err instanceof Error
            ? err.message
            : 'Login failed'
          : 'That code is invalid or has expired. Codes last 5 minutes — open the Telegram bot, send /login again and paste the fresh code.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [login, navigate, location.state, initData, code, referralCode]);

  // Inside Telegram, connect automatically once on mount — no button press
  // needed. Wait for the stored-session check to finish first so it cannot
  // race the token refresh; if a session already exists, go straight in.
  // On failure the form stays put and the button below acts as retry.
  const autoLoginTried = useRef(false);
  useEffect(() => {
    if (!inTelegram || !initData || autoLoginTried.current || authLoading) return;
    if (user) {
      navigate(safeReturnTo(location.state), { replace: true });
      return;
    }
    autoLoginTried.current = true;
    void doLogin();
  }, [inTelegram, initData, authLoading, user, navigate, location.state, doLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin();
  };

  const bot = botUrl(botUsername);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10 text-[var(--color-text)]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-tight">
            Trading<span className="text-[var(--color-accent)]">Beast</span>
          </p>
          <h1 className="mt-4 text-3xl font-bold">Sign in to TradingBeast</h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Session Focus Radar — market analysis for the Asian, London and New York sessions.
          </p>
        </div>

        <Card elevated>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm">
                <p className="font-semibold text-[var(--color-danger)]">Could not sign in</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {inTelegram ? (
              <div className="flex items-center gap-2" role="status">
                {(isLoading || authLoading) && (
                  <svg className="h-5 w-5 shrink-0 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                <p>
                  {isLoading || authLoading
                    ? 'Connecting your verified Telegram account…'
                    : 'Connect your verified Telegram account.'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] p-3 text-sm">
                  Send <strong>/login</strong> to the TradingBeast bot in a private chat, then
                  paste the one-time code it gives you below.
                </div>
                {bot && (
                  <a
                    href={bot}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center font-semibold text-[var(--color-link)] underline"
                  >
                    Open Telegram bot ↗
                  </a>
                )}
                <FormField label="One-time login code" hint="Code expires in 5 minutes.">
                  <Input
                    type="password"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste the 64-character code"
                  />
                </FormField>
              </>
            )}

            <FormField label="Referral code (optional)">
              <Input
                type="text"
                placeholder="ABC123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={8}
                disabled={isLoading || authLoading}
              />
            </FormField>
            {getInitialReferralCode() &&
              referralCode === getInitialReferralCode()?.toUpperCase() && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Applied from your referral link — you can change it before connecting.
                </p>
              )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isLoading || authLoading}
              disabled={isLoading || authLoading || (!initData && code.trim().length !== 64)}
            >
              {inTelegram ? 'Connect with Telegram' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-muted)]">
            Analysis tool only. Not investment advice. Trading involves risk.
          </p>
        </Card>
      </div>
    </div>
  );
}
