import type { MarketStatus } from '../design-tokens';

export type { MarketStatus };

const LABELS: Record<MarketStatus, string> = {
  focus: 'FOCUS',
  watch: 'WATCH',
  avoid: 'AVOID',
  unavailable: 'UNAVAILABLE',
};

const STYLES: Record<MarketStatus, string> = {
  focus: 'bg-[var(--color-focus-bg)] text-[var(--color-focus-text)]',
  watch: 'bg-[var(--color-watch-bg)] text-[var(--color-watch-text)]',
  avoid: 'bg-[var(--color-avoid-bg)] text-[var(--color-avoid-text)]',
  unavailable: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
};

export interface StatusPillProps {
  status: MarketStatus;
  /** Override label text; defaults to the status name. Status is never color-alone. */
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className = '' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap ${STYLES[status]} ${className}`}
    >
      {label ?? LABELS[status]}
    </span>
  );
}
