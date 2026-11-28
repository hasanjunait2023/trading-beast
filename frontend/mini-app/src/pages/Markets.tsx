import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { CreditPill } from '@shared/components/CreditPill';
import { DataFreshness } from '@shared/components/DataFreshness';
import { EmptyState } from '@shared/components/EmptyState';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import { PairFlags } from '@shared/components/PairFlags';
import { PairRow } from '@shared/components/PairRow';
import { Skeleton } from '@shared/components/Skeleton';
import { UnavailableState } from '@shared/components/UnavailableState';
import {
  ArrowRightIcon,
  MarketsIcon,
  SearchIcon,
} from '@shared/components/icons';
import {
  adaptSessions,
  type RadarPairView,
  type RadarResultView,
} from '@shared/radar/adapter';
import {
  analysisApi,
  userApi,
  type CreditsData,
  type InstrumentEntry,
} from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore, radarKey, type RadarScope } from '../store/radarStore';
import { useMarketsUi, type StatusFilter } from '../store/marketsUi';
import { RunRadarSheet } from '../components/RunRadarSheet';
import { PairDetail } from './PairDetail';

/**
 * Markets (reference 04). Brand row, candlestick-art hero, session
 * segmented control, instrument search, status filter chips, scope,
 * Currency Strength entry, the paid Run Radar action, and the instrument
 * list merging the stored scan with the catalog: ranked pairs show their
 * real score/status, catalog pairs outside the scan are "Unranked" —
 * never "Unavailable" and never given invented scores. Browsing, searching,
 * filtering and session/scope changes NEVER spend credits; only the
 * RunRadarSheet confirmation posts.
 */

const SESSIONS = ['Asian', 'London', 'New York'] as const;
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'watch', label: 'Watch' },
  { id: 'avoid', label: 'Avoid' },
];

/** Full currency names for the reference's "Euro / US Dollar" row
 *  subtitles. The catalog's FX `name` is the pair code itself, so names
 *  are formed locally for the eight catalog currencies (plan §7). */
const CURRENCY_NAMES: Record<string, string> = {
  EUR: 'Euro',
  GBP: 'British Pound',
  USD: 'US Dollar',
  JPY: 'Japanese Yen',
  CHF: 'Swiss Franc',
  AUD: 'Australian Dollar',
  NZD: 'New Zealand Dollar',
  CAD: 'Canadian Dollar',
};

function fxFullName(base?: string | null, quote?: string | null): string | undefined {
  if (base && quote && CURRENCY_NAMES[base] && CURRENCY_NAMES[quote]) {
    return `${CURRENCY_NAMES[base]} / ${CURRENCY_NAMES[quote]}`;
  }
  return undefined;
}

