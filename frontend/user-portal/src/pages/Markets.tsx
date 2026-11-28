import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { CreditPill } from '@shared/components/CreditPill';
import { DataFreshness } from '@shared/components/DataFreshness';
import { EmptyState } from '@shared/components/EmptyState';
import { PairFlags } from '@shared/components/PairFlags';
import { PairRow } from '@shared/components/PairRow';
import { RankTable, type RankRow } from '@shared/components/RankTable';
import { Skeleton } from '@shared/components/Skeleton';
import { ClockIcon, MapPinIcon, SearchIcon } from '@shared/components/icons';
import { nextOpening, type RadarPairView, type RadarResultView } from '@shared/radar/adapter';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { analysisApi, userApi, type CreditsData, type Instrument } from '../services/api';
import { useRadarStore, radarKey, type RadarScope } from '../store/radarStore';
import { useMarketsUi, type StatusFilter } from '../store/marketsUi';
import { usePrefsStore, effectiveZone } from '../store/prefs';
import { RunRadar } from '../components/RunRadar';
import { fxFullName } from '../utils/instruments';

const SESSIONS = ['Asian', 'London', 'New York'] as const;
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'watch', label: 'Watch' },
  { id: 'avoid', label: 'Avoid' },
];

interface RowModel {
  code: string;
  /** Row title: display name for assets, pair code for FX. */
  label: string;
  /** Full instrument name subtitle (FX), when it adds information. */
  name?: string;
  kind: 'fx' | 'asset';
  base: string | null;
  quote: string | null;
  ranked?: RadarPairView;
}

/**
 * Markets / Session Focus Radar (studies 04 + 28). Desktop: page title row
 * with the credits pill, a pale-mint control panel (session pills, scope,
 * search, filter chips and the gradient Run Radar action), the reference
 * rank table with flag pairs, and the 320px contextual rail (Session
 * Clock, Watchlist, Scan status). Mobile keeps the study-04 controls and
 * reference pair rows. Session, search, scope and filters operate on the
 * STORED result + instrument catalog only — changing any of them never
 * spends credits; catalog pairs a scan did not rank are "Unranked", which
 * is different from "Unavailable". The only paid action is Run Radar,
 * which opens the confirmation dialog. Filters live in the marketsUi store
 * so they survive Back from pair detail. Aliased at /focus.
 */
