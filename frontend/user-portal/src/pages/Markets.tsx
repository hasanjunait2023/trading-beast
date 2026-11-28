import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { PairRow } from '@shared/components/PairRow';
import { RankTable } from '@shared/components/RankTable';
import { DataFreshness } from '@shared/components/DataFreshness';
import { Input, FormField } from '@shared/components/FormField';
import { EmptyState } from '@shared/components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { analysisApi, userApi, type CreditsData } from '../services/api';
import { useRadarStore, radarKey } from '../store/radarStore';
import { useMarketsUi, type StatusFilter } from '../store/marketsUi';
import { usePrefsStore, effectiveZone } from '../store/prefs';
import { RunRadar } from '../components/RunRadar';

const SESSIONS = ['Asian', 'London', 'New York'] as const;
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'focus', label: 'Focus' },
  { id: 'watch', label: 'Watch' },
  { id: 'avoid', label: 'Avoid' },
];

/**
 * Markets / Session Focus Radar (studies 04 + 28). Session selector, search,
 * scope and status filters all operate on the STORED result only — changing
 * any of them never spends credits. The catalog (GET /analysis/pairs) powers
 * lookup of symbols a scan did not return: those are "unranked", which is
 * different from "unavailable". The only paid action is the distinct Run
 * Radar button, which opens the confirmation dialog. Desktop adds the
 * contextual rail (Session Clock summary + Watchlist). Filters live in the
 * marketsUi store so they survive Back from pair detail. Aliased at /focus.
 */
