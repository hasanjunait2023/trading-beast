import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { CreditPill } from '@shared/components/CreditPill';
import { PairRow } from '@shared/components/PairRow';
import { DataFreshness } from '@shared/components/DataFreshness';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { userApi, type CreditsData } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useRadarStore } from '../store/radarStore';
import { usePrefsStore, effectiveZone } from '../store/prefs';

/**
 * Home (study 03). Read-only: session + next transition from the sessions
 * adapter, the credit pill from GET /user/credits, and the last STORED
 * shortlist from the in-memory Radar store — or "No scan yet". Opening Home
 * never triggers a paid run. Mounted at /app and (alias) /dashboard.
 */
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { overview, loading: sessionsLoading } = useSessions();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const lastResult = useRadarStore((s) => s.getLast());
  useRadarStore((s) => s.results); // re-render when stored results change
  const setupDone = usePrefsStore((s) => s.setupDone);
  const savedTz = usePrefsStore((s) => s.timezone);
  const zone = effectiveZone(savedTz);

  // GET-only history hydration, once per account (see radarHydration).
  useEffect(() => {
    if (user?.id) void hydrateLatestRadar(user.id);
  }, [user?.id]);

  useEffect(() => {
    let alive = true;
    userApi
      .credits()
      .then((res) => {
        if (alive && res.data.data) setCredits(res.data.data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const activeNames = overview?.active ?? [];
  const heroSession = activeNames.length > 0 ? activeNames.join(' + ') : overview?.selected;
  const fmtTime = (ms: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Session Focus Radar — your trading workspace.
          </p>
        </div>
        {credits && <CreditPill credits={credits.balance} onClick={() => navigate('/app/credits')} />}
      </div>

      {!setupDone && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Finish setting up your workspace</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Pick your timezone, preferred sessions and starter watchlist pairs.
            </p>
          </div>
          <Button onClick={() => navigate('/app/setup')}>Start setup</Button>
        </Card>
      )}

      {/* Session hero — read-only clock data, zero paid calls. */}
      <div
        className="rounded-[var(--radius-lg)] p-5 text-white shadow-[var(--shadow-md)]"
        style={{ background: 'var(--grad-hero)' }}
      >
        {sessionsLoading && !overview ? (
          <Skeleton height={72} />
        ) : overview ? (
          <>
            <p className="text-sm opacity-80">
              {heroSession} Session{activeNames.length ? '' : ' (selected)'}
            </p>
            <p className="mt-0.5 text-2xl font-bold">
              {activeNames.length
                ? `${heroSession} · Live`
                : overview.fxWeekOpen
                  ? 'No session live now'
                  : 'Market week closed'}
            </p>
            {overview.nextTransition && (
              <p className="tnum mt-1 text-sm opacity-90">
                Next: {overview.nextTransition.session} {overview.nextTransition.kind} at{' '}
                {fmtTime(overview.nextTransition.atMs)} ({zone})
              </p>
            )}
            {overview.overlap && <p className="mt-1 text-sm opacity-90">Sessions overlap right now.</p>}
          </>
        ) : (
          <p className="text-sm">Session information unavailable right now.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/markets')}>
            Open Radar
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => navigate('/app/sessions')}
          >
            Session Clock
          </Button>
        </div>
      </div>

      {/* Last stored shortlist — from this device's in-memory scan only. */}
      <section aria-label="Last scan" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Last scan</h2>
          {lastResult && <DataFreshness timestamp={lastResult.timestampMs} label="Scanned" />}
        </div>
        {lastResult ? (
          <>
            <p className="text-sm text-[var(--color-text-muted)]">
              {lastResult.session} session · {lastResult.scope === 'watchlist' ? 'Watchlist scope' : 'All markets'}
              {lastResult.marketClosed ? ' · ran while the market was closed' : ''}
            </p>
            {lastResult.focus.length === 0 ? (
              <Card>
                <EmptyState
                  title="No focus pairs in the last scan"
                  message="The last scan returned no Focus pairs. Open Markets to review the full result or run a new scan."
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {lastResult.focus.slice(0, 5).map((p) => (
                  <PairRow
                    key={p.pair}
                    pair={p.displayName}
                    status={p.status}
                    bias={p.bias}
                    score={p.score}
                    freshness={
                      p.stale ? (
                        <span className="font-semibold text-[var(--color-warning)]">Stale data</span>
                      ) : undefined
                    }
                    onClick={() => navigate(`/app/markets/${encodeURIComponent(p.pair)}`)}
                  />
                ))}
              </div>
            )}
            <Link to="/app/markets" className="inline-block font-semibold text-[var(--color-link)] underline">
              View full results in Markets
            </Link>
          </>
        ) : (
          <Card>
            <EmptyState
              title="No scan yet"
              message="You have not run a Radar scan in this browser session yet. Browsing is free — only a confirmed run spends credits."
              action={<Button onClick={() => navigate('/app/markets')}>Open Radar</Button>}
            />
          </Card>
        )}
      </section>
    </div>
  );
}