export default function Markets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?.id ?? '';
  const { overview } = useSessions();
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);
  const ui = useMarketsUi();
  const savedTz = usePrefsStore((s) => s.timezone);
  const zone = effectiveZone(savedTz);

  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [catalog, setCatalog] = useState<Instrument[]>([]);
  const [runOpen, setRunOpen] = useState(false);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const session = ui.session ?? overview?.selected ?? 'London';
  const stored: RadarResultView | undefined = results[radarKey(userId, session, ui.scope)];
  const lastResult: RadarResultView | undefined = lastKey ? results[lastKey] : undefined;
  const watchlist = useMemo(() => user?.watchlist ?? [], [user?.watchlist]);

  const loadCredits = useCallback(async () => {
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
    } catch {
      /* run button simply omits the cost until a read succeeds */
    }
  }, []);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    let alive = true;
    analysisApi
      .getInstruments()
      .then((res) => {
        if (alive && Array.isArray(res.data.data)) setCatalog(res.data.data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Credits' "Run Radar" action lands here with the intent to open the
  // confirmation dialog directly (still no POST until Confirm).
  useEffect(() => {
    if ((location.state as { openRun?: boolean } | null)?.openRun) {
      setRunOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

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
      label: p.displayName,
      name: p.kind === 'fx' ? nameFor(p.pair, p.kind, p.base, p.quote) : undefined,
      kind: p.kind,
      base: p.base,
      quote: p.quote,
      ranked: p,
    }));
    const rankedCodes = new Set(ranked.map((r) => r.code));

    const pool = catalog.length > 0 ? catalog.map((i) => i.code) : [...watchlist];
    const unranked: RowModel[] = pool
      .filter((code) => !rankedCodes.has(code))
      .filter((code) => ui.scope === 'all' || watchlist.includes(code))
      .map((code) => {
        const entry = catalogByCode.get(code);
        const kind = entry?.kind ?? (code.includes('/') ? 'fx' : 'asset');
        const [b, q] = code.includes('/') ? code.split('/') : [null, null];
        const base = entry?.base ?? b;
        const quote = entry?.quote ?? q;
        const name = nameFor(code, kind, base, quote);
        return {
          code,
          label: kind === 'asset' && name ? name : code,
          name: kind === 'fx' ? name : undefined,
          kind,
          base,
          quote,
        };
      });

    const sortedRanked = [...ranked].sort((a, b) =>
      sortDir === 'desc'
        ? (b.ranked?.score ?? 0) - (a.ranked?.score ?? 0)
        : (a.ranked?.score ?? 0) - (b.ranked?.score ?? 0),
    );
    const sortedUnranked = [...unranked].sort((a, b) => a.code.localeCompare(b.code));
    return [...sortedRanked, ...sortedUnranked];
  }, [catalog, stored, ui.scope, watchlist, sortDir]);

  const visibleRows = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    return rows.filter((r) => {
      if (ui.filter !== 'all') {
        if (!r.ranked || r.ranked.status !== ui.filter) return false;
      }
      if (!q) return true;
      return (
        r.code.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        (r.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, ui.filter, ui.search]);

  const rowByLabel = useMemo(() => new Map(visibleRows.map((r) => [r.label, r])), [visibleRows]);

  const fmtTime = (ms: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms));

  const next = overview ? nextOpening(overview) : null;
  const scanStatus = stored ?? lastResult;

  const tableRows: RankRow[] = visibleRows.map((r) => ({
    pair: r.label,
    status: r.ranked?.status ?? 'unavailable',
    bias: r.ranked?.bias,
    score: r.ranked?.score,
    unranked: !r.ranked,
  }));

  return (
    <div className="space-y-5">
      {/* Title row (study 28): page title + real credits balance. No DEMO
          pill — no production demo state exists to label. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight lg:text-[40px]">
          Session Focus Radar
        </h1>
        {credits && <CreditPill credits={credits.balance} onClick={() => navigate('/app/credits')} />}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Control panel (study 28): pale mint, session + scope + search +
              filters + the one paid action. */}
          <section
            aria-label="Radar controls"
            className="space-y-4 rounded-[18px] bg-[var(--color-mint-panel)] p-4 sm:p-5 lg:p-6"
          >
            {/* Session — desktop: white outline pills (study 28). */}
            <div className="hidden flex-wrap gap-2 lg:flex" role="group" aria-label="Session">
              {SESSIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={session === s}
                  onClick={() => ui.set({ session: s })}
                  className={`min-h-[52px] rounded-[12px] border px-7 text-base font-bold ${
                    session === s
                      ? 'border-2 border-[var(--color-accent)] bg-[var(--color-mint-wash)] text-[var(--color-text)]'
                      : 'border-[var(--color-accent)]/40 bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* Session — mobile/tablet: segmented control (study 04). */}
            <div
              className="flex rounded-full bg-[var(--color-control-track)] p-1 lg:hidden"
              role="group"
              aria-label="Session"
            >
              {SESSIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={session === s}
                  onClick={() => ui.set({ session: s })}
                  className={`min-h-[48px] flex-1 rounded-full px-2 text-[15px] font-bold ${
                    session === s ? 'text-white shadow-[var(--shadow-row)]' : 'text-[var(--color-text)]'
                  }`}
                  style={session === s ? { background: 'var(--gradient-primary-action)' } : undefined}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Scope — preserved feature (the studies' crops don't show it;
                the handoff forbids deleting it). */}
            <div
              className="flex max-w-md rounded-full bg-[var(--color-control-track)] p-1"
              role="group"
              aria-label="Scan scope"
            >
              {(
                [
                  ['watchlist', 'My watchlist'],
                  ['all', 'All markets'],
                ] as [RadarScope, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ui.scope === id}
                  onClick={() => ui.set({ scope: id })}
                  className={`min-h-[40px] flex-1 rounded-full px-3 text-sm font-bold ${
                    ui.scope === id
                      ? 'bg-[var(--color-surface)] text-[var(--color-accent)] shadow-[var(--shadow-row)]'
                      : 'text-[var(--color-text-muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search — local catalog/result filtering only. */}
            <div className="relative">
              <SearchIcon
                size={20}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                type="search"
                value={ui.search}
                onChange={(e) => ui.set({ search: e.target.value })}
                placeholder="Search instruments (e.g., EUR/USD)"
                aria-label="Search instruments"
                className="min-h-[52px] w-full rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] pr-4 pl-12 text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)]"
              />
            </div>

            {/* Filters + Run Radar row. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={ui.filter === f.id}
                    onClick={() => ui.set({ filter: f.id })}
                    className={`min-h-[48px] rounded-[12px] px-5 text-[15px] font-bold ${
                      ui.filter === f.id
                        ? 'text-white shadow-[var(--shadow-row)]'
                        : 'border border-[var(--color-accent)]/40 bg-[var(--color-surface)] text-[var(--color-text)]'
                    }`}
                    style={ui.filter === f.id ? { background: 'var(--gradient-primary-action)' } : undefined}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* The one paid action — opens the confirmation dialog only. */}
              <button
                type="button"
                onClick={() => setRunOpen(true)}
                className="flex min-h-[56px] w-full items-center justify-center rounded-[12px] px-6 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99] lg:ml-auto lg:min-h-[60px] lg:w-[320px]"
                style={{ background: 'var(--gradient-primary-action)' }}
              >
                Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
              </button>
            </div>
          </section>

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
              {stored.warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          {!stored && (
            <Card>
              <EmptyState
                title="No scan yet"
                message={
                  lastResult
                    ? `No scan stored for ${session} · ${ui.scope === 'watchlist' ? 'watchlist' : 'all markets'} yet. Your last scan was ${lastResult.session} (${new Date(lastResult.timestampMs).toLocaleString()}). The instruments below are unranked until a scan covers them.`
                    : 'Run a scan to see this session’s focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits. The instruments below are unranked until a scan covers them.'
                }
                action={
                  <Button onClick={() => setRunOpen(true)}>
                    Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
                  </Button>
                }
              />
            </Card>
          )}

          <section aria-label="Instruments" className="space-y-2.5">
            <div className="flex flex-wrap items-end justify-between gap-2 px-1">
              <h2 className="text-lg font-extrabold tracking-tight">
                {stored ? `Results · ${stored.session}` : 'Instruments'}
              </h2>
              {stored ? (
                <span className="flex items-center gap-3">
                  <DataFreshness timestamp={stored.timestampMs} label="Scanned" className="text-[12px]" />
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                    aria-label={`Sort by score ${sortDir === 'desc' ? 'descending' : 'ascending'}; activate to change`}
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
              <p className="px-1 text-sm text-[var(--color-text-muted)]">
                Opening range was not ready for this scan.
              </p>
            )}
            {stored && stored.skippedCount > 0 && (
              <p className="px-1 text-sm text-[var(--color-text-muted)]">
                {stored.skippedCount} pair{stored.skippedCount === 1 ? '' : 's'} skipped (no usable
                data) — they appear as Unranked below.
              </p>
            )}

            {visibleRows.length === 0 ? (
              <EmptyState
                title="No instruments match"
                message={
                  ui.search.trim()
                    ? 'No instrument matches your search. Try a pair code like EUR/USD.'
                    : 'This scan returned no pairs with this status. Try another filter.'
                }
              />
            ) : (
              <>
                {/* Mobile / tablet: reference pair rows (study 04). */}
                <div className="space-y-2.5 lg:hidden">
                  {visibleRows.map((r) => (
                    <PairRow
                      key={r.code}
                      variant="markets"
                      pair={r.label}
                      name={r.name}
                      status={r.ranked?.status ?? 'unavailable'}
                      score={r.ranked?.score}
                      unranked={!r.ranked}
                      leading={
                        <PairFlags pair={r.code} base={r.base} quote={r.quote} kind={r.kind} name={r.label} size={44} />
                      }
                      freshness={
                        r.ranked?.stale ? (
                          <span className="mt-0.5 block text-[12px] font-semibold text-[var(--color-warning)]">
                            Stale data
                          </span>
                        ) : undefined
                      }
                      onClick={
                        r.ranked
                          ? () => navigate(`/app/markets/${encodeURIComponent(r.code)}`)
                          : undefined
                      }
                    />
                  ))}
                </div>
                {/* Desktop: reference rank table (study 28). */}
                <div className="hidden lg:block">
                  <RankTable
                    variant="reference"
                    caption={`Radar results for the ${session} session`}
                    rows={tableRows}
                    leading={(row) => {
                      const model = rowByLabel.get(row.pair);
                      return model ? (
                        <PairFlags
                          pair={model.code}
                          base={model.base}
                          quote={model.quote}
                          kind={model.kind}
                          name={model.label}
                          size={40}
                        />
                      ) : undefined;
                    }}
                    onRowSelect={(row) => {
                      const model = rowByLabel.get(row.pair);
                      if (model?.ranked) {
                        navigate(`/app/markets/${encodeURIComponent(model.code)}`);
                      }
                    }}
                  />
                </div>
              </>
            )}
            {catalog.length === 0 && !stored && (
              <Skeleton height={72} className="rounded-[var(--radius-row)]" />
            )}
          </section>
        </div>

        {/* Contextual rail (study 28): Session Clock + Watchlist + Scan status. */}
        <aside className="hidden space-y-4 xl:block" aria-label="Context">
          <section className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-mint-panel)] p-6">
            <h2 className="text-2xl font-extrabold tracking-tight">Session Clock</h2>
            {overview ? (
              <div className="mt-4 space-y-3 text-[15px]">
                <p className="flex items-center gap-2.5">
                  <MapPinIcon size={21} className="shrink-0 text-[var(--color-accent)]" />
                  <span className="font-semibold">
                    {overview.active.length ? overview.active.join(' + ') : 'No session live'}
                  </span>
                </p>
                <p className="flex items-center gap-2.5">
                  <ClockIcon size={21} className="shrink-0 text-[var(--color-accent)]" />
                  <span>{zone}</span>
                </p>
                {next && (
                  <p className="tnum text-sm text-[var(--color-text-muted)]">
                    Next: {next.session} opens at {fmtTime(next.startMs)} ({zone})
                  </p>
                )}
                <Link
                  to="/app/sessions"
                  className="inline-block pt-1 font-semibold text-[var(--color-link)] underline"
                >
                  Open Session Clock
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">
                Session information unavailable.
              </p>
            )}
          </section>

          <section className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-mint-panel)] p-6">
            <h2 className="text-2xl font-extrabold tracking-tight">Watchlist</h2>
            {watchlist.length > 0 ? (
              <div className="mt-4 space-y-2">
                {watchlist.map((symbol) => (
                  <p
                    key={symbol}
                    className="rounded-[10px] bg-[var(--color-mint-wash)] px-3.5 py-2.5 font-semibold"
                  >
                    {symbol}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Your watchlist is empty.</p>
            )}
            <Link
              to="/app/watchlist"
              className="mt-3 inline-block font-semibold text-[var(--color-link)] underline"
            >
              Manage watchlist
            </Link>
          </section>

          {scanStatus && (
            <section className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-mint-panel)] p-6">
              <h2 className="text-2xl font-extrabold tracking-tight">Scan status</h2>
              <p className="tnum mt-4 rounded-[10px] bg-[var(--color-mint-wash)] px-3.5 py-2.5 text-[15px]">
                Last result: {scanStatus.session} · {fmtTime(scanStatus.timestampMs)}
              </p>
              {scanStatus.marketClosed && (
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  That scan ran while the market was closed.
                </p>
              )}
            </section>
          )}
        </aside>
      </div>

      <RunRadar
        open={runOpen}
        session={session}
        scope={ui.scope}
        watchlist={watchlist}
        onClose={() => {
          setRunOpen(false);
          void loadCredits();
        }}
      />
    </div>
  );
}
