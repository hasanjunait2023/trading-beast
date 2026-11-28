import { create } from 'zustand';
import type { RadarPairView, RadarResultView } from '@shared/radar/adapter';

/**
 * Account-scoped, in-memory store for Radar results (handoff §4): results
 * live ONLY here — there is no read endpoint (GET /analysis/focus/:session
 * is 405) and nothing is persisted to storage. Entries are keyed by
 * userId + session + scope and cleared on logout / identity change / 401.
 * Same pattern as the Mini App store (Z1).
 */

export type RadarScope = 'watchlist' | 'all';

export function radarKey(userId: string, session: string, scope: RadarScope): string {
  return `${userId}::${session}::${scope}`;
}

export interface StoredPairHit {
  pair: RadarPairView;
  result: RadarResultView;
}

interface RadarState {
  results: Record<string, RadarResultView>;
  /** Most recent successful run, for the Home "last result" preview. */
  lastKey: string | null;
  setResult: (key: string, result: RadarResultView) => void;
  getResult: (key: string) => RadarResultView | undefined;
  getLast: () => RadarResultView | undefined;
  /** Find any stored result (any session/scope) containing a pair code. */
  findPair: (userId: string, pairCode: string) => StoredPairHit | undefined;
  clearAll: () => void;
}

export const useRadarStore = create<RadarState>((set, get) => ({
  results: {},
  lastKey: null,
  setResult: (key, result) =>
    set((s) => ({ results: { ...s.results, [key]: result }, lastKey: key })),
  getResult: (key) => get().results[key],
  getLast: () => {
    const { lastKey, results } = get();
    return lastKey ? results[lastKey] : undefined;
  },
  findPair: (userId, pairCode) => {
    const prefix = `${userId}::`;
    for (const [key, result] of Object.entries(get().results)) {
      if (!key.startsWith(prefix)) continue;
      const hit = result.all.find((p) => p.pair === pairCode);
      if (hit) return { pair: hit, result };
    }
    return undefined;
  },
  clearAll: () => set({ results: {}, lastKey: null }),
}));
