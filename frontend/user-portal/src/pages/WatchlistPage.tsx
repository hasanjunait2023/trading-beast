import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { BiasText } from '@shared/components/Bias';
import { StatusPill } from '@shared/components/StatusPill';
import { analysisApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore } from '../store/radarStore';

/**
 * Watchlist (study 08, handoff §3 row 08) — web edition of the Mini App page
 * (Z1). The saved list comes from GET /user/me; the catalog from
 * GET /analysis/pairs. Every change saves the FULL array via
 * PATCH /user/watchlist. Writes are serialized (one in flight, latest list
 * wins); on failure the prior list is restored and an error toast is shown.
 * Rows are annotated with score/bias/status ONLY when a stored Radar result
 * contains that pair — no catalog scores are invented. Reorder uses
 * accessible up/down buttons. Aliased at /watchlist.
 */
export default function WatchlistPage() {
  const { user, setWatchlistLocal } = useAuth();
  const toast = useToast();
  const findPair = useRadarStore((s) => s.findPair);
  useRadarStore((s) => s.results); // re-render annotations when results change

  const [catalog, setCatalog] = useState<string[]>([]);
  const [list, setList] = useState<string[]>(user?.watchlist ?? []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const confirmedRef = useRef<string[]>(user?.watchlist ?? []);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (user?.watchlist) {
      confirmedRef.current = user.watchlist;
      setList(user.watchlist);
    }
  }, [user?.watchlist]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, pairsRes] = await Promise.all([userApi.me(), analysisApi.getPairs()]);
      const meList = meRes.data.data?.watchlist ?? [];
      confirmedRef.current = meList;
      setList(meList);
      setWatchlistLocal(meList);
      if (Array.isArray(pairsRes.data.data)) {
        setCatalog([...new Set(pairsRes.data.data as string[])]);
      }
      setLoadError('');
    } catch {
      setLoadError('Could not load your watchlist. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [setWatchlistLocal]);

  useEffect(() => {
    void load();
  }, [load]);

  // Serialized full-array save: at most one PATCH in flight; a change made
  // during a save is queued and sent after. Failure restores the prior list.
  const persist = useCallback(
    async (next: string[]) => {
      if (inFlightRef.current) {
        pendingRef.current = next;
        return;
      }
      inFlightRef.current = true;
      setSaving(true);
      const prior = confirmedRef.current;
      try {
        const res = await userApi.updateWatchlist(next);
        const saved = res.data.data?.watchlist ?? next;
        confirmedRef.current = saved;
        setList(saved);
        setWatchlistLocal(saved);
      } catch {
        setList(prior);
        setWatchlistLocal(prior);
        pendingRef.current = null;
        toast.error('Could not save your watchlist — your previous list was restored.');
      } finally {
        inFlightRef.current = false;
        setSaving(false);
        const queued = pendingRef.current;
        pendingRef.current = null;
        if (queued) void persist(queued);
      }
    },
    [setWatchlistLocal, toast],
  );

  const applyChange = (next: string[]) => {
    setList(next); // optimistic; persist() restores on failure
    void persist(next);
  };

  const add = (pair: string) => {
    if (list.includes(pair)) return;
    applyChange([...list, pair]);
  };
  const remove = (pair: string) => applyChange(list.filter((p) => p !== pair));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    applyChange(next);
  };

  const addable = catalog.filter(
    (p) => !list.includes(p) && p.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading watchlist">
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
    );
  }
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Watchlist"
        subtitle={`Pairs used for your personalised Radar runs (${list.length}/32)${saving ? ' · Saving…' : ''}`}
      />

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="Your watchlist is empty"
            message="Add pairs from the catalog below — they will be used when you run Radar on your watchlist."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((pair, i) => {
            const evidence = user ? findPair(user.id, pair)?.pair : undefined;
            return (
              <Card key={pair} className="flex items-center gap-2 py-3">
                <span className="tnum w-6 text-center text-sm font-bold text-[var(--color-text-muted)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{evidence?.displayName ?? pair}</p>
                  {evidence && (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px]">
                      <StatusPill status={evidence.status} />
                      <BiasText bias={evidence.bias} />
                      <span className="tnum font-semibold">{evidence.score} pts</span>
                      {evidence.stale && (
                        <span className="font-semibold text-[var(--color-warning)]">Stale</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${pair} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="flex h-8 w-9 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${pair} down`}
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                    className="flex h-8 w-9 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <Button variant="ghost" size="sm" ariaLabel={`Remove ${pair}`} onClick={() => remove(pair)}>
                  ✕
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="max-w-md">
        <FormField label="Add a pair">
          <Input
            placeholder="Search the pair catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormField>
      </div>
      {catalog.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Catalog unavailable right now.</p>
      ) : addable.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {search ? 'No catalog pairs match your search.' : 'Every catalog pair is already in your watchlist.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {addable.map((pair) => (
            <Button key={pair} variant="secondary" size="sm" onClick={() => add(pair)}>
              + {pair}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
