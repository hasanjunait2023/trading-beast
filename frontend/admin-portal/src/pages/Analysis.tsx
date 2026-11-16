import { useState, useEffect } from 'react';
import { adminApi } from '../services/api';
import { RefreshCw, Play, Pause, Calendar, Download, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const SESSIONS = ['Asian', 'London', 'New York'] as const;

export default function Analysis() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Record<string, Date>>({});
  const [selectedSession, setSelectedSession] = useState<'Asian' | 'London' | 'New York'>('London');
  const [autoGenerate, setAutoGenerate] = useState(false);

  useEffect(() => {
    if (autoGenerate) {
      const interval = setInterval(() => {
        generateAnalysis();
      }, 30 * 60 * 1000); // Every 30 minutes
      return () => clearInterval(interval);
    }
  }, [autoGenerate]);

  const generateAnalysis = async () => {
    setIsGenerating(true);
    try {
      const res = await adminApi.triggerAnalysis();
      if (res.data.success) {
        const data = res.data.data;
        const newResults: Record<string, any> = {};
        const newTimestamps: Record<string, Date> = {};
        data.forEach((r: any) => {
          newResults[r.session] = r;
          newTimestamps[r.session] = new Date();
        });
        setResults(prev => ({ ...prev, ...newResults }));
        setLastGenerated(prev => ({ ...prev, ...newTimestamps }));
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchCached = async (session: string) => {
    setIsLoading(true);
    try {
      // In a real app, this would fetch from the cached FocusResult
      // For now, just trigger a fresh analysis
      await generateAnalysis();
    } finally {
      setIsLoading(false);
    }
  };

  const currentResult = results[selectedSession];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Analysis Engine</h1>
          <p className="text-[var(--color-text-muted)]">Generate and review session focus analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => setAutoGenerate(e.target.checked)}
              className="w-4 h-4 accent-[var(--color-accent)]"
            />
            Auto-generate (30 min)
          </label>
          <button
            onClick={generateAnalysis}
            disabled={isGenerating}
            className="btn btn-primary"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Session Selector */}
      <div className="card flex flex-wrap gap-2">
        {SESSIONS.map((session) => (
          <button
            key={session}
            onClick={() => setSelectedSession(session)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedSession === session
                ? 'bg-[var(--color-accent)] text-black'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)]'
            }`}
          >
            {session}
            {lastGenerated[session] && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--color-bg)] rounded">
                {lastGenerated[session].toLocaleTimeString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Analysis Result */}
      <div className="card">
        {isLoading && !currentResult ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : !currentResult ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No analysis generated for {selectedSession} session</p>
            <p className="text-sm mt-1">Click "Generate Now" to run the analysis</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
              <div>
                <h2 className="font-display text-xl font-bold">{selectedSession} Session Analysis</h2>
                <p className="text-[var(--color-text-muted)]">
                  {currentResult.timestamp} · {currentResult.scope}
                  {lastGenerated[selectedSession] && (
                    <> · Generated {lastGenerated[selectedSession].toLocaleString()}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchCached(selectedSession)} disabled={isLoading} className="btn btn-secondary btn-sm">
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button className="btn btn-ghost btn-sm">
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Warnings */}
            {currentResult.warnings?.length && (
              <div className="p-4 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-lg">
                <h3 className="font-medium text-[var(--color-warning)] mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </h3>
                <ul className="space-y-1 text-sm">
                  {currentResult.warnings.map((w: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-[var(--color-warning)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Focus Pairs */}
            <div>
              <h3 className="font-medium mb-4 flex items-center gap-2 text-[var(--color-success)]">
                <CheckCircle className="w-5 h-5" />
                ✅ Focus Pairs ({currentResult.focus?.length || 0})
              </h3>
              {currentResult.focus?.length === 0 ? (
                <p className="text-[var(--color-text-muted)] text-center py-8">No focus pairs meet criteria</p>
              ) : (
                <div className="grid grid-1 md:grid-2 lg:grid-3 gap-4">
                  {currentResult.focus.map((pair: any, index: number) => (
                    <div key={`${pair.pair}-${index}`} className="p-4 bg-[var(--color-bg)] rounded-lg border border-[var(--color-success)]/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{pair.icon || '📊'}</span>
                          <div>
                            <p className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</p>
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

                      <div className="grid grid-3 gap-3 text-sm mb-3">
                        <div className="text-center p-2 bg-[var(--color-surface)] rounded">
                          <p className="text-[var(--color-text-muted)]">Score</p>
                          <p className="font-display font-bold text-[var(--color-accent)]">{pair.score}</p>
                        </div>
                        <div className="text-center p-2 bg-[var(--color-surface)] rounded">
                          <p className="text-[var(--color-text-muted)]">Live</p>
                          <p className="font-mono font-semibold">{pair.live.toFixed(pair.dec)}</p>
                        </div>
                        <div className="text-center p-2 bg-[var(--color-surface)] rounded">
                          <p className="text-[var(--color-text-muted)]">RSI</p>
                          <p className="font-mono font-semibold">{pair.rsi.toFixed(0)}</p>
                        </div>
                      </div>

                      <div className="grid grid-3 gap-2 text-xs mb-3">
                        <div className={`text-center p-1.5 rounded ${pair.d4 >= 0 ? 'bg-[var(--color-success)]/10' : 'bg-[var(--color-danger)]/10'}`}>
                          <p className="text-[var(--color-text-muted)]">4H</p>
                          <p className={`font-medium ${pair.d4 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {pair.d4 >= 0 ? '+' : ''}{pair.d4}
                          </p>
                        </div>
                        <div className={`text-center p-1.5 rounded ${pair.d1 >= 0 ? 'bg-[var(--color-success)]/10' : 'bg-[var(--color-danger)]/10'}`}>
                          <p className="text-[var(--color-text-muted)]">1H</p>
                          <p className={`font-medium ${pair.d1 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {pair.d1 >= 0 ? '+' : ''}{pair.d1}
                          </p>
                        </div>
                        <div className={`text-center p-1.5 rounded ${pair.d15 >= 0 ? 'bg-[var(--color-success)]/10' : 'bg-[var(--color-danger)]/10'}`}>
                          <p className="text-[var(--color-text-muted)]">15m</p>
                          <p className={`font-medium ${pair.d15 >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {pair.d15 >= 0 ? '+' : ''}{pair.d15}
                          </p>
                        </div>
                      </div>

                      {pair.orConfirmed && (
                        <div className="flex items-center gap-2 p-2 bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 rounded text-[var(--color-success)] text-sm">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          <span>OR Breakout Confirmed</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Watch Pairs */}
              {currentResult.watch?.length && (
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <h3 className="font-medium mb-4 flex items-center gap-2 text-[var(--color-info)]">
                    <Clock className="w-5 h-5" />
                    👀 Watch Pairs ({currentResult.watch.length})
                  </h3>
                  <div className="grid grid-2 md:grid-4 gap-3">
                    {currentResult.watch.map((pair: any) => (
                      <div key={pair.pair} className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-info)]/20">
                        <p className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {pair.bias === 'BUY' ? '📈' : '📉'} Score: {pair.score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Avoid Pairs */}
              {currentResult.avoid?.length && (
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                  <h3 className="font-medium mb-4 flex items-center gap-2 text-[var(--color-danger)]">
                    <XCircle className="w-5 h-5" />
                    🚫 Avoid Pairs ({currentResult.avoid.length})
                  </h3>
                  <div className="grid grid-2 md:grid-4 gap-3">
                    {currentResult.avoid.slice(0, 8).map((pair: any) => (
                      <div key={pair.pair} className="p-3 bg-[var(--color-bg)] rounded-lg border border-[var(--color-danger)]/20">
                        <p className="font-medium">{pair.kind === 'asset' ? pair.name : pair.pair}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">Score: {pair.score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-[var(--color-text-muted)]">
        ⚠️ Analysis tool only. Not investment advice. Trading involves risk. Past performance does not guarantee future results.
      </p>
    </div>
  );
}