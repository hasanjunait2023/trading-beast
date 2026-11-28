import { PageHeader } from '@shared/components/PageHeader';
import { SessionClock } from '../components/SessionClock';
import { useSessions } from '../hooks/useSessions';
import { usePrefsStore, effectiveZone } from '../store/prefs';

/**
 * Session Clock page (study 06). Read-only, zero paid calls. The display
 * zone starts from the device preference saved in Setup/Settings and any
 * change here updates that same local preference.
 */
export default function SessionsPage() {
  const { overview, loading, error, reload } = useSessions();
  const savedTz = usePrefsStore((s) => s.timezone);
  const setTimezone = usePrefsStore((s) => s.setTimezone);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Session Clock"
        subtitle="Asian, London and New York windows — display only, no credits involved."
      />
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
