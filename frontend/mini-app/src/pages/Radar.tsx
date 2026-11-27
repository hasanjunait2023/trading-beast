import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Coins,
  Lock,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  analysisApi,
  userApi,
  AnalyzedPair,
  FocusResult,
} from '../services/api';
import { haptics, mainButton } from '../telegram';
import { EmptyState, RadarSkeleton } from '../components/ui';

export type SessionName = 'Asian' | 'London' | 'New York';

export const RADAR_COST = 10;
export const DAILY_GRANT = 10;

/**
 * Session auto-detect by UTC hour, following the repo convention:
 * Asian 00–08, London 08–16, New York 13–21 UTC.
 * Overlaps: 08–13 London only; 13–16 London + NY overlap — the most
 * recently opened session (New York) wins; 21–24 is the gap before
 * Asian reopens, so Asian (next session) is selected.
 */
export function detectSession(date = new Date()): SessionName {
  const h = date.getUTCHours();
  if (h >= 13 && h < 21) return 'New York';
  if (h >= 8 && h < 13) return 'London';
  return 'Asian';
}

const SESSIONS: { value: SessionName; label: string; hours: string }[] = [
  { value: 'Asian', label: 'Asian', hours: '00–08 UTC' },
  { value: 'London', label: 'London', hours: '08–16 UTC' },
  { value: 'New York', label: 'New York', hours: '13–21 UTC' },
];

