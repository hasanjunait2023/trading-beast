import React from 'react';
import type { Bias, MarketStatus } from '../design-tokens';
import { StatusPill } from './StatusPill';
import { BiasText } from './Bias';

export interface PairRowProps {
  pair: string;
  status: MarketStatus;
  /** Directional bias; omit when the result carries none. */
  bias?: Bias;
  /** Score in points (rendered as points/100); omit when unranked. */
  score?: number;
  /** Freshness slot — typically a <DataFreshness /> element. */
  freshness?: React.ReactNode;
  /** Optional sparkline element, only when the caller has real series data. */
  sparkline?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function PairRow({
  pair,
  status,
  bias,
  score,
  freshness,
  sparkline,
  onClick,
  className = '',
}: PairRowProps) {
  const interactive = typeof onClick === 'function';
  const Wrapper = interactive ? 'button' : 'div';
  return (
    <Wrapper
      {...(interactive
        ? { type: 'button' as const, onClick, 'aria-label': `${pair} details` }
        : {})}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[var(--shadow-sm)] transition-colors ${
        interactive ? 'hover:bg-[var(--color-surface-hover)] active:scale-[0.99]' : ''
      } ${className}`}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-[var(--color-text)]">{pair}</span>
          <StatusPill status={status} />
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
          {bias && <BiasText bias={bias} />}
          {freshness}
        </span>
      </span>
      {sparkline}
      {typeof score === 'number' && (
        <span className="tnum shrink-0 text-right">
          <span className="block text-xl leading-none font-bold text-[var(--color-text)]">
            {score}
          </span>
          <span className="text-[11px] text-[var(--color-text-muted)]">/ 100</span>
        </span>
      )}
      {interactive && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-[var(--color-text-muted)]"
        >
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Wrapper>
  );
}
