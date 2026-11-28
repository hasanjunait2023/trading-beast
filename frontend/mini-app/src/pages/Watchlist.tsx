import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { PairFlags } from '@shared/components/PairFlags';
import { Sparkline } from '@shared/components/Sparkline';
import { GripIcon } from '@shared/components/icons';
import { parsePairCurrencies } from '@shared/radar/flags';
import type { Bias } from '@shared/design-tokens';
import { analysisApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useRadarStore } from '../store/radarStore';
import { haptics } from '../telegram';

/**
 * Watchlist (study 08, handoff §3 row 08). The saved list comes from
 * GET /user/me; the catalog from GET /analysis/pairs. Every change saves the
 * FULL array via PATCH /user/watchlist. Writes are serialized (one in flight,
 * latest list wins); on failure the prior list is restored and an error toast
 * is shown. Rows are annotated with score/bias/status ONLY when a stored
 * Radar result contains that pair — no catalog scores are invented.
 * R3b: rows rebuilt to the study — ranked cards with flag pairs, the
 * bias + score pill, the scan-time price and a real sparkline when (and
 * only when) a stored result supplies the series. The study's % change
 * is NOT reproduced: no payload defines a reference close for it. The
 * study's gradient hero is not repeated here — this page renders inside
 * the More tab, which already provides the screen chrome.
 */

/** Full currency names for row subtitles (same local map as Markets, R1 —
 *  the catalog's FX name is just the pair code). */
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

export default function Watchlist() {
  const { user, setWatchlistLocal } = useAuth();
  const toast = useToast();
  const findPair = useRadarStore((s) => s.findPair);
  // Re-render annotations when stored results change.
  useRadarStore((s) => s.results);

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

  useEffect(() => { void load(); }, [load]);

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
        haptics.notification('error');
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
    haptics.selection();
    applyChange([...list, pair]);
  };
  const remove = (pair: string) => {
    haptics.selection();
    applyChange(list.filter((p) => p !== pair));
  };
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    haptics.selection();
    applyChange(next);
  };

  const addable = catalog.filter(
    (p) => !list.includes(p) && p.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="space-y-3 px-4" role="status" aria-label="Loading watchlist">
        <Skeleton height={72} /><Skeleton height={72} /><Skeleton height={72} />
      </div>
    );
  }
  if (loadError) {
    return <div className="px-4"><ErrorState message={loadError} onRetry={() => void load()} /></div>;
  }

  return (
    <div className="space-y-4 px-4">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight">Your saved instruments</h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
          With discretionary scores and latest market bias — pairs used for your personalised
          Radar runs ({list.length}/32){saving ? ' · Saving…' : ''}
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState title="Your watchlist is empty" message="Add pairs from the catalog below — they will be used when you run Radar on your watchlist." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {list.map((pair, i) => {
            const evidence = user ? findPair(user.id, pair) : undefined;
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
              <Card key={pair} className="py-3.5">
                <div className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-text-faint)]">
                    <GripIcon size={16} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="tnum mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-sm font-extrabold text-[var(--color-accent)]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <PairFlags
                        pair={pair}
                        base={evidence?.base}
                        quote={evidence?.quote}
                        kind={evidence?.kind}
                        name={evidence?.displayName}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[19px] leading-tight font-extrabold tracking-tight">
                          {pair}
                        </p>
                        {fullName && (
                          <p className="truncate text-[12.5px] text-[var(--color-text-muted)]">{fullName}</p>
                        )}
                      </div>
                    </div>
                    {evidence?.live != null && (
                      <p className="tnum mt-2 text-[17px] font-bold">
                        {evidence.live.toFixed(evidence.dec)}
                        <span className="ml-2 text-[11.5px] font-semibold text-[var(--color-text-faint)]">
                          at last scan
                        </span>
                      </p>
                    )}
                    {evidence?.spark && (
                      <div className="mt-1.5">
                        <Sparkline
                          values={evidence.spark}
                          tone={sparkTone}
                          width={150}
                          height={38}
                          label={`${pair} hourly closes from the latest stored scan`}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {evidence && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-mint-wash)] py-1 pl-1 pr-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${BIAS_PILL[evidence.bias]}`}>
                          {BIAS_LABEL[evidence.bias]}
                        </span>
                        <span className="tnum text-[12px] font-semibold">
                          Score <span className="text-[14px] font-extrabold">{evidence.score}</span>
                        </span>
                      </span>
                    )}
                    {evidence?.stale && (
                      <span className="text-[11.5px] font-bold text-[var(--color-warning)]">Stale</span>
                    )}
                    <div className="flex items-center">
                      <button type="button" aria-label={`Move ${pair} up`} disabled={i === 0} onClick={() => move(i, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30">▲</button>
                      <button type="button" aria-label={`Move ${pair} down`} disabled={i === list.length - 1} onClick={() => move(i, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-muted)] disabled:opacity-30">▼</button>
                      <Button variant="ghost" size="sm" ariaLabel={`Remove ${pair}`} onClick={() => remove(pair)}>✕</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FormField label="Add a pair">
        <Input placeholder="Search the pair catalog…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </FormField>
      {catalog.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Pair catalog unavailable right now.</p>
      ) : addable.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No more catalog pairs match.</p>
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
