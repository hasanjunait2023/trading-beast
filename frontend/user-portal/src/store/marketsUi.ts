import { create } from 'zustand';
import type { RadarScope } from './radarStore';

export type StatusFilter = 'all' | 'focus' | 'watch' | 'avoid';

/**
 * Markets view state kept in memory so filters/session/scope/search survive
 * navigating to a pair detail and back (handoff §3 row 04: "Preserve filters
 * on Back"). UI state only — never persisted, never account data.
 */
interface MarketsUiState {
  session: string | null; // null = follow the sessions overview default
  scope: RadarScope;
  filter: StatusFilter;
  search: string;
  set: (patch: Partial<Omit<MarketsUiState, 'set'>>) => void;
}

export const useMarketsUi = create<MarketsUiState>((set) => ({
  session: null,
  scope: 'watchlist',
  filter: 'all',
  search: '',
  set: (patch) => set(patch),
}));
