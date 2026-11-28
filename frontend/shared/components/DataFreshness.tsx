
export interface DataFreshnessProps {
  /** Epoch milliseconds of the data snapshot. */
  timestamp: number;
  /** Reference "now" (defaults to Date.now()); pass explicitly in tests. */
  now?: number;
  /** Age in ms at/above which the data is labeled stale. Default 15 min. */
  staleAfterMs?: number;
  label?: string;
  className?: string;
}

export function formatRelativeAge(timestamp: number, now: number): string {
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

/** Timestamp + relative age near evidence (handoff §2); stale gets a warning treatment. */
export function DataFreshness({
  timestamp,
  now,
  staleAfterMs = 15 * 60 * 1000,
  label = 'Updated',
  className = '',
}: DataFreshnessProps) {
  const effectiveNow = now ?? Date.now();
  const stale = effectiveNow - timestamp >= staleAfterMs;
  const absolute = new Date(timestamp).toLocaleString();
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        stale ? 'font-semibold text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'
      } ${className}`}
      title={absolute}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          backgroundColor: stale ? 'var(--color-warning)' : 'var(--color-success)',
        }}
      />
      <span>
        {label} {formatRelativeAge(timestamp, effectiveNow)}
        {stale ? ' · stale' : ''}
      </span>
    </span>
  );
}