function PairCard({
  pair,
  accent,
  detailed,
  index = 0,
}: {
  pair: AnalyzedPair;
  accent: string;
  detailed: boolean;
  index?: number;
}) {
  const label = pair.kind === 'asset' ? pair.name : pair.pair;
  const scorePct = Math.max(0, Math.min(100, pair.score));
  const scoreColor =
    pair.bias === 'BUY'
      ? 'var(--color-success)'
      : pair.bias === 'SELL'
        ? 'var(--color-danger)'
        : 'var(--color-link)';
  return (
    <motion.div
      className="card-elevated relative overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut', delay: Math.min(index, 6) * 0.05 }}
    >
      <div
        className="absolute top-0 left-0 w-full"
        style={{ height: 3, background: accent }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{pair.icon || '📊'}</span>
          <div>
            <h3 className="font-display font-bold">{label}</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {pair.kind === 'fx' ? `${pair.base}/${pair.quote}` : pair.group}
            </p>
          </div>
        </div>
        <span
          className="badge"
          style={{
            background:
              pair.bias === 'BUY'
                ? 'rgba(34,197,94,0.15)'
                : pair.bias === 'SELL'
                  ? 'rgba(239,68,68,0.15)'
                  : 'rgba(136,150,189,0.15)',
            color:
              pair.bias === 'BUY'
                ? 'var(--color-success)'
                : pair.bias === 'SELL'
                  ? 'var(--color-danger)'
                  : 'var(--color-text-muted)',
          }}
        >
          {pair.bias === 'BUY' ? '▲ BUY' : pair.bias === 'SELL' ? '▼ SELL' : '— NEUTRAL'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-center">
          <p className="font-display font-bold text-2xl" style={{ color: 'var(--color-link)' }}>
            {pair.score}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Score</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-semibold">{pair.live.toFixed(pair.dec)}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Live</p>
        </div>
        <div className="text-center">
          <p className="font-mono font-semibold">{pair.rsi.toFixed(0)}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>RSI</p>
        </div>
        {detailed && (
          <div className="text-center">
            <p className="font-mono font-semibold">{pair.er.toFixed(2)}</p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>ER</p>
          </div>
        )}
      </div>

      {/* Score bar — animates in with the card (transform/opacity only) */}
      <div
        className="h-1.5 rounded-full mt-3 overflow-hidden"
        style={{ background: 'var(--color-bg)' }}
        role="img"
        aria-label={`Score ${pair.score} of 100`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: scoreColor, transformOrigin: 'left' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: scorePct / 100 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.15 + Math.min(index, 6) * 0.05 }}
        />
      </div>

      {detailed && (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            {(
              [
                ['4H', pair.d4],
                ['1H', pair.d1],
                ['15m', pair.d15],
              ] as const
            ).map(([labelTf, v]) => (
              <div
                key={labelTf}
                className="p-2 rounded-lg"
                style={{ background: 'var(--color-bg)' }}
              >
                <p style={{ color: 'var(--color-text-muted)' }}>{labelTf} Trend</p>
                <p
                  className="font-medium"
                  style={{
                    color: v >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
                  }}
                >
                  {v >= 0 ? '+' : ''}
                  {v}
                </p>
              </div>
            ))}
          </div>
          {pair.orConfirmed && (
            <div
              className="flex items-center gap-2 mt-3 p-2 rounded-lg text-sm"
              style={{
                background: 'rgba(34,197,94,0.1)',
                color: 'var(--color-success)',
              }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" /> OR Breakout Confirmed
            </div>
          )}
          {(pair.cramped || pair.stretched || pair.divAgainst) && (
            <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--color-warning)' }}>
              {pair.cramped && <p>⚠ Cramped RR — limited room to target</p>}
              {pair.stretched && <p>⚠ Extended — late entry risk</p>}
              {pair.divAgainst && <p>⚠ RSI divergence against bias</p>}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function CompactRow({ pair }: { pair: AnalyzedPair }) {
  const label = pair.kind === 'asset' ? pair.name : pair.pair;
  return (
    <div
      className="flex items-center justify-between p-2.5 rounded-lg"
      style={{ background: 'var(--color-bg)' }}
    >
      <span className="font-medium text-sm">
        {pair.icon ? `${pair.icon} ` : ''}
        {label}
      </span>
      <span
        className="text-sm font-mono font-semibold"
        style={{
          color:
            pair.bias === 'BUY'
              ? 'var(--color-success)'
              : pair.bias === 'SELL'
                ? 'var(--color-danger)'
                : 'var(--color-text-muted)',
        }}
      >
        {pair.score}
      </span>
    </div>
  );
}

export default function Radar() {
  const { user } = useAuth();
  const [session, setSession] = useState<SessionName>(() => detectSession());
  const [data, setData] = useState<FocusResult | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [radarCost, setRadarCost] = useState(RADAR_COST);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCredits = useCallback(() => {
    userApi
      .credits()
      .then((r) => {
        if (r.data.success) {
          setBalance(r.data.data.balance);
          if (typeof r.data.data.radarCost === 'number')
            setRadarCost(r.data.data.radarCost);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadCredits();
  }, [loadCredits]);

  const runRadar = useCallback(async () => {
    setLoading(true);
    setError('');
    haptics.impact('medium');
    try {
      const res = await analysisApi.getFocus(session, user?.watchlist);
      if (res.data.success) {
        setData(res.data.data as FocusResult);
        haptics.notification('success');
      } else {
        setError(res.data.error || 'Radar failed');
        haptics.notification('error');
      }
    } catch {
      setError(
        'Radar unavailable or insufficient credits. Check your balance and try again.'
      );
      haptics.notification('error');
    } finally {
      setLoading(false);
      loadCredits();
    }
  }, [session, user?.watchlist, loadCredits]);

  // Telegram MainButton wiring — mirrors the in-app Run Radar button.
  const runRef = useRef(runRadar);
  runRef.current = runRadar;
  const canRun = balance !== null && balance >= radarCost && !loading;
  useEffect(() => {
    const handler = () => {
      if (canRun) void runRef.current();
    };
    mainButton.configure({
      text: loading
        ? 'Running Radar…'
        : `Run Radar · ${radarCost} credits`,
      visible: true,
      active: canRun,
      progress: loading,
    });
    mainButton.onClick(handler);
    return () => {
      mainButton.offClick(handler);
      mainButton.hide();
    };
  }, [canRun, loading, radarCost]);

  const isFree = !user || user.tier === 'FREE';
  // FREE tier: backend/bot formatting shows Focus only (no Watch/Avoid,
  // no detailed metrics). Paid/trial users see the full breakdown.
  const showFull = !isFree || user?.isTrialActive || user?.isProActive;

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl">Session Radar</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Session-aware focus list
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <Coins className="w-4 h-4" style={{ color: 'var(--color-warning)' }} />
          {balance ?? '—'}
        </div>
      </div>

      {/* Session selector */}
      <div
        className="grid grid-cols-3 gap-1 p-1 rounded-xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        role="tablist"
        aria-label="Trading session"
      >
        {SESSIONS.map((s) => (
          <button
            key={s.value}
            role="tab"
            aria-selected={session === s.value}
            onClick={() => {
              setSession(s.value);
              haptics.selection();
            }}
            className="py-2 px-1 rounded-lg text-center border-none"
            style={{
              background:
                session === s.value
                  ? 'linear-gradient(135deg,#4f6dff,#7c5cff)'
                  : 'transparent',
              color: session === s.value ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            <span className="block text-sm font-semibold">{s.label}</span>
            <span className="block text-[10px] opacity-80">{s.hours}</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] -mt-2" style={{ color: 'var(--color-text-muted)' }}>
        Auto-detected: {detectSession()} session (UTC). Tap to override.
      </p>

      <button
        className="btn-primary"
        onClick={() => void runRadar()}
        disabled={!canRun}
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading
          ? 'Running Radar…'
          : balance !== null && balance < radarCost
            ? `Need ${radarCost} credits`
            : `Run Radar · ${radarCost} credits`}
      </button>
      <p className="text-center text-xs -mt-1" style={{ color: 'var(--color-text-muted)' }}>
        Balance {balance ?? '—'} credits · +{DAILY_GRANT} free every day
      </p>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      {data?.warnings?.length ? (
        <div
          className="card"
          style={{ borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.06)' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <div className="space-y-1">
              {data.warnings.map((w, i) => (
                <p key={i} className="text-sm" style={{ color: 'var(--color-warning)' }}>
                  {w}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {data?.marketClosed && (
        <p className="text-sm text-center" style={{ color: 'var(--color-warning)' }}>
          Market is currently closed for some assets
          {data.closedAssets?.length ? `: ${data.closedAssets.join(', ')}` : ''}.
        </p>
      )}

      {data && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {data.session} session · {data.timestamp}
          {data.scope ? ` · ${data.scope}` : ''}
        </p>
      )}

      {/* Focus */}
      {data && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
            Focus ({data.focus.length})
          </h2>
          {data.focus.length === 0 ? (
            <EmptyState
              Icon={Target}
              title="No focus pairs right now"
              body="No pairs meet the full criteria for this session."
            />
          ) : (
            data.focus.map((p, i) => (
              <PairCard
                key={`${p.pair}-${i}`}
                pair={p}
                accent="var(--color-success)"
                detailed={!!showFull}
                index={i}
              />
            ))
          )}
        </section>
      )}

      {/* Watch / Avoid — paid tiers only (FREE sees Focus only, like the bot) */}
      {data && showFull && (data.watch.length > 0 || data.avoid.length > 0) && (
        <>
          {data.watch.length > 0 && (
            <section className="card space-y-2">
              <h2 className="flex items-center gap-2 text-base">
                <Eye className="w-5 h-5" style={{ color: 'var(--color-info)' }} />
                Watch ({data.watch.length})
              </h2>
              {data.watch.map((p, i) => (
                <CompactRow key={`${p.pair}-${i}`} pair={p} />
              ))}
            </section>
          )}
          {data.avoid.length > 0 && (
            <section className="card space-y-2">
              <h2 className="flex items-center gap-2 text-base">
                <XCircle className="w-5 h-5" style={{ color: 'var(--color-danger)' }} />
                Avoid ({data.avoid.length})
              </h2>
              {data.avoid.slice(0, 5).map((p, i) => (
                <CompactRow key={`${p.pair}-${i}`} pair={p} />
              ))}
            </section>
          )}
        </>
      )}

      {data && !showFull && (
        <div className="card flex items-start gap-2.5">
          <Lock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Free tier shows Focus pairs with basic info. Pro adds Watch/Avoid
            lists, full timeframe detail, ER/ADR and live alerts.
          </p>
        </div>
      )}

      {/* First run in flight — skeleton pair cards mirror the result layout */}
      {!data && loading && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
            Scanning the {session} session…
          </h2>
          <RadarSkeleton />
        </section>
      )}

      {!data && !loading && (
        <EmptyState
          Icon={Target}
          title="No radar run yet"
          body={`Run Radar to get the ${session} session focus list.`}
        />
      )}

      <p className="text-center text-[11px] pb-2" style={{ color: 'var(--color-text-muted)' }}>
        ⚠️ Analysis tool only. Not investment advice. Trading involves risk.
        Past performance does not guarantee future results.
      </p>
    </div>
  );
}
