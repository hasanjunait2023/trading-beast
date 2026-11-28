import { useEffect, useState } from 'react';
import { AdrUsage } from '@shared/components/AdrUsage';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { ChartPanel } from '@shared/components/ChartPanel';
import { PairHero } from '@shared/components/PairHero';
import { useTheme } from '@shared/theme';
import { ScoreEvidence, type EvidenceItem } from '@shared/components/ScoreEvidence';
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
} from '@shared/components/icons';
import type { RadarPairView, RadarResultView } from '@shared/radar/adapter';
import { plansApi, userApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { backButton } from '../telegram';
import { TradingViewChart } from '../components/TradingViewChart';
import { tradingViewInterval, tradingViewSymbol } from '../utils/tradingview';

/**
 * Pair Detail (reference 05). Gradient pair hero with the scan price,
 * timeframe selector over an honest chart state, factual Score Evidence +
 * ADR Usage panels, numeric scan evidence, and the Save to Plan action.
 * Every value comes from the stored scan payload — the reference study's
 * sample price change, candles and ADR absolutes are NOT reproduced
 * (the payload defines none of them).
 */

type Timeframe = '15m' | '1H' | '4H';
const TIMEFRAMES: Timeframe[] = ['15m', '1H', '4H'];

function dirWord(v: number | null): 'Bullish' | 'Bearish' | 'Neutral' | null {
  if (v === null) return null;
  return v > 0 ? 'Bullish' : v < 0 ? 'Bearish' : 'Neutral';
}

function dirSign(v: number | null): number {
  return v === null ? 0 : Math.sign(v);
}

/** Narrative evidence rows, mapped factually from payload fields only
 *  (coordinator mapping table — no invented structure/momentum claims). */
function narrativeEvidence(p: RadarPairView): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const biasSign = p.bias === 'bullish' ? 1 : p.bias === 'bearish' ? -1 : 0;

  const trend = dirWord(p.d4);
  if (trend) items.push({ label: 'Trend', value: `${trend} (4H direction)` });

  if (p.orConfirmed) {
    items.push({
      label: 'Structure',
      value:
        p.bias === 'bearish'
          ? 'Break below OR confirmed'
          : p.bias === 'bullish'
            ? 'Break above OR confirmed'
            : 'OR break confirmed',
    });
  } else if (p.orLive) {
    items.push({ label: 'Structure', value: 'Price beyond OR — not confirmed', tone: 'neutral' });
  } else if (p.orHave) {
    items.push({ label: 'Structure', value: 'No OR break yet', tone: 'neutral' });
  }

  const momentum = dirWord(p.d15);
  if (momentum) {
    const conflicts = biasSign !== 0 && dirSign(p.d15) !== 0 && dirSign(p.d15) !== biasSign;
    items.push({
      label: 'Momentum',
      value: `${momentum} (15m)${p.rsi !== null ? ` · RSI ${p.rsi.toFixed(0)}` : ''}`,
      tone: conflicts ? 'warning' : 'positive',
    });
  }

  if (p.d1 !== null) {
    if (biasSign === 0) {
      items.push({ label: 'Context', value: 'No directional bias for the 1H to align with', tone: 'neutral' });
    } else if (dirSign(p.d1) === biasSign) {
      items.push({ label: 'Context', value: '1H direction aligns with bias' });
    } else if (dirSign(p.d1) === 0) {
      items.push({ label: 'Context', value: 'No clear 1H direction', tone: 'neutral' });
    } else {
      items.push({ label: 'Context', value: '1H direction conflicts with bias', tone: 'warning' });
    }
  }

  if (p.divAgainst) {
    items.push({ label: 'Divergence', value: 'RSI divergence against the bias', tone: 'warning' });
  } else if (p.div) {
    items.push({
      label: 'Divergence',
      value: `RSI divergence: ${p.div === 'BULLISH' ? 'Bullish' : 'Bearish'}`,
      tone: 'neutral',
    });
  }
  if (p.extended) items.push({ label: 'Extension', value: 'Move is extended versus the 50 EMA', tone: 'warning' });
  if (p.cramped) items.push({ label: 'Range', value: 'Price is cramped against the obstacle', tone: 'warning' });
  if (p.stretched) items.push({ label: 'Range', value: 'Price is stretched', tone: 'warning' });

  return items.slice(0, 6);
}

/** Numeric scan evidence (exact payload values, nothing derived). */
function numericEvidence(p: RadarPairView): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const num = (v: number, dec = p.dec) => v.toFixed(dec);
  if (p.orHave && p.orHigh !== null) items.push({ label: 'Opening range high', value: num(p.orHigh) });
  if (p.orHave && p.orLow !== null) items.push({ label: 'Opening range low', value: num(p.orLow) });
  if (p.atr15 !== null) items.push({ label: 'ATR (15m)', value: num(p.atr15, 5) });
  if (p.obstacle !== null) items.push({ label: 'Obstacle', value: num(p.obstacle) });
  if (p.roomATR !== null) items.push({ label: 'Room (ATR)', value: `${p.roomATR}` });
  return items;
}

