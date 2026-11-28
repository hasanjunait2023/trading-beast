import React from 'react';

export interface UnavailableStateProps {
  title?: string;
  /** Why this is unavailable — shown verbatim, never replaced with fake data. */
  reason: string;
  action?: React.ReactNode;
}

export function UnavailableState({
  title = 'Unavailable',
  reason,
  action,
}: UnavailableStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--color-unavailable-text)]">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-base font-bold text-[var(--color-text)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{reason}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
