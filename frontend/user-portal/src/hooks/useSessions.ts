import { useCallback, useEffect, useState } from 'react';
import { adaptSessions, type SessionsOverviewView } from '@shared/radar/adapter';
import { analysisApi } from '../services/api';

/** Read-only session overview loader (GET /analysis/sessions). Zero paid calls. */
export function useSessions() {
  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analysisApi.getSessions();
      setOverview(adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]));
      setError('');
    } catch {
      setError('Session clock unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { overview, loading, error, reload: load };
}
