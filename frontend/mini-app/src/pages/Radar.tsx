import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { CreditPill } from '@shared/components/CreditPill';
import { PairRow } from '@shared/components/PairRow';
import { DataFreshness } from '@shared/components/DataFreshness';
import { ScoreEvidence, type EvidenceItem } from '@shared/components/ScoreEvidence';
import { ChartPanel } from '@shared/components/ChartPanel';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import {
  adaptSessions,
  type RadarPairView,
  type RadarResultView,
  type SessionsOverviewView,
} from '@shared/radar/adapter';
import { analysisApi, userApi, type CreditsData } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore, radarKey, type RadarScope } from '../store/radarStore';
import { RunRadarSheet } from '../components/RunRadarSheet';
import { SessionClock } from './SessionClock';
import { backButton } from '../telegram';

const SESSIONS = ['Asian', 'London', 'New York'] as const;
type StatusFilter = 'all' | 'focus' | 'watch' | 'avoid';
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'watch', label: 'Watch' },
  { id: 'avoid', label: 'Avoid' },
];

function fmtTime(ms: number): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(ms));
}

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

export default function Radar({ goToTab }: { goToTab: (tab: 'credits') => void }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const setResult = useRadarStore((s) => s.setResult);
  const resultsVersion = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);

  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [session, setSession] = useState<string>('London');
  const [sessionTouched, setSessionTouched] = useState(false);
  const [scope, setScope] = useState<RadarScope>('watchlist');
  const [filter, setFilter] = useState<StatusFilter>('all');
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
      setSession((prev) => prev || view.selected);
      if (!sessionTouched) setSession(view.selected);
    } catch {
      setSessionsError('Session clock unavailable right now.');
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionTouched]);

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

  const stored: RadarResultView | undefined = resultsVersion[radarKey(userId, session, scope)];
  const lastResult: RadarResultView | undefined = lastKey ? resultsVersion[lastKey] : undefined;
  const lastParts = lastKey?.split('::') ?? [];
  const lastSession = lastParts[1];
  const lastScope = (lastParts[2] as RadarScope | undefined) ?? 'watchlist';

  const visiblePairs = useMemo(() => {
    if (!stored) return [];
    return filter === 'all' ? stored.all : stored.all.filter((p) => p.status === filter);
  }, [stored, filter]);

  const activeNames = overview?.active ?? [];
  const heroSession = activeNames.length > 0 ? activeNames.join(' + ') : overview?.selected;

  if (selectedPair && stored) {
    return <PairDetail pair={selectedPair} result={stored} onBack={() => setSelectedPair(null)} />;
  }

  if (showClock) {
    return (
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowClock(false)} ariaLabel="Back to Radar">← Back</Button>
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
          <h1 className="text-2xl font-bold">Session Focus Radar</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Session-by-session FX focus, from real scans.</p>
        </div>
        {credits && <CreditPill credits={credits.balance} onClick={() => goToTab('credits')} />}
      </div>

      {/* Session hero (studies 03+04) — read-only data, zero paid calls. */}
      <div className="rounded-[var(--radius-lg)] p-4 text-white shadow-[var(--shadow-md)]" style={{ background: 'var(--grad-hero)' }}>
        {sessionsLoading && !overview ? (
          <Skeleton height={72} />
        ) : overview ? (
          <>
            <p className="text-sm opacity-80">{heroSession} Session{activeNames.length ? '' : ' (selected)'}</p>
            <p className="mt-0.5 text-2xl font-bold">
              {activeNames.length ? `${heroSession} · Live` : overview.fxWeekOpen ? 'No session live now' : 'Market week closed'}
            </p>
            {overview.nextTransition && (
              <p className="tnum mt-1 text-sm opacity-90">
                Next: {overview.nextTransition.session} {overview.nextTransition.kind} at {fmtTime(overview.nextTransition.atMs)}
              </p>
            )}
            {overview.overlap && <p className="mt-1 text-sm opacity-90">Sessions overlap right now.</p>}
          </>
        ) : (
          <p className="text-sm">Session information unavailable. <button type="button" className="underline" onClick={() => void loadSessions()}>Retry</button></p>
        )}
        <div className="mt-3">
          <Button variant="secondary" size="sm" onClick={() => setShowClock(true)}>Session Clock</Button>
        </div>
      </div>

      {/* Session + scope selection — changing these NEVER runs a paid scan. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Session">
        {SESSIONS.map((s) => (
          <button key={s} type="button" aria-pressed={session === s}
            onClick={() => { setSession(s); setSessionTouched(true); setSelectedPair(null); }}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold border ${session === s ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] border-transparent' : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'}`}>
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
                ? `No scan stored for ${session} · ${scope === 'watchlist' ? 'watchlist' : 'all markets'} yet. Your last scan was ${lastResult.session} (${new Date(lastResult.timestampMs).toLocaleString()}).`
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
        session={session}
        scope={scope}
        watchlist={user?.watchlist ?? []}
        onClose={() => setSheetOpen(false)}
        onSuccess={(view) => {
          setResult(radarKey(userId, session, scope), view);
          void loadCredits();
        }}
        onOpenCredits={() => goToTab('credits')}
      />
    </div>
  );
}
