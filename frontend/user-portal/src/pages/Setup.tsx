import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Select, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import { PairFlags } from '@shared/components/PairFlags';
import {
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  MarketsIcon,
  PlanIcon,
} from '@shared/components/icons';
import { analysisApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { usePrefsStore, effectiveZone, KNOWN_SESSIONS, type KnownSession } from '../store/prefs';

/**
 * First-run setup (study 02). Only fields with a real home are saved:
 *  - starter symbols → the account watchlist via PATCH /user/watchlist;
 *  - timezone + preferred sessions → SERVER account preferences via
 *    GET/PUT /user/preferences. The device-local prefs store is the initial
 *    fallback only: it seeds the form before the GET resolves and is what
 *    remains if the GET fails (labelled honestly in that case). Skipping
 *    keeps the choices device-local only — nothing is sent to the server.
 *  - session alerts have no API yet, so the toggle is shown disabled with
 *    an honest note — it is never fake-saved.
 * The setup-completion flag stays local (a per-device UX concern).
 * Skippable; Finish opens Home; the return path is Settings → Setup.
 * R3b: presentation rebuilt to the study — gradient hero with the shared
 * candlestick artwork, mint icon-chip section cards, gradient session
 * pills and flag-pair starter rows. The study's live prices on the starter
 * rows are NOT reproduced: the catalog API returns symbols only, so rows
 * carry flags + symbol + the selection toggle and nothing else.
 */

function SectionHeading({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{children}</p>
      </div>
    </div>
  );
}

export default function Setup() {
  const { user, setWatchlistLocal } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);
  const savedSessions = usePrefsStore((s) => s.preferredSessions);
  const setPreferredSessions = usePrefsStore((s) => s.setPreferredSessions);
  const hydrateFromServer = usePrefsStore((s) => s.hydrateFromServer);
  const markSetupDone = usePrefsStore((s) => s.markSetupDone);
  /** True when the server preferences could not be loaded (device fallback). */
  const [prefsFallback, setPrefsFallback] = useState(false);

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
    // Server preferences win over the device-local seed when they load.
    try {
      const res = await userApi.getPreferences();
      if (res.data.data) {
        hydrateFromServer(res.data.data);
        if (res.data.data.timezone) setZone(res.data.data.timezone);
        if (res.data.data.preferredSessions.length) {
          setSessions(
            res.data.data.preferredSessions.filter((s): s is KnownSession =>
              (KNOWN_SESSIONS as readonly string[]).includes(s),
            ),
          );
        }
        setPrefsFallback(false);
      }
    } catch {
      // Device-local values (already seeded) remain — labelled as fallback.
      setPrefsFallback(true);
    }
  }, [hydrateFromServer]);

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
    // Mirror locally first so the choice survives even if a save fails.
    setTimezone(zone === deviceZone ? null : zone);
    setPreferredSessions(sessions);
    let prefsSaved = true;
    try {
      const res = await userApi.updatePreferences({
        timezone: zone,
        preferredSessions: sessions,
      });
      if (res.data.data) hydrateFromServer(res.data.data);
    } catch {
      prefsSaved = false;
    }
    try {
      const res = await userApi.updateWatchlist(selected);
      const saved = res.data.data?.watchlist ?? selected;
      setWatchlistLocal(saved);
      markSetupDone();
      if (!prefsSaved) {
        toast.info('Watchlist saved. Timezone and sessions could not be synced to your account, so they are saved on this device only for now.');
      }
      navigate('/app', { replace: true });
    } catch {
      toast.error('Could not save your starter watchlist. Your preferences were saved — try the watchlist again from the Watchlist page.');
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
      <section
        aria-label="Set up your workspace"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.55) 0%, rgba(3,40,28,0.2) 55%, rgba(3,40,28,0) 82%)',
          }}
        />
        <div className="relative max-w-md">
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
            Set up your workspace
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-white/90">
            Personalize your FX analysis environment to get started. Everything here can be
            changed later in Settings — and all of it is skippable.
          </p>
        </div>
      </section>

      <Card>
        <SectionHeading icon={<ClockIcon size={22} />} title="Timezone">
          {prefsFallback
            ? 'Could not load your account preference, so the value below is this device’s saved choice. Finishing setup will try to sync it to your account.'
            : 'Set your working timezone for market analysis. Saved to your account when you finish setup, so it follows you across devices.'}
        </SectionHeading>
        <div className="mt-4">
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
        <SectionHeading icon={<MarketsIcon size={22} />} title="Trading Sessions">
          Choose the market sessions you want to track. Saved to your account when you finish
          setup and used as your default view preference.
        </SectionHeading>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Preferred sessions">
          {KNOWN_SESSIONS.map((s) => {
            const active = sessions.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSession(s)}
                className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold transition-[color,background-color,box-shadow,transform] active:scale-[0.98] ${
                  active
                    ? 'text-white shadow-[var(--shadow-sm)]'
                    : 'bg-[var(--color-mint-wash)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
                }`}
                style={active ? { background: 'var(--gradient-primary-action)' } : undefined}
              >
                {active && <CheckIcon size={18} />}
                {s}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionHeading icon={<PlanIcon size={22} />} title="Starter Watchlist">
          Select key instruments to follow for your analysis. This is saved to your account
          watchlist and used by watchlist-scoped Radar runs.
        </SectionHeading>
        {loading ? (
          <div className="mt-4 space-y-2" role="status" aria-label="Loading symbols">
            <Skeleton height={52} />
            <Skeleton height={52} />
          </div>
        ) : loadError ? (
          <div className="mt-4">
            <ErrorState message={loadError} onRetry={() => void load()} />
          </div>
        ) : (
          <div className="mt-4 space-y-2" role="group" aria-label="Starter symbols">
            {catalog.map((symbol) => {
              const active = selected.includes(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSymbol(symbol)}
                  className={`flex min-h-[52px] w-full items-center gap-3 rounded-[var(--radius-row)] border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border-soft)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  <PairFlags pair={symbol} size={34} />
                  <span className="flex-1 text-[15px] font-bold">{symbol}</span>
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${
                      active
                        ? 'text-white'
                        : 'border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)]'
                    }`}
                    style={active ? { background: 'var(--gradient-primary-action)' } : undefined}
                  >
                    {active && <CheckIcon size={16} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          {selected.length} selected (max 32).
        </p>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <SectionHeading icon={<BellIcon size={22} />} title="Session alerts">
            Alerts are not available yet — there is no alerts service to save this to, so
            this stays off and nothing is stored.
          </SectionHeading>
          <button
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="Session alerts (not available yet)"
            disabled
            className="relative mt-1 h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-[var(--color-border)] opacity-60"
          >
            <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white" />
          </button>
        </div>
      </Card>

      <div className="space-y-2">
        <Button
          size="lg"
          className="w-full rounded-full text-white"
          style={{ background: 'var(--gradient-primary-action)' }}
          loading={saving}
          disabled={saving}
          onClick={() => void finish()}
        >
          Finish setup <ArrowRightIcon size={20} />
        </Button>
        <Button size="lg" variant="ghost" className="w-full" disabled={saving} onClick={skip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
