import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { StatusPill } from '@shared/components/StatusPill';
import { BiasText } from '@shared/components/Bias';
import { ScoreEvidence } from '@shared/components/ScoreEvidence';
import { ChartPanel } from '@shared/components/ChartPanel';
import { EmptyState } from '@shared/components/EmptyState';
import { useToast } from '@shared/components/Toast';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { useRadarStore } from '../store/radarStore';
import { evidenceFor } from '../components/evidence';

/**
 * Pair Detail (studies 05 + 29). Evidence comes from the SELECTED stored
 * result only — the fields the payload actually carries, nothing invented.
 * There is no candle API and no validated TradingView symbol mapping in
 * code, so the chart stays in its unavailable state with NO external link
 * and no timeframe controls. Direct entry / refresh without a stored result
 * shows the recovery state — never fabricated data.
 */
export default function PairDetail() {
  const { symbol: rawSymbol } = useParams();
  const symbol = rawSymbol ? decodeURIComponent(rawSymbol) : '';
  const { user, setWatchlistLocal } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const findPair = useRadarStore((s) => s.findPair);
  useRadarStore((s) => s.results); // re-render when stored results change
  const [toggling, setToggling] = useState(false);
  const inFlightRef = useRef(false);

  const hit = user ? findPair(user.id, symbol) : undefined;

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
  const candleTs = pair.ts15 ?? pair.ts1 ?? pair.ts4;
  const inWatchlist = user?.watchlist.includes(pair.pair) ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/markets')}>
          ← Back to Markets
        </Button>
        <h1 className="text-2xl font-bold">{pair.displayName}</h1>
        <StatusPill status={pair.status} />
        <BiasText bias={pair.bias} />
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {result.session} session · Scan{' '}
        <span className="tnum">{new Date(result.timestampMs).toLocaleString()}</span> ·{' '}
        <Link to="/app/markets" className="font-semibold text-[var(--color-link)] underline">
          Markets
        </Link>
      </p>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {/* No candle API / validated TradingView mapping exists in code, so
              the chart is honestly unavailable and carries no link. */}
          <ChartPanel
            state="unavailable"
            unavailableReason="Candles are not available in the web portal yet. The scan evidence is the data this result is based on."
          />
          {pair.stale && (
            <p role="status" className="font-semibold text-[var(--color-warning)]">
              This pair's data was flagged stale in the scan.
            </p>
          )}
        </div>
        <div className="space-y-4">
          <ScoreEvidence
            score={pair.score}
            evidence={evidenceFor(pair)}
            timestamp={candleTs ?? result.timestampMs}
          />
          <Card>
            <h2 className="font-bold">Watchlist</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {inWatchlist
                ? `${pair.displayName} is in your watchlist.`
                : `Add ${pair.displayName} to your watchlist for watchlist-scoped scans.`}
            </p>
            <Button
              className="mt-3"
              variant={inWatchlist ? 'secondary' : 'primary'}
              loading={toggling}
              disabled={toggling}
              onClick={() => void toggleWatchlist()}
            >
              {inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
