import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { CreditPill } from '@shared/components/CreditPill';
import { PairFlags } from '@shared/components/PairFlags';
import { PairRow } from '@shared/components/PairRow';
import { DataFreshness } from '@shared/components/DataFreshness';
import { ScoreEvidence, type EvidenceItem } from '@shared/components/ScoreEvidence';
import { ChartPanel } from '@shared/components/ChartPanel';
import { SessionHero } from '@shared/components/SessionHero';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import {
  adaptSessions,
  nextOpening,
  type RadarPairView,
  type RadarResultView,
  type SessionsOverviewView,
} from '@shared/radar/adapter';
import { analysisApi, userApi, type CreditsData } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore, radarKey, type RadarScope } from '../store/radarStore';
import { useMarketsUi, type StatusFilter } from '../store/marketsUi';
import { RunRadarSheet } from '../components/RunRadarSheet';
import { fmtSessionRange } from '../utils/sessionFormat';
import { SessionClock } from './SessionClock';
import { backButton } from '../telegram';

/**
 * Markets (formerly the combined Radar page). Session/scope/filter state
 * lives in the shared marketsUi store so Home's "See Details" and shortlist
 * taps land on the same scan, and state survives subview navigation.
 * Behavior is unchanged from the Z1 Radar page: browsing never spends
 * credits; only the RunRadarSheet confirmation posts.
 */

const SESSIONS = ['Asian', 'London', 'New York'] as const;
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'watch', label: 'Watch' },
  { id: 'avoid', label: 'Avoid' },
];

function evidenceFor(p: RadarPairView): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const num = (v: number, dec = p.dec) => v.toFixed(dec);
  if (p.orHave && p.orHigh !== null) items.push({ label: 'Opening range high', value: num(p.orHigh) });
  if (p.orHave && p.orLow !== null) items.push({ label: 'Opening range low', value: num(p.orLow) });
  if (p.orHave) items.push({ label: 'OR breakout confirmed', value: p.orConfirmed ? 'Yes' : 'No' });
  if (p.orHave) items.push({ label: 'OR live', value: p.orLive ? 'Yes' : 'No' });
  if (p.adrPct !== null) items.push({ label: 'ADR %', value: `${p.adrPct}` });
  if (p.rsi !== null) items.push({ label: 'RSI', value: p.rsi.toFixed(1) });
  if (p.atr15 !== null) items.push({ label: 'ATR (15m)', value: num(p.atr15, 5) });
  if (p.d4 !== null) items.push({ label: '4H directional evidence', value: `${p.d4}` });
  if (p.d1 !== null) items.push({ label: '1H directional evidence', value: `${p.d1}` });
  if (p.d15 !== null) items.push({ label: '15m directional evidence', value: `${p.d15}` });
  if (p.div) items.push({ label: 'RSI divergence', value: p.div === 'BULLISH' ? 'Bullish' : 'Bearish' });
  if (p.obstacle !== null) items.push({ label: 'Obstacle', value: num(p.obstacle) });
  if (p.roomATR !== null) items.push({ label: 'Room (ATR)', value: `${p.roomATR}` });
  if (p.cramped) items.push({ label: 'Cramped', value: 'Yes' });
  if (p.stretched) items.push({ label: 'Stretched', value: 'Yes' });
  if (p.divAgainst) items.push({ label: 'Divergence against bias', value: 'Yes' });
  if (p.extended) items.push({ label: 'Extended', value: 'Yes' });
  return items;
}

