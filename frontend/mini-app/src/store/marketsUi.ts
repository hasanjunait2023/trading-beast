import { create } from 'zustand';
import type { RadarScope } from './radarStore';

export type StatusFilter = 'all' | 'focus' | 'watch' | 'avoid';

/**
 * Shared Markets UI state (R1): Home and Markets must agree on the selected
 * session/scope so "See Details" and shortlist taps land on the same scan
 * the user was just looking at, and filters survive Home → Markets → Pair
 * Detail → Back (handoff §3 row 04). In-memory only; changing anything
 * here NEVER triggers a paid Radar run.
 */
interface MarketsUiState {
  /** '' until the sessions overview picks the server's selected session. */
  session: string;
  sessionTouched: boolean;
  scope: RadarScope;
  filter: StatusFilter;
  /** Markets search query (reference 04) — filters the catalog/results
   *  locally; searching never triggers a paid run. */
  search: string;
  /** Pair code Markets should open in its detail subview (set by Home). */
  selectedPairCode: string | null;
  setSession: (session: string) => void;
  /** Adopt the server-selected session without marking it user-chosen. */
  adoptSession: (session: string) => void;
  setScope: (scope: RadarScope) => void;
  setFilter: (filter: StatusFilter) => void;
  setSearch: (search: string) => void;
  setSelectedPairCode: (code: string | null) => void;
  reset: () => void;
}

export const useMarketsUi = create<MarketsUiState>((set) => ({
  session: '',
  sessionTouched: false,
  scope: 'watchlist',
  filter: 'all',
  search: '',
  selectedPairCode: null,
  setSession: (session) => set({ session, sessionTouched: true, selectedPairCode: null }),
  adoptSession: (session) =>
    set((s) => (s.sessionTouched || s.session ? s : { session })),
  setScope: (scope) => set({ scope, selectedPairCode: null }),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSelectedPairCode: (selectedPairCode) => set({ selectedPairCode }),
  reset: () =>
    set({
      session: '',
      sessionTouched: false,
      scope: 'watchlist',
      filter: 'all',
      search: '',
      selectedPairCode: null,
    }),
}));
