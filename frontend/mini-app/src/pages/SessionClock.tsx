import { useEffect, useMemo, useState } from 'react';
import { Card } from '@shared/components/Card';
import { SessionBadge, type SessionState } from '@shared/components/SessionBadge';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { Select, FormField } from '@shared/components/FormField';
import type { SessionsOverviewView } from '@shared/radar/adapter';

/**
 * Read-only Session Clock (study 06, handoff §3 row 06). Renders the backend
 * session windows (already converted seconds → ms by the shared adapter) in a
 * selectable IANA timezone. Makes ZERO paid calls — display only.
 */

function fmt(ms: number, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms));
}

function fmtFull(ms: number, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ms));
}

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
  const deviceZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);
  const [zone, setZone] = useState(deviceZone);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const zones = useMemo(() => {
    const set = new Set<string>([deviceZone, 'Asia/Dhaka', 'UTC']);
    overview?.sessions.forEach((s) => set.add(s.zone));
    return [...set];
  }, [deviceZone, overview]);

  if (loading && !overview) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading session clock">
        <Skeleton height={120} />
        <Skeleton height={72} />
        <Skeleton height={72} />
      </div>
    );
  }
  if (error && !overview) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (!overview) return null;

  const nextUpcoming = overview.sessions
    .filter((s) => !s.active)
    .sort((a, b) => a.nextStartMs - b.nextStartMs)[0];

  const stateFor = (s: SessionsOverviewView['sessions'][number]): SessionState => {
    if (s.active) return 'live';
    if (nextUpcoming && s.session === nextUpcoming.session) return 'upcoming';
    return 'closed';
  };

  return (
    <div className="space-y-4">
      <Card elevated>
        <p className="text-sm text-[var(--color-text-muted)]">Current time ({zone})</p>
        <p className="tnum mt-1 text-3xl font-bold">
          {new Intl.DateTimeFormat('en-GB', {
            timeZone: zone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
          }).format(new Date(now))}
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {overview.fxWeekOpen ? 'FX week is open.' : 'FX week is currently closed.'}
          {overview.overlap ? ' Sessions overlap right now.' : ''}
        </p>
        <div className="mt-3">
          <FormField label="Display timezone">
            <Select value={zone} onChange={(e) => setZone(e.target.value)} aria-label="Display timezone">
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </Card>

      <div className="space-y-2">
        {overview.sessions.map((s) => (
          <Card key={s.session} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <SessionBadge
                name={`${s.session} Session`}
                state={stateFor(s)}
                detail={`${fmt(s.sessionStartMs, zone)} – ${fmt(s.sessionEndMs, zone)}`}
              />
              <p className="tnum mt-2 text-[13px] text-[var(--color-text-muted)]">
                Opening range ends {fmt(s.orEndMs, zone)} · {s.orDone ? 'OR window done' : 'OR window open'}
                {' · '}Next open {fmtFull(s.nextStartMs, zone)}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {overview.nextTransition && (
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Next transition</p>
          <p className="mt-1 font-semibold">
            {overview.nextTransition.session} {overview.nextTransition.kind} at{' '}
            <span className="tnum">{fmtFull(overview.nextTransition.atMs, zone)}</span> ({zone})
          </p>
        </Card>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">
        Session windows follow the standard FX week ({overview.calendarPolicy ?? 'standard week'});
        this clock is not a holiday calendar. The opening-range boundary is a time marker only —
        it does not imply candle coverage or confirmation.
      </p>
    </div>
  );
}
