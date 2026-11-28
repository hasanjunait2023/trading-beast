import React from 'react';
import { Card } from './Card';

export type ChartState = 'unavailable' | 'no-data' | 'ready';

export interface ChartPanelProps {
  state: ChartState;
  /** Message for the unavailable state, e.g. why candles cannot be shown. */
  unavailableReason?: string;
  /** Validated external chart destination (handoff §5), e.g. TradingView. */
  externalLink?: { href: string; label: string };
  title?: string;
  /** Chart content, rendered only in the 'ready' state (real data only). */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Chart container with honest states. It NEVER draws placeholder candles:
 * until a candle API + display rights exist it shows the unavailable /
 * no-data state and an optional external chart link.
 */
export function ChartPanel({
  state,
  unavailableReason,
  externalLink,
  title = 'Chart',
  children,
  className = '',
}: ChartPanelProps) {
  return (
    <Card className={className} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
        {externalLink && (
          <a
            href={externalLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[36px] items-center gap-1 rounded-[var(--radius-sm)] px-2 text-sm font-semibold text-[var(--color-link)] hover:underline"
          >
            {externalLink.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 17L17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>
      {state === 'ready' ? (
        children
      ) : (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-4 py-6 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-[var(--color-text-muted)]">
            <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {state === 'unavailable' ? 'Chart unavailable' : 'No chart data yet'}
          </p>
          <p className="max-w-sm text-[13px] text-[var(--color-text-muted)]">
            {state === 'unavailable'
              ? (unavailableReason ??
                'Candles are not available for this instrument yet.')
              : 'Run a scan first — chart data appears when a result is available.'}
          </p>
        </div>
      )}
    </Card>
  );
}
