import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { analysisApi, userApi } from '../services/api';
import { Target, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function Focus() {
  const { user } = useAuth();
  const [focusData, setFocusData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<number|null>(null);
  const [error, setError] = useState('');
  const loadCredits = () => userApi.credits().then(r=>setBalance(r.data.data.balance)).catch(()=>{});
  const [selectedSession, setSelectedSession] = useState<'Asian' | 'London' | 'New York'>('London');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  void lastUpdated;

  useEffect(() => {
    void loadCredits();
  }, []);

  const fetchFocus = async () => {
    setIsLoading(true); setError('');
    try {
      const res = await analysisApi.getFocus(selectedSession, user?.watchlist);
      if (res.data.success) {
        setFocusData(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      setError('Radar unavailable or insufficient credits. Check your balance and try again.');
    } finally {
      setIsLoading(false); void loadCredits();
    }
  };

  const formatPrice = (price: number, decimals: number) => price.toFixed(decimals);

  const sessions: { value: 'Asian' | 'London' | 'New York'; label: string; emoji: string }[] = [
    { value: 'Asian', label: 'Asian', emoji: '🌏' },
    { value: 'London', label: 'London', emoji: '🇬🇧' },
    { value: 'New York', label: 'New York', emoji: '🇺🇸' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Focus List</h1>
          <p className="text-[var(--color-text-muted)]">
            Session-aware top pairs for {selectedSession} session
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value as any)}
            className="input py-2 px-3 bg-[var(--color-surface)] max-w-xs"
          >
            {sessions.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
          </select>
          <button onClick={fetchFocus} disabled={isLoading || balance === null || balance < 10} className="btn btn-secondary btn-sm">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Radar · 10 credits
          </button>
        </div>
      </div>

      <p>Available credits: {balance ?? '—'} · +10 daily</p>
      {error && <p role="alert">{error}</p>}
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

      {/* Focus Cards */}
      <div className="grid grid-1 md:grid-2 lg:grid-3 gap-4">
        {focusData?.focus?.map((pair: any, index: number) => (
          <div key={`${pair.pair}-${index}`} className="card-elevated relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-success)]" />
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{pair.icon || '📊'}</span>
                  <div>
                    <h3 className="font-display font-bold text-lg">{pair.kind === 'asset' ? pair.name : pair.pair}</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {pair.kind === 'fx' ? `${pair.base}/{pair.quote}` : pair.group}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  pair.bias === 'BUY' ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]' :
                  pair.bias === 'SELL' ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]' :
                  'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]'
                }`}>
                  {pair.bias === 'BUY' ? '📈 BUY' : pair.bias === 'SELL' ? '📉 SELL' : '➖ NEUTRAL'}
                </span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <div className="text-center">
                  <p className="font-display font-bold text-2xl text-[var(--color-accent)]">{pair.score}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Score</p>
                </div>
                <div className="text-center">
                  <p className="font-mono font-semibold text-lg">{formatPrice(pair.live, pair.dec)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Live</p>
                </div>
                <div className="text-center">
                  <p className="font-mono font-semibold text-lg">{pair.rsi.toFixed(0)}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">RSI</p>
                </div>
              </div>

              <div className="grid grid-3 gap-3 text-sm mb-3">
                <div className="text-center p-2 bg-[var(--color-bg)] rounded-lg">
                  <p className="text-[var(--color-text-muted)]">4H Trend</p>
                  <p className={`font-medium ${pair.d4 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {pair.d4 >= 0 ? '+' : ''}{pair.d4}
                  </p>
                </div>
                <div className="text-center p-2 bg-[var(--color-bg)] rounded-lg">
                  <p className="text-[var(--color-text-muted)]">1H Trend</p>
                  <p className={`font-medium ${pair.d1 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {pair.d1 >= 0 ? '+' : ''}{pair.d1}
                  </p>
                </div>
                <div className="text-center p-2 bg-[var(--color-bg)] rounded-lg">
                  <p className="text-[var(--color-text-muted)]">15m Trend</p>
                  <p className={`font-medium ${pair.d15 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {pair.d15 >= 0 ? '+' : ''}{pair.d15}
                  </p>
                </div>
              </div>

              {pair.orConfirmed && (
                <div className="flex items-center gap-2 p-2 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded-lg text-[var(--color-success)] text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>OR Breakout Confirmed</span>
                </div>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-[var(--color-text-muted)] flex items-center justify-between">
                  Details
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                </summary>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-2 gap-2">
                    <div><span className="text-[var(--color-text-muted)]">EMA 20:</span> <span className="font-mono ml-2">{formatPrice(pair.e20, pair.dec)}</span></div>
                    <div><span className="text-[var(--color-text-muted)]">EMA 50:</span> <span className="font-mono ml-2">{formatPrice(pair.e50, pair.dec)}</span></div>
                    {pair.pdh && <div><span className="text-[var(--color-text-muted)]">PDH:</span> <span className="font-mono ml-2">{formatPrice(pair.pdh, pair.dec)}</span></div>}
                    {pair.pdl && <div><span className="text-[var(--color-text-muted)]">PDL:</span> <span className="font-mono ml-2">{formatPrice(pair.pdl, pair.dec)}</span></div>}
                    {pair.orHigh && <div><span className="text-[var(--color-text-muted)]">OR High:</span> <span className="font-mono ml-2">{formatPrice(pair.orHigh, pair.dec)}</span></div>}
                    {pair.orLow && <div><span className="text-[var(--color-text-muted)]">OR Low:</span> <span className="font-mono ml-2">{formatPrice(pair.orLow, pair.dec)}</span></div>}
                    <div><span className="text-[var(--color-text-muted)]">ER:</span> <span className="ml-2">{pair.er.toFixed(2)}</span></div>
                    <div><span className="text-[var(--color-text-muted)]">Activity:</span> <span className="ml-2">{pair.act.toFixed(1)}x</span></div>
                    {pair.adrPct !== null && <div><span className="text-[var(--color-text-muted)]">ADR:</span> <span className="ml-2">{pair.adrPct}%</span></div>}
                    <div><span className="text-[var(--color-text-muted)]">ATR(15):</span> <span className="font-mono ml-2">{formatPrice(pair.atr15, pair.dec)}</span></div>
                    <div><span className="text-[var(--color-text-muted)]">Room:</span> <span className={`ml-2 ${pair.cramped ? 'text-[var(--color-warning)]' : ''}`}>{pair.roomATR ? pair.roomATR.toFixed(1) + ' ATR' : 'N/A'}</span></div>
                  </div>
                  {pair.cramped && <p className="text-[var(--color-warning)] text-sm">⚠ Cramped RR — limited room to target</p>}
                  {pair.stretched && <p className="text-[var(--color-warning)] text-sm">⚠ Extended — late entry risk</p>}
                  {pair.divAgainst && <p className="text-[var(--color-warning)] text-sm">⚠ RSI divergence against bias</p>}
                </div>
              </details>
            </div>
          </div>
        ))}

        {(!focusData?.focus?.length || focusData.focus.length === 0) && (
          <div className="col-span-full card text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-lg mb-2">No Focus Pairs</h3>
            <p className="text-[var(--color-text-muted)]">No pairs meet the full criteria for this session.</p>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">Check back during the next session or view Watch list.</p>
          </div>
        )}
      </div>

      {/* Watch & Avoid Summary */}
      {(focusData?.watch?.length || focusData?.avoid?.length) && (
        <div className="grid md:grid-2 gap-4">
          {focusData.watch?.length && (
            <div className="card">
              <h3 className="font-medium mb-3 flex items-center gap-2 text-[var(--color-info)]">
                <Target className="w-5 h-5" /> Watch ({focusData.watch.length})
              </h3>
              <div className="space-y-2">
                {focusData.watch.map((pair: any) => (
                  <div key={pair.pair} className="flex items-center justify-between p-2 bg-[var(--color-bg)] rounded-lg">
                    <span className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</span>
                    <span className={`text-sm font-medium ${pair.bias === 'BUY' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {pair.bias === 'BUY' ? '📈' : '📉'} {pair.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {focusData.avoid?.length && (
            <div className="card">
              <h3 className="font-medium mb-3 flex items-center gap-2 text-[var(--color-danger)]">
                <XCircle className="w-5 h-5" /> Avoid ({focusData.avoid.length})
              </h3>
              <div className="space-y-2">
                {focusData.avoid.slice(0, 5).map((pair: any) => (
                  <div key={pair.pair} className="flex items-center justify-between p-2 bg-[var(--color-bg)] rounded-lg">
                    <span className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</span>
                    <span className="text-sm text-[var(--color-text-muted)]">{pair.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Analysis tool only. Not investment advice. Trading involves risk. Past performance does not guarantee future results.
      </p>
    </div>
  );
}