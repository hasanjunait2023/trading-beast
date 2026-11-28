import { adaptRadarRun, type RawFocusResult } from '@shared/radar/adapter';
import { analysisApi } from './api';
import { useRadarStore, radarKey, type RadarScope } from '../store/radarStore';

/**
 * One-shot, GET-only hydration of the in-memory Radar store from the
 * persisted run history (GET /api/analysis/runs/latest). Discipline:
 *  - never calls POST /analysis/focus and never runs on navigation by
 *    itself — pages invoke it explicitly on load;
 *  - at most one fetch per account per store lifetime (guard below), and
 *    only when the store holds nothing for that account;
 *  - any failure (offline, 500, malformed payload) is silent: the existing
 *    empty / in-memory behavior is the fallback;
 *  - the guard resets when the store is cleared (logout / 401), so a fresh
 *    sign-in can hydrate again.
 */
const attempted = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

useRadarStore.subscribe((state) => {
  if (Object.keys(state.results).length === 0) attempted.clear();
});

function hasStoredResult(userId: string): boolean {
  const prefix = `${userId}::`;
  return Object.keys(useRadarStore.getState().results).some((k) => k.startsWith(prefix));
}

export function hydrateLatestRadar(userId: string): Promise<void> {
  if (!userId || attempted.has(userId) || hasStoredResult(userId)) return Promise.resolve();
  const pending = inFlight.get(userId);
  if (pending) return pending;

  attempted.add(userId);
  const task = (async () => {
    try {
      const res = await analysisApi.getLatestRun();
      const run = res.data.data;
      if (!run || !run.result) return;
      const view = adaptRadarRun({
        runId: run.runId,
        session: run.session,
        scope: run.scope,
        completedAt: run.completedAt,
        startedAt: run.startedAt,
        result: run.result as RawFocusResult,
      });
      if (!view) return;
      // Re-check: a fresh paid run may have landed while we were fetching.
      if (hasStoredResult(userId)) return;
      const scope: RadarScope = view.scope === 'all' ? 'all' : 'watchlist';
      useRadarStore.getState().setResult(radarKey(userId, view.session, scope), view);
    } catch {
      /* silent fallback to empty/memory behavior */
    } finally {
      inFlight.delete(userId);
    }
  })();
  inFlight.set(userId, task);
  return task;
}