interface RowModel {
  code: string;
  /** Full display name for the row subtitle (undefined = code only). */
  name?: string;
  kind: 'fx' | 'asset';
  base: string | null;
  quote: string | null;
  dec: number;
  ranked?: RadarPairView;
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
  const search = useMarketsUi((s) => s.search);
  const selectedPairCode = useMarketsUi((s) => s.selectedPairCode);
  const { setSession, setScope, setFilter, setSearch, adoptSession, setSelectedPairCode } =
    useMarketsUi.getState();

  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [catalog, setCatalog] = useState<InstrumentEntry[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<{ pair: RadarPairView; name?: string } | null>(null);
  const [showStrength, setShowStrength] = useState(false);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const loadSessions = useCallback(async () => {
    try {
      const res = await analysisApi.getSessions();
      const view = adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]);
      adoptSession(view.selected);
    } catch {
      /* the store's fallback session keeps the screen usable */
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

  const loadCatalog = useCallback(async () => {
    try {
      const res = await analysisApi.getInstruments();
      if (Array.isArray(res.data.data)) setCatalog(res.data.data);
    } catch {
      /* rows fall back to scan pairs + watchlist codes without names */
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);
  useEffect(() => { void loadCredits(); }, [loadCredits]);
  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  // GET-only history hydration, once per account (see radarHydration).
  useEffect(() => { if (userId) void hydrateLatestRadar(userId); }, [userId]);

  const effectiveSession = session || 'London';
  const stored: RadarResultView | undefined = resultsVersion[radarKey(userId, effectiveSession, scope)];
  const lastResult: RadarResultView | undefined = lastKey ? resultsVersion[lastKey] : undefined;
  const lastParts = lastKey?.split('::') ?? [];
  const lastSession = lastParts[1];
  const lastScope = (lastParts[2] as RadarScope | undefined) ?? 'watchlist';
  const watchlist = useMemo(() => user?.watchlist ?? [], [user?.watchlist]);

  // Home shortlist taps arrive via selectedPairCode: open that pair's detail
  // from a stored result once it is available.
  useEffect(() => {
    if (!selectedPairCode) return;
    const hit =
      stored?.all.find((p) => p.pair === selectedPairCode) ??
      lastResult?.all.find((p) => p.pair === selectedPairCode);
    if (hit) {
      setSelected({ pair: hit, name: hit.kind === 'fx' ? fxFullName(hit.base, hit.quote) : undefined });
      setSelectedPairCode(null);
    }
  }, [selectedPairCode, stored, lastResult, setSelectedPairCode]);

  const rows = useMemo<RowModel[]>(() => {
    const catalogByCode = new Map(catalog.map((i) => [i.code, i]));
    const nameFor = (
      code: string,
      kind: 'fx' | 'asset',
      base: string | null,
      quote: string | null,
    ): string | undefined => {
      const entry = catalogByCode.get(code);
      if (entry && entry.name && entry.name !== code) return entry.name;
      return kind === 'fx' ? fxFullName(base, quote) : undefined;
    };

    const ranked: RowModel[] = (stored?.all ?? []).map((p) => ({
      code: p.pair,
      name: nameFor(p.pair, p.kind, p.base, p.quote),
      kind: p.kind,
      base: p.base,
      quote: p.quote,
      dec: p.dec,
      ranked: p,
    }));
    const rankedCodes = new Set(ranked.map((r) => r.code));

    const pool = catalog.length > 0 ? catalog.map((i) => i.code) : [...watchlist];
    const unranked: RowModel[] = pool
      .filter((code) => !rankedCodes.has(code))
      .filter((code) => scope === 'all' || watchlist.includes(code))
      .map((code) => {
        const entry = catalogByCode.get(code);
        const kind = entry?.kind ?? (code.includes('/') ? 'fx' : 'asset');
        const [b, q] = code.includes('/') ? code.split('/') : [null, null];
        const base = entry?.base ?? b;
        const quote = entry?.quote ?? q;
        return {
          code,
          name: nameFor(code, kind, base, quote),
          kind,
          base,
          quote,
          dec: entry?.decimals ?? 5,
        };
      });

    const sortedRanked = [...ranked].sort((a, b) =>
      sortDir === 'desc'
        ? (b.ranked?.score ?? 0) - (a.ranked?.score ?? 0)
        : (a.ranked?.score ?? 0) - (b.ranked?.score ?? 0),
    );
    const sortedUnranked = [...unranked].sort((a, b) => a.code.localeCompare(b.code));
    return [...sortedRanked, ...sortedUnranked];
  }, [catalog, stored, scope, watchlist, sortDir]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.ranked?.status !== filter) return false;
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, filter, search]);

  if (selected && (stored ?? lastResult)) {
    return (
      <PairDetail
        pair={selected.pair}
        result={stored ?? (lastResult as RadarResultView)}
        fullName={selected.name}
        onBack={() => setSelected(null)}
      />
    );
  }

  if (showStrength) {
    return (
      <div className="space-y-4 px-4">
        <div className="flex items-center gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={() => setShowStrength(false)} ariaLabel="Back to Markets">
            ← Markets
          </Button>
          <h1 className="text-xl font-bold">Currency Strength</h1>
        </div>
        <Card>
          <UnavailableState
            title="Currency strength unavailable"
            reason="Currency strength needs a validated methodology and a signed-off data source. Until both exist, this screen shows no strength values rather than invented ones."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4">
      {/* Brand row — credits pill takes the reference's top-right slot
          (no DEMO badge: no production demo state exists to label). */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Brand size={36} />
        {credits && <CreditPill credits={credits.balance} onClick={onOpenCredits} />}
      </div>

      {/* Markets hero (reference 04) — decorative candlestick artwork,
          explicitly not a data chart. */}
      <section
        aria-label="Markets"
        className="relative overflow-hidden rounded-[var(--radius-hero)] text-white shadow-[var(--shadow-hero)]"
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
        <div className="relative p-5">
          <h1 className="text-[42px] leading-none font-extrabold tracking-tight">Markets</h1>
          <p className="mt-2.5 max-w-[250px] text-[15px] leading-snug text-white/90">
            Professional discretionary FX analysis, with context, setups and clear bias.
          </p>
        </div>
      </section>

      {/* Session segmented control — changing it NEVER runs a paid scan. */}
      <div
        className="flex rounded-full bg-[var(--color-control-track)] p-1"
        role="group"
        aria-label="Session"
      >
        {SESSIONS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={effectiveSession === s}
            onClick={() => { setSession(s); setSelected(null); }}
            className={`min-h-[50px] flex-1 rounded-full px-2 text-[15px] font-bold ${
              effectiveSession === s ? 'text-white shadow-[var(--shadow-row)]' : 'text-[var(--color-text)]'
            }`}
            style={effectiveSession === s ? { background: 'var(--gradient-primary-action)' } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search — local catalog/result filtering only. */}
      <div className="relative">
        <SearchIcon
          size={21}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search instruments (e.g., EUR/USD)"
          aria-label="Search instruments"
          className="min-h-[54px] w-full rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] pr-4 pl-12 text-[15px] text-[var(--color-text)] shadow-[var(--shadow-row)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
        />
      </div>

      {/* Status filter chips. */}
      <div className="flex gap-2" role="group" aria-label="Status filter">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`min-h-[48px] flex-1 rounded-full px-2 text-[15px] font-bold ${
              filter === f.id
                ? 'text-white shadow-[var(--shadow-row)]'
                : 'bg-[var(--color-control-track)] text-[var(--color-text)]'
            }`}
            style={filter === f.id ? { background: 'var(--gradient-primary-action)' } : undefined}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Scope — preserved feature (reference crop doesn't show it; the
          handoff forbids deleting it). */}
      <div
        className="flex rounded-full bg-[var(--color-control-track)] p-1"
        role="group"
        aria-label="Scan scope"
      >
        {([['watchlist', 'My watchlist'], ['all', 'All markets']] as [RadarScope, string][]).map(
          ([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={scope === id}
              onClick={() => { setScope(id); setSelected(null); }}
              className={`min-h-[42px] flex-1 rounded-full px-2 text-sm font-bold ${
                scope === id
                  ? 'bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-row)]'
                  : 'text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {/* Currency Strength entry (reference 04) — honest unavailable state
          until the strength endpoint stops returning 503 by design. */}
      <button
        type="button"
        onClick={() => setShowStrength(true)}
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 py-4 text-left transition-transform active:scale-[0.99]"
      >
        <MarketsIcon size={24} className="shrink-0 text-[var(--color-accent)]" />
        <span className="text-[17px] font-extrabold tracking-tight text-[var(--color-text)]">
          Currency Strength
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Unavailable</span>
          <ArrowRightIcon size={20} className="text-[var(--color-accent)]" />
        </span>
      </button>

      {/* The one paid action on this screen — opens confirmation only. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex min-h-[56px] w-full items-center justify-center rounded-[var(--radius-lg)] px-4 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
        style={{ background: 'var(--gradient-primary-action)' }}
      >
        Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
      </button>

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

      {!stored && (
        <Card>
          <EmptyState
            title="No scan yet"
            message={
              lastResult
                ? `No scan stored for ${effectiveSession} · ${scope === 'watchlist' ? 'watchlist' : 'all markets'} yet. Your last scan was ${lastResult.session} (${new Date(lastResult.timestampMs).toLocaleString()}). The instruments below are unranked until a scan covers them.`
                : 'Run a scan to see this session’s focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits. The instruments below are unranked until a scan covers them.'
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

      <section aria-label="Instruments" className="space-y-2.5">
        <div className="flex items-end justify-between gap-3 px-1">
          <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">
            {stored ? `Results · ${stored.session}` : 'Instrument'}
          </span>
          {stored ? (
            <span className="flex items-center gap-3">
              <DataFreshness timestamp={stored.timestampMs} label="Scanned" className="text-[12px]" />
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                aria-label={`Sort by score ${sortDir === 'desc' ? 'descending' : 'ascending'}; tap to change`}
                className="text-[15px] font-bold text-[var(--color-accent)]"
              >
                Score {sortDir === 'desc' ? '↓' : '↑'}
              </button>
            </span>
          ) : (
            <span className="text-[15px] font-semibold text-[var(--color-text-muted)]">Score</span>
          )}
        </div>
        {stored && !stored.orReady && (
          <p className="px-1 text-sm text-[var(--color-text-muted)]">Opening range was not ready for this scan.</p>
        )}
        {stored && stored.skippedCount > 0 && (
          <p className="px-1 text-sm text-[var(--color-text-muted)]">
            {stored.skippedCount} pair{stored.skippedCount === 1 ? '' : 's'} skipped (no usable data) — they appear as Unranked below.
          </p>
        )}
        {visibleRows.length === 0 ? (
          <EmptyState
            title="No instruments match"
            message={
              search.trim()
                ? 'No instrument matches your search. Try a pair code like EUR/USD.'
                : 'This scan returned no pairs with this status. Try another filter.'
            }
          />
        ) : (
          visibleRows.map((r) => {
            const ranked = r.ranked;
            return (
              <PairRow
                key={r.code}
                variant="markets"
                pair={r.code}
                name={r.name}
                status={ranked?.status ?? 'unavailable'}
                score={ranked?.score}
                unranked={!ranked}
                leading={
                  <PairFlags pair={r.code} base={r.base} quote={r.quote} kind={r.kind} name={r.name ?? r.code} size={44} />
                }
                freshness={
                  ranked?.stale ? (
                    <span className="mt-0.5 block text-[12px] font-semibold text-[var(--color-warning)]">
                      Stale data
                    </span>
                  ) : undefined
                }
                onClick={
                  ranked
                    ? () => setSelected({ pair: ranked, name: ranked.kind === 'fx' ? r.name : undefined })
                    : undefined
                }
              />
            );
          })
        )}
        {catalog.length === 0 && !stored && (
          <Skeleton height={72} className="rounded-[var(--radius-row)]" />
        )}
      </section>

      <RunRadarSheet
        open={sheetOpen}
        session={effectiveSession}
        scope={scope}
        watchlist={watchlist}
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
