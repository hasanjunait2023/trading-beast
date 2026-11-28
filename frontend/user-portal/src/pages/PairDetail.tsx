import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { AdrUsage } from '@shared/components/AdrUsage';
import { ChartPanel } from '@shared/components/ChartPanel';
import { PairHero } from '@shared/components/PairHero';
import { ScoreEvidence } from '@shared/components/ScoreEvidence';
import { EmptyState } from '@shared/components/EmptyState';
import { useToast } from '@shared/components/Toast';
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  MarketsIcon,
} from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { analysisApi, userApi } from '../services/api';
import { hydrateLatestRadar } from '../services/radarHydration';
import { useRadarStore } from '../store/radarStore';
import { usePrefsStore, effectiveZone } from '../store/prefs';
import { evidenceFor, narrativeEvidence } from '../components/evidence';
import { TradingViewChart } from '../components/TradingViewChart';
import { fxFullName } from '../utils/instruments';
import { tradingViewSymbol, TV_INTERVALS } from '../utils/tradingView';

/**
 * Pair Detail (studies 05 + 29). Gradient pair hero with the scan price,
 * Price Analysis card with the timeframe selector over the TradingView
 * free chart widget (Conversion chapter — symbols mapped in
 * utils/tradingView.ts; if the widget cannot load, or the instrument has
 * no validated mapping, the honest unavailable state returns), and the
 * desktop evidence rail: Analysis provenance, the score ring card, factual
 * Score Evidence, ADR Usage and Save to Plan. Evidence comes from the
 * SELECTED stored result only — the fields the payload actually carries,
 * nothing invented: no candle series of our own, no % change and no
 * breakdown points exist in any validated contract, so none are rendered.
 * Direct entry / refresh without a stored result shows the recovery
 * state — never fabricated data.
 */

type Timeframe = '15m' | '1H' | '4H';
const TIMEFRAMES: Timeframe[] = ['15m', '1H', '4H'];

const STATUS_LABEL: Record<string, string> = {
  focus: 'Focus',
  watch: 'Watch',
  avoid: 'Avoid',
  unavailable: 'Unavailable',
};

/** Study-29 score ring: the ring sweep is the score itself (points/100),
 *  rendered as a proportion — the same number, never a derived metric. */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  return (
    <svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label={`Analysis score ${score} out of 100`} className="shrink-0">
      <circle cx="62" cy="62" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="10" />
      <circle
        cx="62"
        cy="62"
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (clamped / 100) * c}
        transform="rotate(-90 62 62)"
      />
      <text x="62" y="60" textAnchor="middle" fill="#ffffff" fontSize="30" fontWeight="800">
        {score}
        <tspan fontSize="15" fontWeight="700" fill="rgba(255,255,255,0.75)">/100</tspan>
      </text>
      <text x="62" y="82" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11" fontWeight="600">
        points
      </text>
    </svg>
  );
}

