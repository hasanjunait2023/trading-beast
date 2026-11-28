import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { PageHeader } from '@shared/components/PageHeader';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Modal } from '@shared/components/Modal';
import { ErrorState } from '@shared/components/ErrorState';
import { EmptyState } from '@shared/components/EmptyState';
import { UnavailableState } from '@shared/components/UnavailableState';
import { Skeleton } from '@shared/components/Skeleton';
import { useToast } from '@shared/components/Toast';
import { SessionBadge } from '@shared/components/SessionBadge';
import { errorMessage } from '../lib/format';

interface SessionRow {
  name?: string;
  session?: string;
  zone?: string;
  active?: boolean;
  orDone?: boolean;
  sessionStartTs?: number;
  sessionEndTs?: number;
  nextStartTs?: number;
}
interface SessionsData {
  asOf?: number;
  fxWeekOpen?: boolean;
  selected?: string;
  active?: string[];
  overlap?: boolean;
  sessions?: SessionRow[];
  calendarPolicy?: string;
}

/**
 * Analysis — session overview from GET /api/analysis/sessions (a user
 * route; the admin token is also a user token, and if the server refuses
 * it the honest unavailable state is shown) + the daily publishing trigger
 * POST /api/admin/analysis/trigger behind a confirmation Modal.
 * The old page's local "auto-generate every 30 min" timer and its
 * fetch-cached stub are removed — no client-side scheduling exists.
 */
export default function Analysis() {
  const toast = useToast();
  const [sessions, setSessions] = useState<SessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAnalysisSessions();
      if (res.data.success) setSessions(res.data.data as SessionsData);
      setSessionsError('');
    } catch (e) {
      setSessionsError(errorMessage(e, 'Session overview is unavailable to this account.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const trigger = async () => {
    setTriggering(true);
    setTriggerResult('');
    try {
      const res = await adminApi.triggerAnalysis();
      if (res.data.success) {
        const count = Array.isArray(res.data.data) ? res.data.data.length : null;
        setTriggerResult(count !== null ? `Daily publishing completed — ${count} session result(s) returned.` : 'Daily publishing completed.');
        toast.success('Daily publishing triggered.');
        setConfirmOpen(false);
        void load();
      }
    } catch (e) {
      setTriggerResult(errorMessage(e, 'Analysis trigger failed.'));
      setConfirmOpen(false);
    } finally {
      setTriggering(false);
    }
  };

  const fmtTs = (ts?: number) => (ts ? new Date(ts * 1000).toLocaleString() : '—');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analysis"
        subtitle="Session overview and the daily publishing trigger."
        actions={
          <>
            <Button variant="secondary" size="sm" loading={loading} onClick={() => void load()}>Refresh</Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)}>Run daily publishing</Button>
          </>
        }
      />

      {triggerResult && (
        <p role="status" className="rounded-[var(--radius-md)] bg-[var(--color-info-bg)] px-3 py-2 text-sm font-medium text-[var(--color-info)]">{triggerResult}</p>
      )}

      <Card padded={false} className="overflow-hidden">
        <h2 className="p-4 pb-2 font-semibold">Sessions</h2>
        {loading ? (
          <div className="space-y-3 p-4" role="status" aria-label="Loading sessions"><Skeleton height={36} /><Skeleton height={36} /><Skeleton height={36} /></div>
        ) : sessionsError ? (
          <UnavailableState title="Session overview unavailable" reason={`${sessionsError} The trigger below uses the admin endpoint and remains available.`} />
        ) : !sessions || (sessions.sessions ?? []).length === 0 ? (
          <EmptyState title="No session data" message="The sessions endpoint returned no rows." />
        ) : (
          <>
            <div className="flex flex-wrap gap-4 px-4 pb-2 text-sm text-[var(--color-text-muted)]">
              <span>As of: <span className="font-medium text-[var(--color-text)]">{fmtTs(sessions.asOf)}</span></span>
              <span>FX week: <span className="font-medium text-[var(--color-text)]">{sessions.fxWeekOpen ? 'Open' : 'Closed'}</span></span>
              {sessions.calendarPolicy && <span>Calendar policy: <span className="font-medium text-[var(--color-text)]">{sessions.calendarPolicy}</span></span>}
            </div>
            <div className="overflow-x-auto">
              <table className="tb-table">
                <thead><tr><th>Session</th><th>Zone</th><th>State</th><th>Window</th><th>Next start</th><th>Opening range</th></tr></thead>
                <tbody>
                  {sessions.sessions!.map((s, i) => {
                    const name = s.name ?? s.session ?? `Session ${i + 1}`;
                    return (
                      <tr key={name}>
                        <td className="font-medium">{name}</td>
                        <td>{s.zone ?? '—'}</td>
                        <td><SessionBadge name={name} state={s.active ? 'live' : 'closed'} /></td>
                        <td className="text-sm">{fmtTs(s.sessionStartTs)} → {fmtTs(s.sessionEndTs)}</td>
                        <td className="text-sm">{fmtTs(s.nextStartTs)}</td>
                        <td className="text-sm">{s.orDone === undefined ? '—' : s.orDone ? 'Done' : 'Pending'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Daily publishing</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Runs the server-side daily publishing job (POST /api/admin/analysis/trigger) once, immediately.
          There is no client-side schedule — recurring runs are the server scheduler's job.
        </p>
        {triggerResult && triggerResult.includes('failed') && <div className="mt-3"><ErrorState message={triggerResult} /></div>}
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Run daily publishing now?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button loading={triggering} onClick={() => void trigger()}>Run now</Button>
          </>
        }
      >
        <p>This triggers the daily analysis publishing job on the server right away. It can take a while to complete; the result count returned by the API will be shown here.</p>
      </Modal>
    </div>
  );
}
