import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { analysisApi } from '../services/api';
import { Target, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [focusData, setFocusData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'focus' | 'watch' | 'avoid'>('focus');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchFocus();
    const interval = setInterval(fetchFocus, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchFocus = async () => {
    try {
      const res = await analysisApi.getFocus();
      if (res.data.success) {
        setFocusData(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch focus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBiasLabel = (bias: string | null) => {
    switch (bias) {
      case 'BUY': return 'BUY';
      case 'SELL': return 'SELL';
      default: return 'NEUTRAL';
    }
  };

  const getBiasColor = (bias: string | null) => {
    switch (bias) {
      case 'BUY': return 'text-[var(--color-success)]';
      case 'SELL': return 'text-[var(--color-danger)]';
      default: return 'text-[var(--color-text-muted)]';
    }
  };

  const formatPrice = (price: number, decimals: number) => price.toFixed(decimals);

  const pairsToShow = focusData ? focusData[activeTab] : [];

  if (isLoading && !focusData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-[var(--color-text-muted)]">
            {focusData ? `${focusData.session} Session · ${focusData.timestamp} BDT` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchFocus} disabled={isLoading} className="btn btn-secondary btn-sm">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M1 20v-6h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Warnings */}
      {focusData?.warnings?.length && (
        <div className="card border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              {focusData.warnings.map((w: string, i: number) => (
                <p key={i} className="text-sm text-[var(--color-warning)]">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-[var(--color-border)]">
          {(['focus', 'watch', 'avoid'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors relative ${
                activeTab === tab
                  ? 'text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {tab === 'focus' && '✅ Focus'}
              {tab === 'watch' && '👀 Watch'}
              {tab === 'avoid' && '🚫 Avoid'}
              {focusData && pairsToShow.length > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                  tab === 'focus' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' :
                  tab === 'watch' ? 'bg-[var(--color-info)]/20 text-[var(--color-info)]' :
                  'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                }`}>
                {pairsToShow.length}
              </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {pairsToShow.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)]">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pairs in this category right now</p>
              <p className="text-sm mt-1">Check back during the next session</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pairsToShow.map((pair: any, index: number) => (
                <div key={`${pair.pair}-${index}`} className="card-elevated">
                  <div className="grid grid-4 gap-4 items-center">
                    {/* Pair info */}
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pair.icon || (pair.kind === 'asset' ? '📊' : '💱')}</span>
                      <div>
                        <p className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {pair.kind === 'fx' ? `${pair.base}/${pair.quote}` : pair.group}
                          {pair.sessions && ` · ${pair.sessions.join(', ')}`}
                        </p>
                      </div>
                    </div>

                    {/* Score & Bias */}
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className={`text-xl font-display font-bold ${getBiasColor(pair.bias)}`}>{pair.score}</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getBiasColor(pair.bias)} bg-current/10`}>
                          {getBiasLabel(pair.bias)}
                        </span>
                      </div>
                      <div className="flex items-center justify-center gap-4 text-xs text-[var(--color-text-muted)]">
                        <span>ER: {pair.er.toFixed(2)}</span>
                        <span>RSI: {pair.rsi.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Price & Levels */}
                    <div className="text-center space-y-1">
                      <p className="font-mono font-semibold">{formatPrice(pair.live, pair.dec)}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">Live</p>
                      {pair.orConfirmed && (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-success)] bg-[var(--color-success)]/10 px-2 py-0.5 rounded">
                          <CheckCircle className="w-3 h-3" />
                          OR Breakout
                        </span>
                      )}
                    </div>

                    {/* Details (Pro only) */}
                    <div className="text-right space-y-1 text-sm">
                      {user?.tier !== 'FREE' && (
                        <>
                          <div className="flex justify-end gap-4 text-xs">
                            <span className="text-[var(--color-text-muted)]">4H: <span className={pair.d4 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>{pair.d4 >= 0 ? '+' : ''}{pair.d4}</span></span>
                            <span className="text-[var(--color-text-muted)]">1H: <span className={pair.d1 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>{pair.d1 >= 0 ? '+' : ''}{pair.d1}</span></span>
                            <span className="text-[var(--color-text-muted)]">15m: <span className={pair.d15 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>{pair.d15 >= 0 ? '+' : ''}{pair.d15}</span></span>
                          </div>
                          <div className="flex justify-end gap-4 text-xs text-[var(--color-text-muted)]">
                            {pair.adrPct !== null && <span>ADR: {pair.adrPct}%</span>}
                            {pair.act.toFixed(1)}x Activity
                          </div>
                        </>
                      )}
                      {user?.tier === 'FREE' && (
                        <p className="text-xs text-[var(--color-text-muted)]">Upgrade for full analysis</p>
                      )}
                    </div>
                  </div>

                  {/* Expandable details for Pro */}
                  {user?.tier !== 'FREE' && (
                    <details className="mt-3 pt-3 border-t border-[var(--color-border)]">
                      <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] flex items-center gap-1">
                        Show details
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                      </summary>
                      <div className="mt-3 grid grid-3 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--color-text-muted)]">EMA Levels</p>
                          <p>EMA 20: {formatPrice(pair.e20, pair.dec)}</p>
                          <p>EMA 50: {formatPrice(pair.e50, pair.dec)}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Key Levels</p>
                          {pair.pdh && <p>PDH: {formatPrice(pair.pdh, pair.dec)}</p>}
                          {pair.pdl && <p>PDL: {formatPrice(pair.pdl, pair.dec)}</p>}
                          {pair.orHigh && <p>OR High: {formatPrice(pair.orHigh, pair.dec)}</p>}
                          {pair.orLow && <p>OR Low: {formatPrice(pair.orLow, pair.dec)}</p>}
                        </div>
                        <div>
                          <p className="text-[var(--color-text-muted)]">Risk Metrics</p>
                          <p>ATR(15): {formatPrice(pair.atr15, pair.dec)}</p>
                          <p>Room: {pair.roomATR ? pair.roomATR.toFixed(1) + ' ATR' : 'N/A'}</p>
                          {pair.cramped && <p className="text-[var(--color-warning)]">⚠ Cramped RR</p>}
                          {pair.stretched && <p className="text-[var(--color-warning)]">⚠ Extended</p>}
                          {pair.divAgainst && <p className="text-[var(--color-warning)]">⚠ Div Against</p>}
                        </div>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Analysis tool only. Not investment advice. Trading involves risk. Past performance does not guarantee future results.
      </p>
    </div>
  );
}