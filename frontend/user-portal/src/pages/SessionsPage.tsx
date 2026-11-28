import { SessionClock } from '../components/SessionClock';
import { useSessions } from '../hooks/useSessions';
import { usePrefsStore, effectiveZone } from '../store/prefs';

/**
 * Session Clock page (reference 06). Read-only, zero paid calls. The
 * shared clock view leads with its own hero, so no separate page header.
 * The display zone starts from the device preference saved in
 * Setup/Settings and any change here updates that same local preference.
 */
export default function SessionsPage() {
  const { overview, loading, error, reload } = useSessions();
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);

  return (
    <div className="mx-auto max-w-4xl">
      <SessionClock
        overview={overview}
        loading={loading}
        error={error}
        onRetry={() => void reload()}
        initialZone={effectiveZone(savedTz)}
        onZoneChange={(z) => setTimezone(z)}
      />
    </div>
  );
}
