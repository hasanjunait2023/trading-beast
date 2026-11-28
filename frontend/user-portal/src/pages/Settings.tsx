import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Select } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { useTheme } from '@shared/theme';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import {
  CandlesIcon,
  CheckIcon,
  ClockIcon,
  GlobeIcon,
  LogoutIcon,
  SendIcon,
} from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { userApi, type User } from '../services/api';
import { usePrefsStore, effectiveZone, KNOWN_SESSIONS, type KnownSession } from '../store/prefs';
import { isTelegram } from '../telegram';

/**
 * Settings / Profile (study 15). The profile is read-only — the API exposes
 * no profile mutations. Theme uses the shared theme preference. Timezone and
 * preferred sessions are SERVER account preferences (GET/PUT
 * /user/preferences, same as Setup): the device-local store seeds the form
 * and is the labelled fallback only while loading or if the server cannot
 * be reached. Sign out calls POST /auth/logout, sign out everywhere POST
 * /auth/logout-all; both clear all account-scoped state. Aliased at /settings.
 * R3b: presentation rebuilt to the study — gradient profile hero, icon-chip
 * rows for timezone/language, checkbox-chip preferred sessions, Telegram
 * account card with a Connected pill, mint Sign Out action. The study's
 * notification toggles are NOT reproduced: no per-type notification
 * preference exists in the API (alert delivery lives on the Alerts page).
 * Language is shown read-only — it comes from the Telegram account and
 * there is no language mutation.
 */

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
    >
      {children}
    </span>
  );
}

const TIER_LABEL: Record<string, string> = {
  FREE: 'Free plan',
  PRO: 'Pro plan',
  ELITE: 'Elite plan',
};

