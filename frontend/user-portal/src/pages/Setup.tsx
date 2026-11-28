import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Select, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { analysisApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePrefsStore, effectiveZone, KNOWN_SESSIONS, type KnownSession } from '../store/prefs';

/**
 * First-run setup (study 02). Only fields with a real home are saved:
 *  - starter symbols → the account watchlist via PATCH /user/watchlist;
 *  - timezone + preferred sessions → LOCAL device preferences only (no
 *    server field exists) and labelled as such;
 *  - session alerts have no API yet, so the toggle is shown disabled with
 *    an honest note — it is never fake-saved.
 * Skippable; Finish opens Home; the return path is Settings → Setup.
 */
export default function Setup() {
  const { user, setWatchlistLocal } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);
  const savedSessions = usePrefsStore((s) => s.preferredSessions);
  const setPreferredSessions = usePrefsStore((s) => s.setPreferredSessions);
  const markSetupDone = usePrefsStore((s) => s.markSetupDone);

  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [zone, setZone] = useState(() => effectiveZone(savedTz));
  const [sessions, setSessions] = useState<KnownSession[]>(
    savedSessions.length ? savedSessions : ['London'],
  );
  const [catalog, setCatalog] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>(user?.watchlist ?? []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const zones = useMemo(() => {
    const set = new Set<string>([deviceZone, zone, 'Asia/Dhaka', 'UTC', 'Europe/London', 'America/New_York']);
    try {
      const supported = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone');
      supported?.forEach((z) => set.add(z));
    } catch {
      /* older engines: fall back to the short list above */
    }
    return [...set].sort();
  }, [deviceZone, zone]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analysisApi.getPairs();
      if (Array.isArray(res.data.data)) setCatalog([...new Set(res.data.data)]);
      setLoadError('');
    } catch {
      setLoadError('Could not load the symbol catalog. You can still finish setup and pick pairs later from the Watchlist page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSymbol = (symbol: string) =>
    setSelected((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    );

  const toggleSession = (s: KnownSession) =>
    setSessions((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const finish = async () => {
    setSaving(true);
    // Local presentation preferences first (device scope only).
    setTimezone(zone === deviceZone ? null : zone);
    setPreferredSessions(sessions);
    try {
      const res = await userApi.updateWatchlist(selected);
      const saved = res.data.data?.watchlist ?? selected;
      setWatchlistLocal(saved);
      markSetupDone();
      navigate('/app', { replace: true });
    } catch {
      toast.error('Could not save your starter watchlist. Your device preferences were saved — try the watchlist again from the Watchlist page.');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    setTimezone(zone === deviceZone ? null : zone);
    setPreferredSessions(sessions);
    markSetupDone();
    navigate('/app', { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div
        className="rounded-[var(--radius-lg)] p-5 text-white shadow-[var(--shadow-md)]"
        style={{ background: 'var(--grad-hero)' }}
      >
        <h1 className="text-2xl font-bold">Set up your workspace</h1>
        <p className="mt-1 text-sm opacity-90">
          Personalize your FX analysis environment to get started. Everything here can be
          changed later in Settings.
        </p>
      </div>

      <PageHeader title="Setup" subtitle="A few quick choices — all skippable." />

      <Card>
        <h2 className="font-bold">Timezone</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Used to display session times on <strong>this device only</strong>. There is no
          account-level timezone setting yet, so this preference is stored in this browser
          and is not synced.
        </p>
        <div className="mt-3">
          <FormField label="Display timezone">
            <Select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Display timezone">
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Preferred sessions</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Sessions you want to track. Saved on this device as your default view preference.
        </p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Preferred sessions">
          {KNOWN_SESSIONS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sessions.includes(s)}
              onClick={() => toggleSession(s)}
              className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${
                sessions.includes(s)
                  ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}
            >
              {sessions.includes(s) ? '✓ ' : ''}
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Starter watchlist</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Pick the instruments to follow. This is saved to your account watchlist and used by
          watchlist-scoped Radar runs.
        </p>
        {loading ? (
          <div className="mt-3 space-y-2" role="status" aria-label="Loading symbols">
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : loadError ? (
          <div className="mt-3">
            <ErrorState message={loadError} onRetry={() => void load()} />
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Starter symbols">
            {catalog.map((symbol) => (
              <button
                key={symbol}
                type="button"
                aria-pressed={selected.includes(symbol)}
                onClick={() => toggleSymbol(symbol)}
                className={`min-h-[40px] rounded-full border px-3 text-sm font-semibold ${
                  selected.includes(symbol)
                    ? 'border-transparent bg-[var(--color-accent-soft)] text-[var(--color-text)] outline outline-1 outline-[var(--color-accent)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                }`}
              >
                {selected.includes(symbol) ? '✓ ' : ''}
                {symbol}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">
          {selected.length} selected (max 32).
        </p>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Session alerts</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Alerts are not available yet — there is no alerts service to save this to, so
              this stays off and nothing is stored.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="Session alerts (not available yet)"
            disabled
            className="relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-[var(--color-border)] opacity-60"
          >
            <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white" />
          </button>
        </div>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="flex-1" loading={saving} disabled={saving} onClick={() => void finish()}>
          Finish setup
        </Button>
        <Button size="lg" variant="ghost" className="flex-1" disabled={saving} onClick={skip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