export default function Markets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.id ?? '';
  const { overview } = useSessions();
  const results = useRadarStore((s) => s.results);
  const lastKey = useRadarStore((s) => s.lastKey);
  const ui = useMarketsUi();
  const savedTz = usePrefsStore((s) => s.timezone);
  const zone = effectiveZone(savedTz);

  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [runOpen, setRunOpen] = useState(false);

  const session = ui.session ?? overview?.selected ?? 'London';
  const stored = results[radarKey(userId, session, ui.scope)];
  const lastResult = lastKey ? results[lastKey] : undefined;

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
      .getPairs()
      .then((res) => {
        if (alive && Array.isArray(res.data.data)) setCatalog([...new Set(res.data.data)]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const visiblePairs = useMemo(() => {
    if (!stored) return [];
    const byFilter = ui.filter === 'all' ? stored.all : stored.all.filter((p) => p.status === ui.filter);
    const q = ui.search.trim().toLowerCase();
    if (!q) return byFilter;
    return byFilter.filter(
      (p) => p.pair.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q),
    );
  }, [stored, ui.filter, ui.search]);

  // Catalog matches that the stored result did NOT rank (unranked ≠ unavailable).
  const unrankedMatches = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    if (!q || !stored) return [];
    const ranked = new Set(stored.all.map((p) => p.pair));
    return catalog.filter((c) => c.toLowerCase().includes(q) && !ranked.has(c));
  }, [catalog, stored, ui.search]);

  const fmtTime = (ms: number) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(ms));

  const resultsSection = (
    <>
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

      {stored ? (
        <section aria-label="Radar results" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Results · {stored.session}</h2>
            <DataFreshness timestamp={stored.timestampMs} label="Scanned" />
          </div>
          {!stored.orReady && (
            <p className="text-sm text-[var(--color-text-muted)]">Opening range was not ready for this scan.</p>
          )}
          {stored.skippedCount > 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {stored.skippedCount} pair{stored.skippedCount === 1 ? '' : 's'} skipped (no usable data).
            </p>
          )}
          {visiblePairs.length === 0 ? (
            <EmptyState
              title="No pairs match"
              message="No stored pairs match this filter and search. Try another filter, or clear the search."
            />
          ) : (
            <>
              {/* Mobile / tablet: pair cards. Desktop: rank table (study 28). */}
              <div className="space-y-2 lg:hidden">
                {visiblePairs.map((p) => (
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
              <div className="hidden lg:block">
                <RankTable
                  caption={`Radar results for the ${stored.session} session`}
                  rows={visiblePairs.map((p) => ({
                    pair: p.displayName,
                    status: p.status,
                    bias: p.bias,
                    score: p.score,
                  }))}
                  onRowSelect={(row) => {
                    const hit = visiblePairs.find((p) => p.displayName === row.pair);
                    if (hit) navigate(`/app/markets/${encodeURIComponent(hit.pair)}`);
                  }}
                />
              </div>
            </>
          )}
          {unrankedMatches.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text-muted)]">
                In the catalog, not in this scan
              </h3>
              {unrankedMatches.map((symbol) => (
                <Card key={symbol} className="flex items-center justify-between gap-3 py-3">
                  <span className="font-bold">{symbol}</span>
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Unranked — this scan did not return it. That is different from unavailable.
                  </span>
                </Card>
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
                ? `No scan stored for ${session} · ${ui.scope === 'watchlist' ? 'watchlist' : 'all markets'} yet. Your last scan was ${lastResult.session} (${new Date(lastResult.timestampMs).toLocaleString()}).`
                : 'Run a scan to see this session’s focus, watch and avoid lists. Browsing is free — only a confirmed run spends credits.'
            }
            action={
              <Button onClick={() => setRunOpen(true)}>
                Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
              </Button>
            }
          />
        </Card>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Session Focus Radar"
        subtitle="Stored scan results — filters and session changes are free."
        actions={
          <Button size="lg" onClick={() => setRunOpen(true)}>
            Run Radar{credits ? ` · ${credits.radarCost} credits` : ''}
          </Button>
        }
      />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Session">
              {SESSIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={session === s}
                  onClick={() => ui.set({ session: s })}
                  className={`min-h-[44px] rounded-full border px-4 text-sm font-semibold ${
                    session === s
                      ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2" role="group" aria-label="Scan scope">
              {(
                [
                  ['watchlist', 'My watchlist'],
                  ['all', 'All markets'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={ui.scope === id}
                  onClick={() => ui.set({ scope: id })}
                  className={`min-h-[44px] flex-1 rounded-[var(--radius-md)] border px-3 text-sm font-semibold ${
                    ui.scope === id
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-text)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="min-w-52 flex-1">
                <FormField label="Search pairs">
                  <Input
                    placeholder="Search stored results and the catalog…"
                    value={ui.search}
                    onChange={(e) => ui.set({ search: e.target.value })}
                  />
                </FormField>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Status filter">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={ui.filter === f.id}
                    onClick={() => ui.set({ filter: f.id })}
                    className={`min-h-[36px] rounded-full border px-3 text-[13px] font-semibold ${
                      ui.filter === f.id
                        ? 'border-transparent bg-[var(--color-accent)] text-[var(--color-accent-text)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {resultsSection}
        </div>

        {/* Contextual rail (study 28): Session Clock summary + Watchlist. */}
        <aside className="hidden space-y-4 xl:block" aria-label="Context">
          <Card>
            <h2 className="font-bold">Session Clock</h2>
            {overview ? (
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  {overview.active.length
                    ? `${overview.active.join(' + ')} live now`
                    : 'No session live now'}
                  {overview.overlap ? ' · overlap' : ''}
                </p>
                {overview.nextTransition && (
                  <p className="tnum text-[var(--color-text-muted)]">
                    Next: {overview.nextTransition.session} {overview.nextTransition.kind} at{' '}
                    {fmtTime(overview.nextTransition.atMs)} ({zone})
                  </p>
                )}
                <Link to="/app/sessions" className="inline-block pt-1 font-semibold text-[var(--color-link)] underline">
                  Open Session Clock
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Session information unavailable.</p>
            )}
          </Card>
          <Card>
            <h2 className="font-bold">Watchlist</h2>
            {user && user.watchlist.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {user.watchlist.map((symbol) => (
                  <span
                    key={symbol}
                    className="rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[13px] font-semibold"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">Your watchlist is empty.</p>
            )}
            <Link to="/app/watchlist" className="mt-2 inline-block font-semibold text-[var(--color-link)] underline">
              Manage watchlist
            </Link>
          </Card>
          {stored && (
            <Card>
              <h2 className="font-bold">Scan status</h2>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Last result: {stored.session} ·{' '}
                <span className="tnum">{new Date(stored.timestampMs).toLocaleString()}</span>
              </p>
            </Card>
          )}
        </aside>
      </div>

      <RunRadar
        open={runOpen}
        session={session}
        scope={ui.scope}
        watchlist={user?.watchlist ?? []}
        onClose={() => {
          setRunOpen(false);
          void loadCredits();
        }}
      />
    </div>
  );
}