export default function Settings() {
  const { user: cachedUser, logout, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);
  const savedSessions = usePrefsStore((s) => s.preferredSessions);
  const setPreferredSessions = usePrefsStore((s) => s.setPreferredSessions);
  const hydrateFromServer = usePrefsStore((s) => s.hydrateFromServer);
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  /** '' = in sync with the server; otherwise an honest sync note. */
  const [prefsNote, setPrefsNote] = useState('Loading your account preferences…');

  useEffect(() => {
    let alive = true;
    userApi
      .me()
      .then((res) => {
        if (alive && res.data.data) setMe(res.data.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    userApi
      .getPreferences()
      .then((res) => {
        if (alive && res.data.data) {
          hydrateFromServer(res.data.data);
          setPrefsNote('');
        }
      })
      .catch(() => {
        if (alive) {
          setPrefsNote('Could not reach the server — showing this device’s saved preferences. Changes will be kept on this device only until the server is reachable.');
        }
      });
    return () => {
      alive = false;
    };
  }, [hydrateFromServer]);

  /** Persist a preference change: local mirror immediately, then the server. */
  const savePreferences = (patch: { timezone?: string | null; preferredSessions?: KnownSession[] }) => {
    if (patch.timezone !== undefined) setTimezone(patch.timezone);
    if (patch.preferredSessions !== undefined) setPreferredSessions(patch.preferredSessions);
    userApi
      .updatePreferences(patch)
      .then((res) => {
        if (res.data.data) hydrateFromServer(res.data.data);
        setPrefsNote('');
      })
      .catch(() => {
        setPrefsNote('Could not sync to your account — the change is saved on this device only for now.');
      });
  };

  const user = me ?? cachedUser;
  const zones = useMemo(() => {
    const set = new Set<string>([deviceZone, effectiveZone(savedTz), 'Asia/Dhaka', 'UTC', 'Europe/London', 'America/New_York']);
    try {
      const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
      supported?.forEach((z) => set.add(z));
    } catch {
      /* older engines: short list above */
    }
    return [...set].sort();
  }, [deviceZone, savedTz]);

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const signOutEverywhere = () => {
    logoutAll();
    navigate('/login', { replace: true });
  };

  const displayName = user?.firstName || (user?.username ? `@${user.username}` : 'TradingBeast account');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" subtitle="Profile, preferences and session controls." />

      {/* Profile hero (study 15). */}
      <section
        aria-label="Profile"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.5) 0%, rgba(3,40,28,0.15) 60%, rgba(3,40,28,0) 85%)',
          }}
        />
        <div className="relative">
          {loading && !user ? (
            <Skeleton height={72} />
          ) : user ? (
            <div className="flex flex-wrap items-center gap-4">
              <span
                aria-hidden="true"
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[3px] border-white/70 bg-white/15 text-[28px] font-extrabold"
              >
                {(user.firstName ?? user.username ?? 'T').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2.5 text-[24px] font-extrabold tracking-tight">
                  {displayName}
                  <span className="rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[12px] font-bold tracking-wide text-[var(--color-accent)]">
                    {(TIER_LABEL[user.tier] ?? user.tier).toUpperCase()}
                  </span>
                </p>
                <p className="mt-0.5 text-[14px] text-white/85">
                  {user.username ? `@${user.username} · ` : ''}Discretionary FX analysis account
                  {user.isTrialActive ? ' · Pro trial active' : ''}
                </p>
                <p className="tnum mt-1 text-[13px] text-white/75">
                  Referral code: <span className="font-semibold text-white">{user.referralCode}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/90">Profile unavailable right now.</p>
          )}
          <p className="mt-3 text-xs text-white/70">
            Profile details come from your Telegram account and are read-only here.
          </p>
        </div>
      </section>

      {/* Timezone & language rows (study 15). */}
      <Card className="py-2">
        <div className="flex flex-wrap items-center gap-3 py-2.5">
          <RowIcon>
            <ClockIcon size={22} />
          </RowIcon>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">Timezone</p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Set your local trading timezone
            </p>
          </div>
          <div className="w-full min-w-[200px] sm:w-56">
            <Select
              value={effectiveZone(savedTz)}
              onChange={(e) => savePreferences({ timezone: e.target.value })}
              aria-label="Display timezone"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-soft)] py-2.5">
          <RowIcon>
            <GlobeIcon size={22} />
          </RowIcon>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold">Language</p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              From your Telegram account — read-only here
            </p>
          </div>
          <p className="text-[15px] font-bold text-[var(--color-accent)]">
            {user?.languageCode ? user.languageCode.toUpperCase() : '—'}
          </p>
        </div>
        {prefsNote && (
          <p className="border-t border-[var(--color-border-soft)] pt-3 text-sm text-[var(--color-text-muted)]" role="status">
            {prefsNote}
          </p>
        )}
        <p className="pt-1 text-[13px] text-[var(--color-text-muted)]">
          Display timezone is saved to your account (the same preference as in Setup) and
          follows you across devices.
        </p>
      </Card>

      {/* Preferred sessions (study 15 checkbox chips). */}
      <Card>
        <div className="flex items-start gap-3">
          <RowIcon>
            <CandlesIcon size={22} />
          </RowIcon>
          <div>
            <h2 className="text-[16px] font-bold">Preferred Sessions</h2>
            <p className="mt-0.5 text-[13px] text-[var(--color-text-muted)]">
              Select the FX sessions you focus on for analysis
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preferred sessions">
          {KNOWN_SESSIONS.map((s) => {
            const active = savedSessions.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  savePreferences({
                    preferredSessions: active
                      ? savedSessions.filter((x) => x !== s)
                      : [...savedSessions, s],
                  })
                }
                className={`inline-flex min-h-[46px] items-center gap-2.5 rounded-[var(--radius-md)] px-4 text-[15px] font-semibold transition-colors ${
                  active
                    ? 'bg-[var(--color-mint-wash)] text-[var(--color-text)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-[6px] ${
                    active ? 'text-white' : 'border-2 border-[var(--color-border-strong)]'
                  }`}
                  style={active ? { background: 'var(--gradient-primary-action)' } : undefined}
                >
                  {active && <CheckIcon size={13} />}
                </span>
                {s}
              </button>
            );
          })}
        </div>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/app/setup')}>
          Revisit setup
        </Button>
      </Card>

      <Card>
        <h2 className="font-bold">Appearance</h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">Theme preference for this device.</p>
        <div className="mt-3 flex gap-2" role="group" aria-label="Theme">
          {(
            [
              ['light', 'Light'],
              ['dark', 'Dark'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={theme === id}
              onClick={() => setTheme(id)}
              className={`min-h-[44px] flex-1 rounded-[var(--radius-md)] border px-3 text-sm font-semibold ${
                theme === id
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Telegram account (study 15). */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <RowIcon>
            <SendIcon size={22} />
          </RowIcon>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold">Telegram Account</h2>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Connect your Telegram to receive analysis alerts
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-3.5 py-1.5 text-[13px] font-bold text-[var(--color-success)]">
            <CheckIcon size={15} /> Connected
          </span>
        </div>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          {isTelegram()
            ? 'You opened the portal inside Telegram and are connected with your verified Telegram account.'
            : 'Your account is linked to Telegram — the same account signs in here with a one-time code from the bot. No separate linking step is needed.'}
        </p>
        {user && (
          <p className="tnum mt-2 text-sm">
            {user.username ? `@${user.username} · ` : ''}Telegram ID:{' '}
            <span className="font-semibold">{user.telegramId}</span>
          </p>
        )}
      </Card>

      {/* Session / sign out (study 15 mint action). */}
      <div>
        <p className="mb-2 text-[13px] text-[var(--color-text-muted)]">
          Signing out clears this device's session and all account data stored in this browser,
          including saved Radar results.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-row)] bg-[var(--color-mint-wash)] text-[17px] font-bold text-[var(--color-accent)] transition-transform active:scale-[0.99]"
        >
          <LogoutIcon size={21} /> Sign Out
        </button>
        <Button variant="danger" className="mt-2.5 w-full" onClick={signOutEverywhere}>
          Sign out everywhere
        </Button>
      </div>
    </div>
  );
}
