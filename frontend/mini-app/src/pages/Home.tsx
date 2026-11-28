import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Card } from '@shared/components/Card';
import { CreditPill } from '@shared/components/CreditPill';
import { DataFreshness } from '@shared/components/DataFreshness';
import { EmptyState } from '@shared/components/EmptyState';
import { PairFlags } from '@shared/components/PairFlags';
import { PairRow } from '@shared/components/PairRow';
import { SessionHero } from '@shared/components/SessionHero';
import { Skeleton } from '@shared/components/Skeleton';
import { Sparkline } from '@shared/components/Sparkline';
import { ArrowRightIcon, CalendarCheckIcon, CrosshairIcon, RefreshIcon } from '@shared/components/icons';
import {
  adaptSessions,
  nextOpening,
  topShortlist,
  type SessionWindowView,
  type SessionsOverviewView,
} from '@shared/radar/adapter';
import { analysisApi, userApi, type CreditsData } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore, radarKey } from '../store/radarStore';
import { useMarketsUi } from '../store/marketsUi';
import { RunRadarSheet } from '../components/RunRadarSheet';
import { fmtSessionRange } from '../utils/sessionFormat';
import type { Tab } from '../App';

/**
 * Home (reference 03). Brand row, greeting, gradient session hero with
 * artwork, analysis-freshness strip, Top 3 Shortlist from the last stored
 * scan, and the Open Radar / Continue Plan actions. Everything on this
 * screen is a read — the only credit-spending path is the explicit
 * confirmation inside RunRadarSheet.
 */

const fmtRange = fmtSessionRange;

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23' }).format(new Date()),
  );
  if (hour < 12) return 'Good Morning,';
  if (hour < 18) return 'Good Afternoon,';
  return 'Good Evening,';
}

export default function Home({
  goToTab,
  onOpenCredits,
}: {
  goToTab: (tab: Tab) => void;
  onOpenCredits: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);
  const setResult = useRadarStore((s) => s.setResult);
  const marketsUi = useMarketsUi();

  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await analysisApi.getSessions();
      const view = adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]);
      setOverview(view);
      setSessionsError(false);
      useMarketsUi.getState().adoptSession(view.selected);
    } catch {
      setSessionsError(true);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadCredits = useCallback(async () => {
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
    } catch {
      /* credit pill simply stays hidden until a read succeeds */
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);
  useEffect(() => { void loadCredits(); }, [loadCredits]);
  // GET-only history hydration, once per account (see radarHydration).
  useEffect(() => { if (userId) void hydrateLatestRadar(userId); }, [userId]);

  const lastResult = lastKey ? results[lastKey] : undefined;
  const shortlist = useMemo(() => (lastResult ? topShortlist(lastResult) : []), [lastResult]);

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
        range: fmtRange(activeWindow.sessionStartMs, activeWindow.sessionEndMs, activeWindow.zone),
        nextLabel: next ? `${next.session} ${fmtRange(next.startMs, next.endMs, next.zone)}` : undefined,
      };
    }
    if (next) {
      const win = overview.sessions.find((s) => s.session === next.session);
      return {
        name: next.session,
        state: overview.fxWeekOpen ? ('upcoming' as const) : ('closed' as const),
        stateLabel: overview.fxWeekOpen ? undefined : 'MARKET CLOSED',
        range: win ? fmtRange(next.startMs, next.endMs, next.zone) : '',
        nextLabel: undefined,
      };
    }
    return null;
  }, [overview]);

  const sheetSession = marketsUi.session || overview?.selected || 'London';
  const sheetScope = marketsUi.scope;

  const openInMarkets = (session: string, scope: string, pairCode?: string) => {
    const ui = useMarketsUi.getState();
    ui.setSession(session);
    ui.setScope(scope === 'all' ? 'all' : 'watchlist');
    if (pairCode) ui.setSelectedPairCode(pairCode);
    goToTab('markets');
  };

  return (
    <div className="space-y-5 px-4">
      {/* Brand row — credits pill takes the reference's top-right slot
          (no DEMO badge: no production demo state exists to label). */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Brand size={36} />
        {credits && <CreditPill credits={credits.balance} onClick={onOpenCredits} />}
      </div>

      <div>
        <p className="text-xl font-semibold text-[var(--color-accent)]">{greeting()}</p>
        <h1 className="mt-0.5 text-[38px] leading-[1.05] font-extrabold tracking-tight text-[var(--color-text)]">
          Session Focus Radar
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
          Professional discretionary FX analysis, session by session.
        </p>
      </div>

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
            Session information unavailable right now.{' '}
            <button type="button" className="font-semibold text-[var(--color-link)] underline" onClick={() => void loadSessions()}>
              Retry
            </button>
          </p>
          {sessionsError && <span className="sr-only">Session clock failed to load.</span>}
        </Card>
      )}

      {/* Analysis freshness strip (reference 03). */}
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 py-3.5">
        <RefreshIcon size={26} className="shrink-0 text-[var(--color-accent)]" />
        <span className="text-[15px] font-bold text-[var(--color-text)]">Analysis Freshness</span>
        <span aria-hidden="true" className="h-8 w-px bg-[var(--color-border)]" />
        {lastResult ? (
          <DataFreshness timestamp={lastResult.timestampMs} className="text-[13px]" />
        ) : (
          <span className="text-[13px] text-[var(--color-text-muted)]">No scan yet</span>
        )}
      </div>

      {lastResult?.marketClosed && (
        <p role="status" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm">
          The last scan ran while the market was closed — treat it as the last available snapshot, not live data.
        </p>
      )}

      <section aria-label="Top 3 shortlist" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Top 3 Shortlist</h2>
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
                  p.stale ? <span className="font-semibold text-[var(--color-warning)]">Stale data</span> : undefined
                }
                onClick={() => openInMarkets(lastResult.session, lastResult.scope, p.pair)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              title="No scan yet"
              message="Run a scan to see this session's focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits."
            />
          </Card>
        )}
      </section>

      {/* CTA row (reference 03). */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-[64px] flex-[1.2] items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
          style={{ background: 'var(--gradient-primary-action)' }}
        >
          <CrosshairIcon size={26} />
          Open Radar
          <ArrowRightIcon size={22} />
        </button>
        <button
          type="button"
          onClick={() => goToTab('plan')}
          className="flex min-h-[64px] flex-1 items-center justify-center gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 text-lg font-bold text-[var(--color-text)] transition-transform active:scale-[0.99]"
        >
          <CalendarCheckIcon size={26} className="text-[var(--color-accent)]" />
          Continue Plan
          <ArrowRightIcon size={22} className="text-[var(--color-accent)]" />
        </button>
      </div>

      <RunRadarSheet
        open={sheetOpen}
        session={sheetSession}
        scope={sheetScope}
        watchlist={user?.watchlist ?? []}
        onClose={() => setSheetOpen(false)}
        onSuccess={(view) => {
          setResult(radarKey(userId, sheetSession, sheetScope), view);
          void loadCredits();
        }}
        onOpenCredits={onOpenCredits}
      />
    </div>
  );
}
