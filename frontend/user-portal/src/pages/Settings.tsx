import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Select, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { useTheme } from '@shared/theme';
import { useAuth } from '../hooks/useAuth';
import { userApi, type User } from '../services/api';
import { usePrefsStore, effectiveZone } from '../store/prefs';
import { isTelegram } from '../telegram';

/**
 * Settings / Profile (study 15). The profile is read-only — the API exposes
 * no profile mutations. Theme uses the shared theme preference; timezone is
 * the same device-local preference as Setup (labelled as device scope).
 * Sign out calls POST /auth/logout, sign out everywhere POST
 * /auth/logout-all; both clear all account-scoped state. Aliased at /settings.
 */
export default function Settings() {
  const { user: cachedUser, logout, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

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
    return () => {
      alive = false;
    };
  }, []);

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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Settings" subtitle="Profile, preferences and session controls." />

      <Card>
        <h2 className="font-bold">Profile</h2>
        {loading && !user ? (
          <div className="mt-3">
            <Skeleton height={72} />
          </div>
        ) : user ? (
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--color-text-muted)]">Name</dt>
              <dd className="mt-0.5 font-semibold">{user.firstName || '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Telegram username</dt>
              <dd className="mt-0.5 font-semibold">
                {user.username ? `@${user.username}` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Plan</dt>
              <dd className="mt-0.5 font-semibold">{user.tier}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-text-muted)]">Referral code</dt>
              <dd className="tnum mt-0.5 font-semibold">{user.referralCode}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Profile unavailable right now.</p>
        )}
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          Profile details come from your Telegram account and are read-only here.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold">Appearance</h2>
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

      <Card>
        <h2 className="font-bold">Timezone</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Display timezone for session times on <strong>this device only</strong> — stored in
          this browser, not on your account. The same preference as in Setup.
        </p>
        <div className="mt-3 max-w-sm">
          <FormField label="Display timezone">
            <Select
              value={effectiveZone(savedTz)}
              onChange={(e) => setTimezone(e.target.value === deviceZone ? null : e.target.value)}
              aria-label="Display timezone"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/app/setup')}>
          Revisit setup
        </Button>
      </Card>

      <Card>
        <h2 className="font-bold">Telegram connection</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {isTelegram()
            ? 'You opened the portal inside Telegram and are connected with your verified Telegram account.'
            : 'Your account is linked to Telegram — the same account signs in here with a one-time code from the bot. No separate linking step is needed.'}
        </p>
        {user && (
          <p className="tnum mt-2 text-sm">
            Telegram ID: <span className="font-semibold">{user.telegramId}</span>
          </p>
        )}
      </Card>

      <Card>
        <h2 className="font-bold">Session</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Signing out clears this device's session and all account data stored in this browser,
          including saved Radar results.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={signOut}>
            Sign out
          </Button>
          <Button variant="danger" className="flex-1" onClick={signOutEverywhere}>
            Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}
