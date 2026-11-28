import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { CreditPill } from '@shared/components/CreditPill';
import { DataFreshness } from '@shared/components/DataFreshness';
import { EmptyState } from '@shared/components/EmptyState';
import { PairFlags } from '@shared/components/PairFlags';
import { PairRow } from '@shared/components/PairRow';
import { SessionHero } from '@shared/components/SessionHero';
import { Skeleton } from '@shared/components/Skeleton';
import { Sparkline } from '@shared/components/Sparkline';
import { ArrowRightIcon, CalendarCheckIcon, CrosshairIcon, RefreshIcon } from '@shared/components/icons';
import { nextOpening, topShortlist, type SessionWindowView } from '@shared/radar/adapter';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { userApi, type CreditsData } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useRadarStore } from '../store/radarStore';
import { useMarketsUi } from '../store/marketsUi';
import { usePrefsStore, effectiveZone } from '../store/prefs';
import { RunRadar } from '../components/RunRadar';
import { fmtSessionRange } from '../utils/sessionFormat';

/**
 * Home (study 03, Portal adaptation). Greeting, gradient session hero with
 * artwork, analysis-freshness strip, Top 3 Shortlist from the last stored
 * scan, and the Open Radar / Continue Plan actions. Everything on this
 * screen is a read — the only credit-spending path is the explicit
 * confirmation inside RunRadar. Mounted at /app and (alias) /dashboard.
 */
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { overview, loading: sessionsLoading } = useSessions();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);
  const setupDone = usePrefsStore((s) => s.setupDone);
  const savedTz = usePrefsStore((s) => s.timezone);
  const zone = effectiveZone(savedTz);

  const lastResult = lastKey ? results[lastKey] : undefined;
  const shortlist = useMemo(() => (lastResult ? topShortlist(lastResult) : []), [lastResult]);

  // GET-only history hydration, once per account (see radarHydration).
  useEffect(() => {
    if (user?.id) void hydrateLatestRadar(user.id);
  }, [user?.id]);

  const loadCredits = () => {
    userApi
      .credits()
      .then((res) => {
        if (res.data.data) setCredits(res.data.data);
      })
      .catch(() => undefined);
  };

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

  const greeting = useMemo(() => {
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date()),
    );
    if (hour < 12) return 'Good Morning,';
    if (hour < 18) return 'Good Afternoon,';
    return 'Good Evening,';
  }, [zone]);

  const hero = useMemo(() => {
    if (!overview) return null;
    const activeWindow: SessionWindowView | undefined = overview.sessions.find(
      (s) => s.active && overview.active.includes(s.session),
    );
    const next = nextOpening(overview);
    if (activeWindow) {
      return {
        name: activeWindow.session,
        state: 'live' as const,
        stateLabel: overview.overlap ? 'LIVE · OVERLAP' : undefined,
        range: fmtSessionRange(activeWindow.sessionStartMs, activeWindow.sessionEndMs, activeWindow.zone),
        nextLabel: next
          ? `${next.session} ${fmtSessionRange(next.startMs, next.endMs, next.zone)}`
          : undefined,
      };
    }
    if (next) {
      return {
        name: next.session,
        state: overview.fxWeekOpen ? ('upcoming' as const) : ('closed' as const),
        stateLabel: overview.fxWeekOpen ? undefined : 'MARKET CLOSED',
        range: fmtSessionRange(next.startMs, next.endMs, next.zone),
        nextLabel: undefined,
      };
    }
    return null;
  }, [overview]);

  const runSession = hero?.name ?? overview?.selected ?? 'London';
  const marketsScope = useMarketsUi((s) => s.scope);

  const openInMarkets = (session: string, scope: string) => {
    useMarketsUi.getState().set({
      session,
      scope: scope === 'all' ? 'all' : 'watchlist',
    });
    navigate('/app/markets');
  };

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      {/* Greeting (reference 03). The credits pill takes the brand row's
          right slot — no DEMO badge: no production demo state exists. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-[var(--color-accent)]">{greeting}</p>
          <h1 className="mt-0.5 text-[34px] leading-[1.05] font-extrabold tracking-tight sm:text-[40px]">
            Session Focus Radar
          </h1>
          <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
            Professional discretionary FX analysis, session by session.
          </p>
        </div>
        {credits && <CreditPill credits={credits.balance} onClick={() => navigate('/app/credits')} />}
      </div>

      {/* Session hero — read-only clock data, zero paid calls. */}
      {sessionsLoading && !overview ? (
        <Skeleton height={196} className="rounded-[var(--radius-hero)]" />
      ) : hero ? (
        <SessionHero
          sessionName={hero.name}
          state={hero.state}
          stateLabel={hero.stateLabel}
          rangeLabel={hero.range}
          nextLabel={hero.nextLabel}
        />
      ) : (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">
            Session information unavailable right now.
          </p>
        </Card>
      )}

      {/* Analysis freshness strip (reference 03). */}
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 py-3.5">
        <RefreshIcon size={26} className="shrink-0 text-[var(--color-accent)]" />
        <span className="text-[15px] font-bold">Analysis Freshness</span>
        <span aria-hidden="true" className="h-8 w-px bg-[var(--color-border)]" />
        {lastResult ? (
          <DataFreshness timestamp={lastResult.timestampMs} className="text-[13px]" />
        ) : (
          <span className="text-[13px] text-[var(--color-text-muted)]">No scan yet</span>
        )}
      </div>

      {lastResult?.marketClosed && (
        <p role="status" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm">
          The last scan ran while the market was closed — treat it as the last available
          snapshot, not live data.
        </p>
      )}

      {/* Top 3 Shortlist (reference 03). */}
      <section aria-label="Top 3 shortlist" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight">Top 3 Shortlist</h2>
          {lastResult && (
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-[var(--color-accent)]"
              onClick={() => openInMarkets(lastResult.session, lastResult.scope)}
            >
              See Details <ArrowRightIcon size={18} />
            </button>
          )}
        </div>
        {lastResult ? (
          shortlist.length > 0 ? (
            <div className="space-y-2.5">
              {shortlist.map((p) => (
                <PairRow
                  key={p.pair}
                  variant="home"
                  pair={p.displayName}
                  status={p.status}
                  score={p.score}
                  leading={
                    <PairFlags pair={p.pair} base={p.base} quote={p.quote} kind={p.kind} name={p.displayName} />
                  }
                  sparkline={
                    <Sparkline
                      values={p.spark}
                      tone={p.bias === 'bearish' ? 'negative' : p.bias === 'bullish' ? 'positive' : 'neutral'}
                      label={`${p.displayName} hourly closes from the last scan`}
                    />
                  }
                  freshness={
                    p.stale ? (
                      <span className="font-semibold text-[var(--color-warning)]">Stale data</span>
                    ) : undefined
                  }
                  onClick={() => {
                    useMarketsUi.getState().set({
                      session: lastResult.session,
                      scope: lastResult.scope === 'all' ? 'all' : 'watchlist',
                    });
                    navigate(`/app/markets/${encodeURIComponent(p.pair)}`);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No pairs in the last scan"
                message="The last scan returned no ranked pairs. Open Markets to review the full result or run a new scan."
              />
            </Card>
          )
        ) : (
          <Card>
            <EmptyState
              title="No scan yet"
              message="Run a scan to see this session's focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits."
            />
          </Card>
        )}
      </section>

      {/* CTA row (reference 03). Open Radar opens the confirmation dialog —
          it never posts by itself. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setRunOpen(true)}
          className="flex min-h-[64px] flex-[1.2] items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
          style={{ background: 'var(--gradient-primary-action)' }}
        >
          <CrosshairIcon size={26} />
          Open Radar
          <ArrowRightIcon size={22} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/app/plan')}
          className="flex min-h-[64px] flex-1 items-center justify-center gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 text-lg font-bold text-[var(--color-text)] transition-transform active:scale-[0.99]"
        >
          <CalendarCheckIcon size={26} className="text-[var(--color-accent)]" />
          Continue Plan
          <ArrowRightIcon size={22} className="text-[var(--color-accent)]" />
        </button>
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

      {lastResult && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Last scan: {lastResult.session} session ·{' '}
          {lastResult.scope === 'watchlist' ? 'Watchlist scope' : 'All markets'} ·{' '}
          <Link to="/app/markets" className="font-semibold text-[var(--color-link)] underline">
            View full results in Markets
          </Link>
        </p>
      )}

      <RunRadar
        open={runOpen}
        session={runSession}
        scope={marketsScope}
        watchlist={user?.watchlist ?? []}
        onClose={() => {
          setRunOpen(false);
          loadCredits();
        }}
      />
    </div>
  );
}
