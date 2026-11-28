import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Input, FormField } from '@shared/components/FormField';
import { ExternalIcon, LockIcon, SendIcon } from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { useBotUsername, botUrl } from '../hooks/useBotConfig';
import { getInitData, getInitialReferralCode, isTelegram } from '../telegram';

/**
 * Sign in (reference 01b). Inside Telegram the host auto-connects once
 * with the signed initData. In a browser: the /login instruction card,
 * Open Telegram bot link, a one-time-code field (POST /api/auth/code)
 * and a gradient Sign in pill. An expired/invalid code produces a clear
 * error plus back-to-bot guidance. Return destinations are allowlisted
 * internal paths only.
 */

function safeReturnTo(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from === 'string' && from.startsWith('/app')) return from;
  return '/app';
}

/** Decorative mint waves (reference 01b canvas dressing) — pure SVG. */
function LoginWaves() {
  return (
    <>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-[380px] w-[380px] opacity-70"
        viewBox="0 0 200 200"
      >
        <path
          d="M200 0H60c30 22 52 40 84 52 24 9 42 10 56 6V0Z"
          fill="var(--color-accent-soft)"
        />
        <path
          d="M200 0H110c18 14 36 24 58 30 12 3 22 4 32 2V0Z"
          fill="var(--color-mint-wash)"
        />
      </svg>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-[150px] w-full"
        viewBox="0 0 900 150"
        preserveAspectRatio="none"
      >
        <path
          d="M0 90 C150 40 300 130 470 95 C640 60 760 110 900 70 L900 150 L0 150 Z"
          fill="var(--color-accent-soft)"
          opacity="0.65"
        />
        <path
          d="M0 115 C180 75 340 140 520 112 C680 88 790 125 900 100 L900 150 L0 150 Z"
          fill="var(--color-mint-wash)"
        />
      </svg>
    </>
  );
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
  const [showReferral, setShowReferral] = useState(() => Boolean(getInitialReferralCode()));
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
    <div
      className="relative min-h-screen overflow-hidden text-[var(--color-text)]"
      style={{
        background:
          'linear-gradient(180deg, var(--color-canvas-top) 0%, var(--color-canvas-bottom) 100%)',
      }}
    >
      <LoginWaves />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-5 py-12">
        <div className="flex justify-center">
          <Brand size={46} />
        </div>
        <h1 className="mt-7 text-center text-[38px] leading-[1.08] font-extrabold tracking-tight sm:text-[44px]">
          Sign in to TradingBeast
        </h1>

        <form onSubmit={handleSubmit} className="mt-9 space-y-5">
          {error && (
            <div role="alert" className="rounded-[var(--radius-lg)] bg-[var(--color-danger-bg)] p-3.5 text-sm">
              <p className="font-semibold text-[var(--color-danger)]">Could not sign in</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {inTelegram ? (
            <div className="flex items-center justify-center gap-2 py-2" role="status">
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
              <div className="flex items-center gap-4 rounded-[var(--radius-card-xl)] bg-[var(--color-mint-wash)] p-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: 'var(--gradient-primary-action)' }}
                >
                  <SendIcon size={26} />
                </span>
                <span aria-hidden="true" className="h-11 w-px bg-[var(--color-border-strong)]" />
                <p className="text-[16px] leading-snug">
                  Send <strong>/login</strong> to the TradingBeast bot in a private chat.
                </p>
              </div>

              {bot && (
                <p className="text-center">
                  <a
                    href={bot}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[16px] font-semibold text-[var(--color-link)] underline underline-offset-4"
                  >
                    <ExternalIcon size={18} />
                    Open Telegram bot
                  </a>
                </p>
              )}

              <FormField label="One-time login code" hint="Code expires in 5 minutes.">
                <span className="relative block">
                  <Input
                    type="password"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste the 64-character code"
                    className="min-h-[58px] rounded-[var(--radius-input)] pr-12 text-base"
                  />
                  <LockIcon
                    size={21}
                    className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--color-text-faint)]"
                  />
                </span>
              </FormField>
            </>
          )}

          {showReferral ? (
            <FormField label="Referral code (optional)">
              <Input
                type="text"
                placeholder="ABC123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={8}
                disabled={isLoading || authLoading}
                className="rounded-[var(--radius-input)]"
              />
            </FormField>
          ) : (
            <p className="text-center">
              <button
                type="button"
                className="text-sm font-semibold text-[var(--color-link)] underline underline-offset-4"
                onClick={() => setShowReferral(true)}
              >
                Have a referral code?
              </button>
            </p>
          )}
          {getInitialReferralCode() &&
            referralCode === getInitialReferralCode()?.toUpperCase() && (
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                Applied from your referral link — you can change it before connecting.
              </p>
            )}

          <Button
            type="submit"
            size="lg"
            className="min-h-[58px] w-full rounded-full text-lg"
            style={{ background: 'var(--gradient-primary-action)' }}
            loading={isLoading || authLoading}
            disabled={isLoading || authLoading || (!initData && code.trim().length !== 64)}
          >
            {inTelegram ? 'Connect with Telegram' : 'Sign in'}
          </Button>
        </form>

        {!inTelegram && bot && (
          <p className="mt-6 text-center">
            <a
              href={bot}
              target="_blank"
              rel="noreferrer"
              className="text-[15px] font-semibold text-[var(--color-link)] underline underline-offset-4"
            >
              Using Telegram? Open the Mini App
            </a>
          </p>
        )}

        <p className="mt-9 text-center text-xs text-[var(--color-text-muted)]">
          Analysis tool only. Not investment advice. Trading involves risk.
        </p>
      </div>
    </div>
  );
}
