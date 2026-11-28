import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Input, FormField } from '@shared/components/FormField';
import { SessionHeroArt } from '@shared/components/SessionHeroArt';
import { Skeleton } from '@shared/components/Skeleton';
import { CheckIcon, GiftIcon, LockIcon } from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { ApiError, userApi } from '../services/api';
import { useProfileStore } from '../store/profile';
import { checkPassword, isValidEmail, isValidPhone } from '../utils/onboarding';
import { markOnboardingSkipped } from '../utils/profileGate';

/**
 * Welcome wizard (Onboarding + Conversion chapter). A dedicated full-screen
 * page: left brand panel with the session-hero artwork, right step form —
 * Gmail → Phone → Create password → Done. New accounts receive their 100
 * welcome credits server-side; the Done step confirms them with the REAL
 * wallet balance read back from GET /user/credits (never a typed-in
 * number). Skippable at every step: the app shell keeps a slim reminder
 * banner until the profile is completed. If the profile endpoint is not
 * deployed yet (404), the page degrades to a plain welcome + continue —
 * it never traps the user.
 */

const STEPS = ['Email', 'Phone', 'Password', 'Done'] as const;

function safeFrom(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from;
  if (typeof from === 'string' && from.startsWith('/app') && from !== '/app/welcome') {
    return from;
  }
  return '/app';
}

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useProfileStore((s) => s.profile);
  const profileUserId = useProfileStore((s) => s.userId);
  const status = useProfileStore((s) => s.status);
  const ensureProfile = useProfileStore((s) => s.ensure);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [radarCost, setRadarCost] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (user) void ensureProfile(user.id);
  }, [user, ensureProfile]);

  // Prefill whatever the server already holds (e.g. an email captured
  // earlier) once the profile for THIS account arrives.
  useEffect(() => {
    if (prefilled || status !== 'ready' || !profile || profileUserId !== user?.id) return;
    if (profile.email) setEmail(profile.email);
    if (profile.phone) setPhone(profile.phone);
    setPrefilled(true);
  }, [prefilled, status, profile, profileUserId, user?.id]);

  const finish = useCallback(() => {
    navigate(safeFrom(location.state), { replace: true });
  }, [navigate, location.state]);

  const skip = useCallback(() => {
    markOnboardingSkipped();
    finish();
  }, [finish]);

  const submit = useCallback(async () => {
    if (!user) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await userApi.completeProfile({
        email: email.trim(),
        phone: phone.trim(),
        // A password is only sent when one was typed; an account that
        // already has one keeps it when the field is left blank.
        password: password ? password : undefined,
      });
      const next = res.data.data ?? {
        email: email.trim(),
        phone: phone.trim(),
        profileCompleted: true,
        hasPassword: true,
      };
      setProfile(user.id, next);
      // Read the real wallet balance for the Done step (welcome credits are
      // granted server-side). A failed read just omits the number.
      try {
        const credits = await userApi.credits();
        if (credits.data.data) {
          setBalance(credits.data.data.balance);
          setRadarCost(credits.data.data.radarCost);
        }
      } catch {
        /* balance stays null — the confirmation shows no invented figure */
      }
      setStep(3);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not save your details. Check your connection and try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [user, email, phone, password, setProfile]);

  const nextFromEmail = () => {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address — this becomes one of your sign-in methods.');
      return;
    }
    setError('');
    setStep(1);
  };

  const nextFromPhone = () => {
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number, including the country code (e.g. +880…).');
      return;
    }
    setError('');
    setStep(2);
  };

  const passwordCheck = checkPassword(password);
  const hasPassword = profile?.hasPassword ?? false;
  const passwordStepValid =
    (hasPassword && password === '') ||
    (passwordCheck.ok && password === confirm);

  const submitPasswordStep = () => {
    if (!hasPassword || password !== '') {
      if (!passwordCheck.ok) {
        setError(`Your password needs ${passwordCheck.issues.join(', ')}.`);
        return;
      }
      if (password !== confirm) {
        setError('The two passwords do not match.');
        return;
      }
    }
    void submit();
  };

  const alreadyComplete = status === 'ready' && profile?.profileCompleted && step !== 3;
  const endpointUnavailable = status === 'unavailable';

  return (
    <div className="grid min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] lg:grid-cols-[440px_1fr]">
      {/* Brand panel (desktop): gradient + session artwork, like the
          reference sign-in studies' left rail. */}
      <aside
        className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col"
        style={{ background: 'var(--gradient-session-hero)' }}
        aria-hidden="true"
      >
        <SessionHeroArt variant="london" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.55) 0%, rgba(3,40,28,0.15) 60%, rgba(3,40,28,0) 85%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <Brand variant="tile" size={44} markOnly />
            <p className="text-xl font-extrabold tracking-tight">TradingBeast</p>
          </div>
          <h1 className="mt-14 text-[40px] leading-[1.05] font-extrabold tracking-tight">
            Know which pairs deserve your focus.
          </h1>
          <p className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-white/85">
            Set up your account once — then sign in anywhere with your email
            and password, or instantly through Telegram.
          </p>
          <ul className="mt-10 space-y-3.5 text-[15px] font-semibold">
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <GiftIcon size={18} />
              </span>
              100 welcome credits, already in your wallet
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <LockIcon size={18} />
              </span>
              A password you control — no Telegram required
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <CheckIcon size={18} />
              </span>
              One wallet across bot, Mini App and browser
            </li>
          </ul>
        </div>
        <p className="relative mt-auto text-xs text-white/70">
          Analysis tool only. Not investment advice. Trading involves risk.
        </p>
      </aside>

      {/* Step form */}
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px]">
          <div className="flex justify-center lg:hidden">
            <Brand size={40} />
          </div>

          {status === 'loading' || status === 'idle' ? (
            <div className="space-y-3" role="status" aria-label="Loading your profile">
              <Skeleton height={36} />
              <Skeleton height={180} />
            </div>
          ) : endpointUnavailable ? (
            <div className="text-center">
              <h2 className="text-[30px] font-extrabold tracking-tight">Welcome to TradingBeast</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                Account setup is not available just yet — you can head straight
                into the app and finish it later from here.
              </p>
              <Button size="lg" className="mt-7 w-full rounded-full" onClick={finish}>
                Continue to the app
              </Button>
            </div>
          ) : alreadyComplete ? (
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                <CheckIcon size={32} />
              </span>
              <h2 className="mt-5 text-[30px] font-extrabold tracking-tight">You're all set</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                Your email, phone and password are on file. You can sign in
                with your email and password on any device, or instantly
                through Telegram.
              </p>
              <Button size="lg" className="mt-7 w-full rounded-full" onClick={finish}>
                Continue to the app
              </Button>
            </div>
          ) : (
            <>
              {/* Progress */}
              <ol className="flex items-center gap-2" aria-label="Setup progress">
                {STEPS.map((label, i) => (
                  <li key={label} className="flex flex-1 items-center gap-2">
                    <span
                      aria-current={i === step ? 'step' : undefined}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        i < step
                          ? 'bg-[var(--color-success)] text-white'
                          : i === step
                            ? 'text-white'
                            : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                      }`}
                      style={i === step ? { background: 'var(--gradient-primary-action)' } : undefined}
                    >
                      {i < step ? <CheckIcon size={16} /> : i + 1}
                    </span>
                    <span
                      className={`hidden text-sm font-semibold sm:block ${
                        i === step ? '' : 'text-[var(--color-text-muted)]'
                      }`}
                    >
                      {label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-border)]" />
                    )}
                  </li>
                ))}
              </ol>

              {error && (
                <div role="alert" className="mt-5 rounded-[var(--radius-lg)] bg-[var(--color-danger-bg)] p-3.5 text-sm">
                  <p className="font-semibold text-[var(--color-danger)]">Check this step</p>
                  <p className="mt-1">{error}</p>
                </div>
              )}

              {step === 0 && (
                <section className="mt-7">
                  <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
                    What's your email?
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                    We use your Gmail address as one of your sign-in methods —
                    together with the password you set in step 3, you can sign
                    in on any device, even without Telegram.
                  </p>
                  <form
                    className="mt-6 space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      nextFromEmail();
                    }}
                  >
                    <FormField label="Email address">
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="min-h-[56px] rounded-[var(--radius-input)] text-base"
                      />
                    </FormField>
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full rounded-full"
                      style={{ background: 'var(--gradient-primary-action)' }}
                    >
                      Continue
                    </Button>
                  </form>
                </section>
              )}

              {step === 1 && (
                <section className="mt-7">
                  <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
                    Your phone number
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                    For account recovery and important account notices. Include
                    your country code so we can reach you anywhere.
                  </p>
                  <form
                    className="mt-6 space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      nextFromPhone();
                    }}
                  >
                    <FormField label="Phone number" hint="Example: +880 1712 345678">
                      <Input
                        type="tel"
                        autoComplete="tel"
                        placeholder="+880…"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="min-h-[56px] rounded-[var(--radius-input)] text-base"
                      />
                    </FormField>
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" onClick={() => setStep(0)}>
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1 rounded-full"
                        style={{ background: 'var(--gradient-primary-action)' }}
                      >
                        Continue
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {step === 2 && (
                <section className="mt-7">
                  <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
                    Create your password
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-muted)]">
                    {hasPassword
                      ? 'You already have a password on file. Leave these fields blank to keep it, or type a new one to replace it.'
                      : 'This password, with your email, signs you in anywhere — keep it unique and don’t share it. Telegram sign-in keeps working too.'}
                  </p>
                  <form
                    className="mt-6 space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitPasswordStep();
                    }}
                  >
                    <FormField
                      label={hasPassword ? 'New password (optional)' : 'Password'}
                      hint="At least 8 characters, with a letter and a number."
                    >
                      <span className="relative block">
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="min-h-[56px] rounded-[var(--radius-input)] pr-12 text-base"
                        />
                        <LockIcon
                          size={20}
                          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[var(--color-text-faint)]"
                        />
                      </span>
                    </FormField>
                    <FormField label="Confirm password">
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repeat the password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        className="min-h-[56px] rounded-[var(--radius-input)] text-base"
                      />
                    </FormField>
                    <div className="flex gap-3">
                      <Button type="button" variant="ghost" disabled={submitting} onClick={() => setStep(1)}>
                        Back
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        loading={submitting}
                        disabled={submitting || !passwordStepValid}
                        className="flex-1 rounded-full"
                        style={{ background: 'var(--gradient-primary-action)' }}
                      >
                        Finish setup
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              {step === 3 && (
                <section className="mt-7 text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)]">
                    <CheckIcon size={32} />
                  </span>
                  <h2 className="mt-5 text-[30px] font-extrabold tracking-tight">
                    Your account is ready
                  </h2>
                  <div className="mt-5 rounded-[var(--radius-card-xl)] bg-[var(--color-mint-wash)] p-5">
                    <p className="flex items-center justify-center gap-2 font-bold">
                      <GiftIcon size={22} className="text-[var(--color-accent)]" />
                      Your 100 welcome credits are in your wallet
                    </p>
                    {balance !== null ? (
                      <p className="tnum mt-2 text-[15px] text-[var(--color-text-muted)]">
                        Current balance: <strong className="text-[var(--color-text)]">{balance} credits</strong>
                      </p>
                    ) : (
                      <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
                        See your balance any time on the Credits page.
                      </p>
                    )}
                    {radarCost !== null && (
                      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        One Radar run costs {radarCost} credits — your first scans are on us.
                      </p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="mt-7 w-full rounded-full"
                    style={{ background: 'var(--gradient-primary-action)' }}
                    onClick={finish}
                  >
                    Start exploring
                  </Button>
                </section>
              )}

              {step < 3 && (
                <p className="mt-7 text-center">
                  <button
                    type="button"
                    onClick={skip}
                    className="text-sm font-semibold text-[var(--color-text-muted)] underline underline-offset-4"
                  >
                    Skip for now — I'll finish later
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