export function PairDetail({
  pair,
  result,
  fullName,
  onBack,
}: {
  pair: RadarPairView;
  result: RadarResultView;
  /** Full instrument name from the catalog/map, when it adds information
   *  beyond the pair code (FX only). */
  fullName?: string;
  onBack: () => void;
}) {
  const { user, setWatchlistLocal } = useAuth();
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    backButton.show();
    backButton.onClick(onBack);
    return () => {
      backButton.offClick(onBack);
      backButton.hide();
    };
  }, [onBack]);

  const inWatchlist = (user?.watchlist ?? []).includes(pair.pair);
  const toggleWatchlist = async () => {
    const current = user?.watchlist ?? [];
    const next = inWatchlist
      ? current.filter((c) => c !== pair.pair)
      : [...current, pair.pair];
    setWatchlistLocal(next);
    try {
      const res = await userApi.updateWatchlist(next);
      if (res.data.data?.watchlist) setWatchlistLocal(res.data.data.watchlist);
    } catch {
      setWatchlistLocal(current); // restore on failure (handoff §3 row 08)
    }
  };

  const saveToPlan = async () => {
    if (!result.runId || saveState === 'saving') return;
    setSaveState('saving');
    setSaveError('');
    try {
      const current = await plansApi.current(result.session);
      const plan = current.data.data ?? (await plansApi.create(result.session)).data.data;
      if (!plan) throw new Error('Plan unavailable');
      if (plan.pinnedRunId === result.runId) {
        setSaveState('saved');
        return;
      }
      await plansApi.update(plan.id, { pinnedRunId: result.runId, version: plan.version });
      setSaveState('saved');
    } catch {
      setSaveState('idle');
      setSaveError('Could not save to the plan. Open the Plan tab to check its current state, then try again.');
    }
  };

  const candleTs = pair.ts15 ?? pair.ts1 ?? pair.ts4;
  const numeric = numericEvidence(pair);

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-center gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onBack} ariaLabel="Back to Markets">
          ← Markets
        </Button>
        <span className="ml-auto">
          <Brand size={26} />
        </span>
      </div>

      <PairHero
        pair={pair.displayName}
        name={fullName}
        status={pair.status}
        score={pair.score}
        bias={pair.bias}
        price={pair.live}
        priceDecimals={pair.dec}
        inWatchlist={inWatchlist}
        onToggleWatchlist={() => void toggleWatchlist()}
      />
      <p className="-mt-1 text-[13px] text-[var(--color-text-muted)]">
        {result.session} session · Scan{' '}
        <span className="tnum">{new Date(result.timestampMs).toLocaleString()}</span>
        {pair.live !== null && ' · Price is the scan’s latest 15m close'}
      </p>
      {pair.stale && (
        <p role="status" className="font-semibold text-[var(--color-warning)]">
          This pair's data was flagged stale in the scan.
        </p>
      )}

      {/* Timeframe selector (reference 05). Drives the TradingView
          widget's interval (15m → 15, 1H → 60, 4H → 240). */}
      <div
        className="flex rounded-full bg-[var(--color-control-track)] p-1"
        role="group"
        aria-label="Chart timeframe"
      >
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            aria-pressed={timeframe === tf}
            onClick={() => setTimeframe(tf)}
            className={`min-h-[44px] flex-1 rounded-full text-[15px] font-bold ${
              timeframe === tf ? 'text-white shadow-[var(--shadow-row)]' : 'text-[var(--color-text)]'
            }`}
            style={timeframe === tf ? { background: 'var(--gradient-primary-action)' } : undefined}
          >
            {tf === '15m' ? '15m (Active)' : tf}
          </button>
        ))}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-row)]">
        {pair.orHave && (pair.orHigh !== null || pair.orLow !== null) && (
          <div className="mb-3 flex flex-wrap gap-2">
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
        {/* Live chart: TradingView's free embeddable widget for the mapped
            symbol; unmapped instruments and widget load failures keep the
            honest unavailable card. The scan's own candle series is still
            not served by any API — this is TradingView's live chart. */}
        {(() => {
          const symbol = tradingViewSymbol({
            pair: pair.pair,
            kind: pair.kind,
            base: pair.base,
            quote: pair.quote,
          });
          return symbol ? (
            <TradingViewChart
              symbol={symbol}
              interval={tradingViewInterval(timeframe)}
              theme={theme}
              title={`Chart · ${timeframe}`}
            />
          ) : (
            <ChartPanel
              state="unavailable"
              title={`Chart · ${timeframe}`}
              unavailableReason={`No live chart is mapped for this instrument yet. The scan evidence below is the data this result is based on.`}
              className="border-0 p-0 shadow-none"
            />
          );
        })()}
      </div>

      <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
        <ScoreEvidence
          variant="reference"
          score={pair.score}
          evidence={narrativeEvidence(pair)}
          timestamp={candleTs ?? result.timestampMs}
          title="Score Evidence"
        />
        <AdrUsage usagePct={pair.adrPct} />
      </div>

      {numeric.length > 0 && (
        <Card aria-label="Scan evidence numbers">
          <h3 className="text-sm font-bold text-[var(--color-text)]">Scan evidence</h3>
          <dl className="mt-2 divide-y divide-[var(--color-border-soft)]">
            {numeric.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 py-2">
                <dt className="text-sm text-[var(--color-text-muted)]">{item.label}</dt>
                <dd className="tnum text-sm font-semibold text-[var(--color-text)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Save to plan (reference 05). Only a server-saved run can be pinned;
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
  );
}
