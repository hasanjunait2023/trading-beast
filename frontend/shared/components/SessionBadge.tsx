
export type SessionState = 'live' | 'upcoming' | 'closed';

const STATE_LABELS: Record<SessionState, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  closed: 'Closed',
};

const STATE_COLORS: Record<SessionState, string> = {
  live: 'var(--color-session-live)',
  upcoming: 'var(--color-session-upcoming)',
  closed: 'var(--color-session-closed)',
};

export interface SessionBadgeProps {
  name: string;
  state: SessionState;
  /** Optional extra text, e.g. the session window "08:00 – 16:00 GMT". */
  detail?: string;
  className?: string;
}

export function SessionBadge({ name, state, detail, className = '' }: SessionBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: STATE_COLORS[state] }}
      />
      <span className="font-semibold text-[var(--color-text)]">{name}</span>
      <span className="font-medium" style={{ color: STATE_COLORS[state] }}>
        {STATE_LABELS[state]}
      </span>
      {detail && <span className="tnum text-[var(--color-text-muted)]">{detail}</span>}
    </span>
  );
}
