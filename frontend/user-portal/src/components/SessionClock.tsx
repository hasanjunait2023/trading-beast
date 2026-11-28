import { SessionClockView } from '@shared/components/SessionClockView';
import type { SessionsOverviewView } from '@shared/radar/adapter';

/**
 * Read-only Session Clock (reference 06, handoff §3 row 06) — web edition.
 * The view is shared with the Mini App (@shared SessionClockView); this
 * wrapper keeps the portal's props, including the device-preference zone
 * hand-off. Zero paid calls — display only.
 */
export function SessionClock({
  overview,
  loading,
  error,
  onRetry,
  initialZone,
  onZoneChange,
}: {
  overview: SessionsOverviewView | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  /** Device-preference zone to start with (defaults to the device zone). */
  initialZone?: string;
  onZoneChange?: (zone: string) => void;
}) {
  return (
    <SessionClockView
      overview={overview}
      loading={loading}
      error={error}
      onRetry={onRetry}
      initialZone={initialZone}
      onZoneChange={onZoneChange}
    />
  );
}
