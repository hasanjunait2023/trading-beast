import { SessionClockView } from '@shared/components/SessionClockView';
import type { SessionsOverviewView } from '@shared/radar/adapter';

/**
 * Read-only Session Clock (reference 06, handoff §3 row 06). The view is
 * shared with the web portal (@shared SessionClockView); this wrapper
 * keeps the Mini App's existing props. Zero paid calls — display only.
 */
export function SessionClock({
  overview,
  loading,
  error,
  onRetry,
}: {
  overview: SessionsOverviewView | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  return (
    <SessionClockView overview={overview} loading={loading} error={error} onRetry={onRetry} />
  );
}
