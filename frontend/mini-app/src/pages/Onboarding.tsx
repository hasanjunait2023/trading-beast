import { useCallback, useEffect, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { FormField, Input } from '@shared/components/FormField';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import {
  CheckIcon,
  CoinsIcon,
  CrosshairIcon,
  LockIcon,
  ShieldCheckIcon,
} from '@shared/components/icons';
import { ApiError, profileApi, userApi } from '../services/api';
import {
  passwordStrength,
  validateEmail,
  validatePassword,
  validatePhone,
} from '../onboarding/gate';
import { haptics } from '../telegram';

/**
 * Onboarding (owner chapter). After Telegram sign-in, a user whose profile
 * is not completed gets this step flow BEFORE the main tabs: welcome →
 * Gmail → phone → password → done. It is skippable once (the App persists
 * the skip and keeps a gentle reminder in More / Profile), and completing
 * it is made attractive honestly: the 100-credit welcome grant is already
 * in the wallet (server-side), and the profile is what secures account
 * recovery. All validation is inline; the server stays the authority
 * (409 email-in-use returns the user to the email step).
 */

type Step = 'welcome' | 'email' | 'phone' | 'password' | 'done';
const FLOW: Step[] = ['welcome', 'email', 'phone', 'password'];
const STEP_TITLES: Record<Step, string> = {
  welcome: 'Welcome',
  email: 'Your Gmail',
  phone: 'Your number',
  password: 'Create password',
  done: 'All set',
};

const gradientCta =
  'flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-[17px] font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99] disabled:opacity-60';

export default function Onboarding({
  firstName,
  initialEmail,
  initialPhone,
  onDone,
  onSkip,
}: {
  firstName?: string;
  initialEmail?: string | null;
  initialPhone?: string | null;
  /** Called from the Done step (profile already saved + refetched by App). */
  onDone: () => void;
  /** The one allowed skip — App persists it and shows the reminder. */
  onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>('welcome');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string }>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  // The welcome grant is server-side; show the real balance when it reads.
  useEffect(() => {
    let cancelled = false;
    userApi
      .credits()
      .then((res) => {
        if (!cancelled && res.data.data) setBalance(res.data.data.balance);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const go = useCallback((next: Step) => {
    setFormError('');
    setStep(next);
    haptics.selection();
  }, []);

  const submit = useCallback(async () => {
    const passwordError = validatePassword(password, confirm);
    if (passwordError) {
      setErrors({ password: passwordError });
      return;
    }
    setErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      await profileApi.complete({
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      haptics.notification('success');
      setStep('done');
    } catch (err) {
      haptics.notification('error');
      if (err instanceof ApiError && err.status === 409) {
        // Email already linked elsewhere — back to the email step.
        setErrors({ email: 'This email is already linked to another account. Use a different Gmail address.' });
        setStep('email');
      } else if (err instanceof ApiError && err.status === 400) {
        setFormError(err.message || 'Some details were rejected — check them and try again.');
      } else {
        setFormError('Could not save your profile. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [email, phone, password, confirm]);

  const stepIndex = step === 'done' ? FLOW.length : FLOW.indexOf(step);
  const strength = passwordStrength(password);

  return (
    <div className="px-4 pt-2">
      {/* Header: brand + progress + the one skip. */}
      <div className="flex items-center justify-between gap-3">
        <Brand size={32} />
        {step !== 'done' && (
          <button
            type="button"
            onClick={onSkip}
            className="min-h-[40px] rounded-full px-3 text-sm font-semibold text-[var(--color-text-muted)]"
          >
            Skip for now
          </button>
        )}
      </div>
      <div className="mt-3" aria-hidden="true">
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-control-track)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${((stepIndex + (step === 'done' ? 0 : 0.5)) / FLOW.length) * 100}%`,
              background: 'var(--gradient-primary-action)',
            }}
          />
        </div>
        <div className="mt-2 flex justify-between">
          {FLOW.map((s, i) => (
            <span
              key={s}
              className={`h-2 w-2 rounded-full ${
                i <= stepIndex ? '' : 'bg-[var(--color-control-track)]'
              }`}
              style={i <= stepIndex ? { background: 'var(--color-accent)' } : undefined}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-[13px] font-semibold text-[var(--color-text-muted)]">
        {step === 'done' ? 'Setup complete' : `Step ${stepIndex + 1} of ${FLOW.length} · ${STEP_TITLES[step]}`}
      </p>

      <div key={step} className="tb-step-in mt-4">
        {step === 'welcome' && (
          <div className="space-y-4">
            <section
              aria-label="Welcome to TradingBeast"
              className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
              style={{ background: 'var(--gradient-session-hero)' }}
            >
              <MarketsHeroArt />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(3,40,28,0.55) 0%, rgba(3,40,28,0.15) 55%, rgba(3,40,28,0) 80%)',
                }}
              />
              <div className="relative">
                <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
                  Welcome{firstName ? `, ${firstName}` : ''}
                </h1>
                <p className="mt-2 max-w-[260px] text-[15px] leading-snug text-white/90">
                  TradingBeast ranks every pair for the Asian, London and New York sessions —
                  so you only focus on the setups that deserve your attention.
                </p>
              </div>
            </section>

            <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 py-3.5">
              <CoinsIcon size={26} className="shrink-0 text-[var(--color-accent)]" />
              <p className="text-[15px] font-bold text-[var(--color-text)]">
                100 welcome credits are waiting in your wallet
                {balance !== null && (
                  <span className="block text-[13px] font-semibold text-[var(--color-text-muted)]">
                    Current balance: <span className="tnum">{balance} credits</span> — that's 10 full Radar runs.
                  </span>
                )}
              </p>
            </div>

            <ul className="space-y-2.5 text-[15px] text-[var(--color-text)]">
              <li className="flex gap-2.5">
                <CrosshairIcon size={20} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                Finish your profile so your account is truly yours — it takes under a minute.
              </li>
              <li className="flex gap-2.5">
                <ShieldCheckIcon size={20} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                Your email, number and password secure account recovery if you ever lose Telegram access.
              </li>
              <li className="flex gap-2.5">
                <LockIcon size={20} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                We never share your details. Analysis tool only — not investment advice.
              </li>
            </ul>

            <button type="button" className={gradientCta} style={{ background: 'var(--gradient-primary-action)' }} onClick={() => go('email')}>
              Set up my profile
            </button>
            <p className="text-center text-[13px] text-[var(--color-text-muted)]">
              Prefer to look around first? Skip for now — we'll remind you in Profile.
            </p>
          </div>
        )}

        {step === 'email' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const err = validateEmail(email);
              if (err) setErrors({ email: err });
              else {
                setErrors({});
                go('phone');
              }
            }}
          >
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">What's your Gmail address?</h1>
              <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">
                Used for account recovery and important account notices — never for spam.
              </p>
            </div>
            <FormField label="Gmail address" error={errors.email}>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoFocus
              />
            </FormField>
            <button type="submit" className={gradientCta} style={{ background: 'var(--gradient-primary-action)' }}>
              Continue
            </button>
            <Button variant="ghost" className="w-full" onClick={() => go('welcome')}>
              Back
            </Button>
          </form>
        )}

        {step === 'phone' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const err = validatePhone(phone);
              if (err) setErrors({ phone: err });
              else {
                setErrors({});
                go('password');
              }
            }}
          >
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">Your mobile number</h1>
              <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">
                A second way to verify it's really you when recovering your account.
              </p>
            </div>
            <FormField label="Mobile number" error={errors.phone} hint="Include your country code if you have one, e.g. +880…">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+880 1XXX-XXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                autoFocus
              />
            </FormField>
            <button type="submit" className={gradientCta} style={{ background: 'var(--gradient-primary-action)' }}>
              Continue
            </button>
            <Button variant="ghost" className="w-full" onClick={() => go('email')}>
              Back
            </Button>
          </form>
        )}

        {step === 'password' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div>
              <h1 className="text-[26px] font-extrabold tracking-tight">Create your password</h1>
              <p className="mt-1 text-[15px] text-[var(--color-text-muted)]">
                This password plus your email lets you sign back in anywhere — even without Telegram.
              </p>
            </div>
            <FormField label="Password" error={errors.password}>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                autoFocus
              />
            </FormField>
            {password && (
              <div aria-live="polite">
                <div className="flex gap-1.5" aria-hidden="true">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        background:
                          i <= strength.score
                            ? strength.score >= 3
                              ? 'var(--color-success)'
                              : 'var(--color-warning)'
                            : 'var(--color-control-track)',
                      }}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[13px] text-[var(--color-text-muted)]">
                  <strong className="text-[var(--color-text)]">{strength.label}</strong> · {strength.hint}
                </p>
              </div>
            )}
            <FormField label="Confirm password">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Type it again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </FormField>
            {formError && (
              <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">
                {formError}
              </p>
            )}
            <button
              type="submit"
              className={gradientCta}
              style={{ background: 'var(--gradient-primary-action)' }}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save & finish setup'}
            </button>
            <Button variant="ghost" className="w-full" onClick={() => go('phone')} disabled={submitting}>
              Back
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 pt-4 text-center">
            <div
              className="tb-success-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white shadow-[var(--shadow-hero)]"
              style={{ background: 'var(--gradient-primary-action)' }}
              aria-hidden="true"
            >
              <CheckIcon size={40} />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight">You're all set</h1>
            <p className="mx-auto max-w-[300px] text-[15px] text-[var(--color-text-muted)]">
              Your profile is saved and your account is secured.
              {balance !== null && (
                <>
                  {' '}Your wallet holds <strong className="tnum text-[var(--color-text)]">{balance} credits</strong> —
                  run your first Radar scan whenever you're ready.
                </>
              )}
            </p>
            <button
              type="button"
              className={gradientCta}
              style={{ background: 'var(--gradient-primary-action)' }}
              onClick={onDone}
            >
              Start exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