function PairDetail({ pair, result, onBack }: { pair: RadarPairView; result: RadarResultView; onBack: () => void }) {
  useEffect(() => {
    backButton.show();
    backButton.onClick(onBack);
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [onBack]);

  const candleTs = pair.ts15 ?? pair.ts1 ?? pair.ts4;
  return (
    <div className="space-y-4 px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} ariaLabel="Back to results">
          ← Back
        </Button>
        <h1 className="text-xl font-bold">{pair.displayName}</h1>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {result.session} session · Scan <span className="tnum">{new Date(result.timestampMs).toLocaleString()}</span>
      </p>
      <ScoreEvidence score={pair.score} evidence={evidenceFor(pair)} timestamp={candleTs ?? result.timestampMs} />
      {pair.stale && (
        <p role="status" className="font-semibold text-[var(--color-warning)]">
          This pair's data was flagged stale in the scan.
        </p>
      )}
      {/* No candle API / validated TradingView symbol mapping exists in code,
          so the chart stays in its honest unavailable state with no link. */}
      <ChartPanel state="unavailable" unavailableReason="Candles are not available in the Mini App yet. The scan evidence above is the data this result is based on." />
    </div>
  );
}

export default function Markets({ onOpenCredits }: { onOpenCredits: () => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const setResult = useRadarStore((s) => s.setResult);
  const resultsVersion = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);

  const session = useMarketsUi((s) => s.session);
  const scope = useMarketsUi((s) => s.scope);
  const filter = useMarketsUi((s) => s.filter);
  const selectedPairCode = useMarketsUi((s) => s.selectedPairCode);
  const { setSession, setScope, setFilter, adoptSession, setSelectedPairCode } = useMarketsUi.getState();

  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPair, setSelectedPair] = useState<RadarPairView | null>(null);
  const [showClock, setShowClock] = useState(false);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await analysisApi.getSessions();
      const view = adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]);
      setOverview(view);
      setSessionsError('');
      adoptSession(view.selected);
    } catch {
      setSessionsError('Session clock unavailable right now.');
    } finally {
      setSessionsLoading(false);
    }
  }, [adoptSession]);

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

  const effectiveSession = session || overview?.selected || 'London';
  const stored: RadarResultView | undefined = resultsVersion[radarKey(userId, effectiveSession, scope)];
  const lastResult: RadarResultView | undefined = lastKey ? resultsVersion[lastKey] : undefined;
  const lastParts = lastKey?.split('::') ?? [];
  const lastSession = lastParts[1];
  const lastScope = (lastParts[2] as RadarScope | undefined) ?? 'watchlist';

  // Home shortlist taps arrive via selectedPairCode: open that pair's detail
  // from the stored result once it is available.
  useEffect(() => {
    if (!selectedPairCode) return;
    const hit = stored?.all.find((p) => p.pair === selectedPairCode) ?? lastResult?.all.find((p) => p.pair === selectedPairCode);
    if (hit) {
      setSelectedPair(hit);
      setSelectedPairCode(null);
    }
  }, [selectedPairCode, stored, lastResult, setSelectedPairCode]);

  const visiblePairs = useMemo(() => {
    if (!stored) return [];
    return filter === 'all' ? stored.all : stored.all.filter((p) => p.status === filter);
  }, [stored, filter]);

  const heroWindow = overview?.sessions.find((s) => s.session === effectiveSession);
  const heroActive = heroWindow?.active ?? false;
  const next = overview ? nextOpening(overview) : null;

  if (selectedPair && (stored ?? lastResult)) {
    return (
      <PairDetail
        pair={selectedPair}
        result={stored ?? (lastResult as RadarResultView)}
        onBack={() => setSelectedPair(null)}
      />
    );
  }

  if (showClock) {
    return (
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowClock(false)} ariaLabel="Back to Markets">← Back</Button>
          <h1 className="text-xl font-bold">Session Clock</h1>
        </div>
        <SessionClock overview={overview} loading={sessionsLoading} error={sessionsError} onRetry={() => void loadSessions()} />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Markets</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Session-by-session FX focus, from real scans.</p>
        </div>
        {credits && <CreditPill credits={credits.balance} onClick={onOpenCredits} />}
      </div>

      {/* Session hero — read-only data, zero paid calls. */}
      {sessionsLoading && !overview ? (
        <Skeleton height={150} className="rounded-[var(--radius-hero)]" />
      ) : heroWindow ? (
        <SessionHero
          sessionName={heroWindow.session}
          state={heroActive ? 'live' : overview && !overview.fxWeekOpen ? 'closed' : 'upcoming'}
          stateLabel={overview && !overview.fxWeekOpen ? 'MARKET CLOSED' : undefined}
          rangeLabel={fmtSessionRange(heroWindow.sessionStartMs, heroWindow.sessionEndMs, heroWindow.zone)}
          nextLabel={next ? `${next.session} ${fmtSessionRange(next.startMs, next.endMs, next.zone)}` : undefined}
        />
      ) : (
        <div className="rounded-[var(--radius-lg)] p-4 text-white shadow-[var(--shadow-md)]" style={{ background: 'var(--grad-hero)' }}>
          <p className="text-sm">Session information unavailable. <button type="button" className="underline" onClick={() => void loadSessions()}>Retry</button></p>
        </div>
      )}
      <div>
        <Button variant="secondary" size="sm" onClick={() => setShowClock(true)}>Session Clock</Button>
      </div>

      {/* Session + scope selection — changing these NEVER runs a paid scan. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Session">
        {SESSIONS.map((s) => (
          <button key={s} type="button" aria-pressed={effectiveSession === s}
            onClick={() => { setSession(s); setSelectedPair(null); }}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold border ${effectiveSession === s ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] border-transparent' : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2" role="group" aria-label="Scan scope">
        {([['watchlist', 'My watchlist'], ['all', 'All markets']] as [RadarScope, string][]).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={scope === id}
            onClick={() => { setScope(id); setSelectedPair(null); }}
            className={`min-h-[44px] flex-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold border ${scope === id ? 'bg-[var(--color-accent-soft)] text-[var(--color-text)] border-[var(--color-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
            {label}
          </button>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={() => setSheetOpen(true)}>
        Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
      </Button>

      {stored?.marketClosed && (
        <div role="status" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm">
          <p className="font-semibold">Market closed</p>
          <p className="mt-0.5">
            This scan ran while the market was closed
            {stored.closedAssets.length ? ` (closed: ${stored.closedAssets.join(', ')})` : ''}. Treat its
            results as the last available snapshot, not live data.
          </p>
        </div>
      )}
      {stored && stored.warnings.length > 0 && (
        <div role="status" className="rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm">
          {stored.warnings.map((w) => (<p key={w}>{w}</p>))}
        </div>
      )}

      {stored ? (
        <section aria-label="Radar results" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Results · {stored.session}</h2>
            <DataFreshness timestamp={stored.timestampMs} label="Scanned" />
          </div>
          {!stored.orReady && <p className="text-sm text-[var(--color-text-muted)]">Opening range was not ready for this scan.</p>}
          {stored.skippedCount > 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">{stored.skippedCount} pair{stored.skippedCount === 1 ? '' : 's'} skipped (no usable data).</p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                className={`min-h-[36px] rounded-full px-3 text-[13px] font-semibold border ${filter === f.id ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] border-transparent' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {visiblePairs.length === 0 ? (
            <EmptyState title="No pairs in this group" message="This scan returned no pairs with this status. Try another filter." />
          ) : (
            <div className="space-y-2">
              {visiblePairs.map((p) => (
                <PairRow key={p.pair} pair={p.displayName} status={p.status} bias={p.bias} score={p.score}
                  leading={<PairFlags pair={p.pair} base={p.base} quote={p.quote} kind={p.kind} name={p.displayName} size={38} />}
                  freshness={p.stale ? <span className="font-semibold text-[var(--color-warning)]">Stale data</span> : undefined}
                  onClick={() => setSelectedPair(p)} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <Card>
          <EmptyState
            title="No scan yet"
            message={
              lastResult
                ? `No scan stored for ${effectiveSession} · ${scope === 'watchlist' ? 'watchlist' : 'all markets'} yet. Your last scan was ${lastResult.session} (${new Date(lastResult.timestampMs).toLocaleString()}).`
                : 'Run a scan to see this session’s focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits.'
            }
            action={
              lastResult ? (
                <Button variant="secondary" onClick={() => { setSession(lastSession ?? lastResult.session); setScope(lastScope); }}>
                  View last scan
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      <RunRadarSheet
        open={sheetOpen}
        session={effectiveSession}
        scope={scope}
        watchlist={user?.watchlist ?? []}
        onClose={() => setSheetOpen(false)}
        onSuccess={(view) => {
          setResult(radarKey(userId, effectiveSession, scope), view);
          void loadCredits();
        }}
        onOpenCredits={onOpenCredits}
      />
    </div>
  );
}