export default function PairDetail() {
  const { symbol: rawSymbol } = useParams();
  const symbol = rawSymbol ? decodeURIComponent(rawSymbol) : '';
  const { user, setWatchlistLocal } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const findPair = useRadarStore((s) => s.findPair);
  useRadarStore((s) => s.results); // re-render when stored results change
  const savedTz = usePrefsStore((s) => s.timezone);
  const zone = effectiveZone(savedTz);
  const [toggling, setToggling] = useState(false);
  const inFlightRef = useRef(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [tvFailed, setTvFailed] = useState(false);
  const [orBands, setOrBands] = useState(true);
  const [fullName, setFullName] = useState<string | undefined>(undefined);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState('');

  const hit = user ? findPair(user.id, symbol) : undefined;

  // Deep link / refresh with an empty store: try the one-shot GET-only
  // history hydration once before settling on the recovery state. The
  // service guard makes this non-looping and it never fetches per-pair.
  useEffect(() => {
    if (user && !hit) void hydrateLatestRadar(user.id);
  }, [user, hit]);

  // Full instrument name from the catalog (GET /analysis/instruments);
  // falls back to the locally formed FX name. Read-only, zero credits.
  useEffect(() => {
    let alive = true;
    analysisApi
      .getInstruments()
      .then((res) => {
        if (!alive || !Array.isArray(res.data.data)) return;
        const entry = res.data.data.find((i) => i.code === symbol);
        if (entry && entry.name && entry.name !== symbol) setFullName(entry.name);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [symbol]);

  // A different pair gets a fresh chance to load its chart.
  useEffect(() => {
    setTvFailed(false);
  }, [symbol]);

  const toggleWatchlist = useCallback(async () => {
    if (!user || inFlightRef.current) return;
    const prior = user.watchlist;
    const next = prior.includes(symbol)
      ? prior.filter((s) => s !== symbol)
      : [...prior, symbol];
    inFlightRef.current = true;
    setToggling(true);
    setWatchlistLocal(next); // optimistic; restored on failure
    try {
      const res = await userApi.updateWatchlist(next);
      setWatchlistLocal(res.data.data?.watchlist ?? next);
    } catch {
      setWatchlistLocal(prior);
      toast.error('Could not save your watchlist — the previous list was restored.');
    } finally {
      inFlightRef.current = false;
      setToggling(false);
    }
  }, [symbol, user, setWatchlistLocal, toast]);

  if (!hit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>
          ← Back to Markets
        </Button>
        <Card>
          <EmptyState
            title={`No stored scan for ${symbol || 'this pair'}`}
            message="Pair evidence comes from a Radar scan stored in this browser session. Run a scan from Markets first — opening this page never spends credits and never invents data."
            action={<Button onClick={() => navigate('/app/markets')}>Go to Markets</Button>}
          />
        </Card>
      </div>
    );
  }

  const { pair, result } = hit;
  const tvSymbol = tradingViewSymbol(pair.pair);
  const candleTs = pair.ts15 ?? pair.ts1 ?? pair.ts4;
  const inWatchlist = user?.watchlist.includes(pair.pair) ?? false;
  const numeric = evidenceFor(pair);
  const name = fullName ?? (pair.kind === 'fx' ? fxFullName(pair.base, pair.quote) : undefined);

  /** Pin this result's saved run to the session plan (study 05 CTA).
   *  Success is shown only after the plan API confirms; a result with no
   *  server run ID cannot be pinned and says so. */
  const saveToPlan = async () => {
    if (!result.runId || saveState === 'saving') return;
    setSaveState('saving');
    setSaveError('');
    try {
      const planDate = new Date().toISOString().slice(0, 10); // UTC, as the Plan page uses
      const current = await userApi.getCurrentPlan(result.session, planDate);
      const plan =
        current.data.data ??
        (await userApi.createPlan(result.session, planDate)).data.data;
      if (!plan) throw new Error('Plan unavailable');
      if (plan.pinnedRunId !== result.runId) {
        await userApi.updatePlan(plan.id, { pinnedRunId: result.runId, version: plan.version });
      }
      setSaveState('saved');
    } catch {
      setSaveState('idle');
      setSaveError('Could not save to the plan. Open the Plan page to check its current state, then try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>
          ← Back to Markets
        </Button>
        <p className="text-sm text-[var(--color-text-muted)]">
          {result.session} session · Scan{' '}
          <span className="tnum">{new Date(result.timestampMs).toLocaleString()}</span> ·{' '}
          <Link to="/app/markets" className="font-semibold text-[var(--color-link)] underline">
            Markets
          </Link>
        </p>
      </div>

      <PairHero
        pair={pair.displayName}
        name={name}
        status={pair.status}
        score={pair.score}
        bias={pair.bias}
        price={pair.live}
        priceDecimals={pair.dec}
        inWatchlist={inWatchlist}
        onToggleWatchlist={() => void toggleWatchlist()}
      />
      <p className="-mt-1 text-[13px] text-[var(--color-text-muted)]">
        {pair.live !== null
          ? 'Price is the scan’s latest 15m close.'
          : 'This scan carries no price for this pair.'}
        {toggling ? ' Saving watchlist…' : ''}
      </p>
      {pair.stale && (
        <p role="status" className="font-semibold text-[var(--color-warning)]">
          This pair's data was flagged stale in the scan.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* Price Analysis (study 29). The timeframe control drives the
              TradingView widget interval; the OR Bands switch shows/hides
              the scan's real opening-range levels above the chart area. If
              the widget script fails to load, the honest unavailable card
              takes its place. */}
          <section
            aria-label="Price analysis"
            className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-row)]"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">Price Analysis</h2>
              <div
                className="ml-auto flex rounded-full bg-[var(--color-control-track)] p-1"
                role="group"
                aria-label="Chart timeframe"
              >
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    aria-pressed={timeframe === tf}
                    onClick={() => setTimeframe(tf)}
                    className={`min-h-[38px] rounded-full px-3.5 text-sm font-bold ${
                      timeframe === tf ? 'text-white shadow-[var(--shadow-row)]' : 'text-[var(--color-text)]'
                    }`}
                    style={timeframe === tf ? { background: 'var(--gradient-primary-action)' } : undefined}
                  >
                    {tf === '15m' ? '15m (Active)' : tf}
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={orBands}
                onClick={() => setOrBands((v) => !v)}
                className="flex min-h-[38px] items-center gap-2 text-sm font-semibold text-[var(--color-text)]"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    orBands ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-control-track)]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      orBands ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                  />
                </span>
                OR Bands
              </button>
            </div>

            {orBands && pair.orHave && (pair.orHigh !== null || pair.orLow !== null) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {pair.orHigh !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[13px] font-semibold text-[var(--color-accent)]">
                    OR High <span className="tnum font-bold">{pair.orHigh.toFixed(pair.dec)}</span>
                  </span>
                )}
                {pair.orLow !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-[13px] font-semibold text-[var(--color-text-muted)]">
                    OR Low <span className="tnum font-bold">{pair.orLow.toFixed(pair.dec)}</span>
                  </span>
                )}
              </div>
            )}

            {tvSymbol && !tvFailed ? (
              <div className="mt-3">
                <TradingViewChart
                  symbol={tvSymbol}
                  interval={TV_INTERVALS[timeframe]}
                  timezone={zone}
                  onFail={() => setTvFailed(true)}
                />
                <p className="mt-2 text-[12px] text-[var(--color-text-muted)]">
                  Live chart by TradingView. The scan evidence on this page is
                  what this result is based on.
                </p>
              </div>
            ) : (
              <ChartPanel
                state="unavailable"
                title={`Chart · ${timeframe}`}
                unavailableReason={
                  tvSymbol
                    ? `The TradingView chart couldn't load (${timeframe}). Check your connection and reload — the scan evidence is the data this result is based on.`
                    : `No chart is available for ${pair.pair} in the web portal yet. The scan evidence is the data this result is based on.`
                }
                className="mt-3 border-0 p-0 shadow-none"
              />
            )}
          </section>

          {numeric.length > 0 && (
            <Card aria-label="Scan evidence numbers">
              <h3 className="text-base font-extrabold tracking-tight">Scan evidence</h3>
              <dl className="mt-2 divide-y divide-[var(--color-border-soft)]">
                {numeric.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                    <dt className="text-sm text-[var(--color-text-muted)]">{item.label}</dt>
                    <dd className="tnum text-sm font-semibold">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>

        {/* Evidence rail (study 29): provenance, score, evidence, ADR, CTA. */}
        <div className="space-y-4">
          <Card aria-label="Analysis provenance">
            <h2 className="text-xl font-extrabold tracking-tight">Analysis</h2>
            <div className="mt-3 space-y-2.5 text-sm">
              <p className="flex items-center gap-2.5">
                <MarketsIcon size={19} className="shrink-0 text-[var(--color-text-muted)]" />
                <span>
                  <span className="text-[var(--color-text-muted)]">Source:</span>{' '}
                  <span className="font-semibold">TradingBeast Analysis</span>
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <ClockIcon size={19} className="shrink-0 text-[var(--color-text-muted)]" />
                <span>
                  <span className="text-[var(--color-text-muted)]">Updated:</span>{' '}
                  <span className="tnum font-semibold">
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: zone,
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hourCycle: 'h23',
                    }).format(new Date(result.timestampMs))}{' '}
                    ({result.session} session)
                  </span>
                </span>
              </p>
            </div>
          </Card>

          {/* Score card (study 29): gradient panel, score ring, status. */}
          <section
            aria-label="TradingBeast analysis score"
            className="flex items-center gap-4 rounded-[var(--radius-lg)] p-5 text-white shadow-[var(--shadow-hero)]"
            style={{ background: 'var(--gradient-session-hero)' }}
          >
            <ScoreRing score={pair.score} />
            <div className="min-w-0">
              <p className="text-lg leading-snug font-extrabold tracking-tight">
                TradingBeast
                <br />
                Analysis Score
              </p>
              <span className="mt-2.5 inline-flex items-center rounded-full bg-[var(--color-hero-chip-bg)] px-3 py-1 text-[13px] font-bold text-[var(--color-hero-chip-text)]">
                {STATUS_LABEL[pair.status] ?? pair.status}
              </span>
              <p className="mt-2 text-[13px] text-white/80">
                Rank for the {result.session} session — separate from the{' '}
                {pair.bias} bias.
              </p>
            </div>
          </section>

          <ScoreEvidence
            variant="reference"
            score={pair.score}
            evidence={narrativeEvidence(pair)}
            timestamp={candleTs ?? result.timestampMs}
            title="Score Evidence"
          />
          <AdrUsage usagePct={pair.adrPct} />

          {/* Save to plan (study 05). Only a server-saved run can be pinned;
              success is shown only after the plan API confirms. */}
          <div>
            <button
              type="button"
              onClick={() => void saveToPlan()}
              disabled={!result.runId || saveState !== 'idle'}
              className="flex min-h-[60px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-lg font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99] disabled:opacity-60"
              style={{ background: 'var(--gradient-primary-action)' }}
            >
              {saveState === 'saved' ? <CheckIcon size={24} /> : <CalendarIcon size={24} />}
              {saveState === 'saved'
                ? 'Saved to plan'
                : saveState === 'saving'
                  ? 'Saving…'
                  : 'Save to plan'}
              {saveState === 'idle' && <ArrowRightIcon size={22} />}
            </button>
            {!result.runId && (
              <p className="mt-2 text-center text-[13px] text-[var(--color-text-muted)]">
                This result isn't linked to a saved run yet, so it can't be pinned to a plan.
              </p>
            )}
            {saveError && (
              <p role="alert" className="mt-2 text-center text-[13px] font-semibold text-[var(--color-danger)]">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
