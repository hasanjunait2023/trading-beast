import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { PairFlags } from '@shared/components/PairFlags';
import { Sparkline } from '@shared/components/Sparkline';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import { ArrowRightIcon, GripIcon, PlusIcon, XIcon } from '@shared/components/icons';
import { parsePairCurrencies } from '@shared/radar/flags';
import type { Bias } from '@shared/design-tokens';
import { analysisApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore } from '../store/radarStore';
import { fxFullName } from '../utils/instruments';

/**
 * Watchlist (study 08, handoff §3 row 08) — web edition of the Mini App page
 * (Z1). The saved list comes from GET /user/me; the catalog from
 * GET /analysis/pairs. Every change saves the FULL array via
 * PATCH /user/watchlist. Writes are serialized (one in flight, latest list
 * wins); on failure the prior list is restored and an error toast is shown.
 * Rows are annotated with score/bias/status ONLY when a stored Radar result
 * contains that pair — no catalog scores are invented. Reorder uses
 * accessible up/down buttons. Aliased at /watchlist.
 * R3b: presentation rebuilt to the study — gradient analysis hero, ranked
 * rows with flag pairs, bias + score pill, the scan-time price and a real
 * sparkline when (and only when) a stored result supplies them. The
 * study's % change is NOT reproduced: no payload defines a reference
 * close to compute it from.
 */

const BIAS_PILL: Record<Bias, string> = {
  bullish: 'bg-[var(--color-success-bg)] text-[var(--color-bullish)]',
  bearish: 'bg-[var(--color-danger-bg)] text-[var(--color-bearish)]',
  neutral: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
};

const BIAS_LABEL: Record<Bias, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
};

export default function WatchlistPage() {
  const { user, setWatchlistLocal } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const findPair = useRadarStore((s) => s.findPair);
  useRadarStore((s) => s.results); // re-render annotations when results change

  const [catalog, setCatalog] = useState<string[]>([]);
  const [list, setList] = useState<string[]>(user?.watchlist ?? []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
        <Skeleton height={120} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </div>
    );
  }
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void load()} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section
        aria-label="Professional FX Analysis"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)]"
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
          <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
            Professional FX Analysis
          </h2>
          <p className="mt-2 text-[15px] leading-snug text-white/90">
            Discretionary market insights, trade ideas, and watchlist scoring.
          </p>
          <button
            type="button"
            onClick={() => navigate('/app/markets')}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-[15px] font-bold text-[var(--color-accent)] shadow-[var(--shadow-sm)] transition-transform active:scale-[0.98]"
          >
            Markets <ArrowRightIcon size={18} />
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">Watchlist</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Your saved instruments with discretionary scores and latest market bias — pairs used
            for your personalised Radar runs ({list.length}/32){saving ? ' · Saving…' : ''}
          </p>
        </div>
        <Button
          className="rounded-full text-white"
          style={{ background: 'var(--gradient-primary-action)' }}
          onClick={() => searchRef.current?.focus()}
        >
          <PlusIcon size={18} /> Add symbol
        </Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            title="Your watchlist is empty"
            message="Add pairs from the catalog below — they will be used when you run Radar on your watchlist."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((pair, i) => {
            const evidence = user ? findPair(user.id, pair)?.pair : undefined;
            const currencies = parsePairCurrencies(pair, evidence?.base, evidence?.quote);
            const fullName = evidence
              ? fxFullName(evidence.base, evidence.quote)
              : currencies
                ? fxFullName(currencies[0], currencies[1])
                : undefined;
            const sparkTone =
              evidence?.spark && evidence.spark.length >= 2
                ? evidence.spark[evidence.spark.length - 1] >= evidence.spark[0]
                  ? 'positive'
                  : 'negative'
                : 'neutral';
            return (
              <Card key={pair} className="flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className="hidden shrink-0 text-[var(--color-text-faint)] sm:block">
                  <GripIcon size={18} />
                </span>
                <span
                  aria-hidden="true"
                  className="tnum flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[15px] font-extrabold text-[var(--color-accent)]"
                >
                  {i + 1}
                </span>
                <PairFlags
                  pair={pair}
                  base={evidence?.base}
                  quote={evidence?.quote}
                  kind={evidence?.kind}
                  name={evidence?.displayName}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[19px] leading-tight font-extrabold tracking-tight">
                    {pair}
                  </p>
                  {fullName && (
                    <p className="truncate text-[13px] text-[var(--color-text-muted)]">{fullName}</p>
                  )}
                  {evidence?.live != null && (
                    <p className="tnum mt-1 text-[17px] font-bold">
                      {evidence.live.toFixed(evidence.dec)}
                      <span className="ml-2 text-[12px] font-semibold text-[var(--color-text-faint)]">
                        at last scan
                      </span>
                    </p>
                  )}
                </div>
                {evidence?.spark && (
                  <span className="hidden shrink-0 md:block">
                    <Sparkline
                      values={evidence.spark}
                      tone={sparkTone}
                      width={110}
                      height={40}
                      label={`${pair} hourly closes from the latest stored scan`}
                    />
                  </span>
                )}
                {evidence && (
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-mint-wash)] py-1 pl-1 pr-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${BIAS_PILL[evidence.bias]}`}
                    >
                      {BIAS_LABEL[evidence.bias]}
                    </span>
                    <span className="tnum text-[13px] font-semibold">
                      Score <span className="text-[15px] font-extrabold">{evidence.score}</span>
                    </span>
                    {evidence.stale && (
                      <span className="text-[12px] font-bold text-[var(--color-warning)]">Stale</span>
                    )}
                  </span>
                )}
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${pair} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="flex h-7 w-8 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${pair} down`}
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                    className="flex h-7 w-8 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  ariaLabel={`Remove ${pair} from watchlist`}
                  onClick={() => remove(pair)}
                >
                  <XIcon size={16} />
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <div className="max-w-md">
        <FormField label="Add a pair">
          <Input
            ref={searchRef}
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
        <div className="space-y-2">
          {addable.map((pair) => (
            <Card key={pair} className="flex items-center gap-3 py-2.5">
              <PairFlags pair={pair} size={32} />
              <p className="flex-1 font-semibold">{pair}</p>
              <Button variant="secondary" size="sm" onClick={() => add(pair)} disabled={list.length >= 32}>
                + Add
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
