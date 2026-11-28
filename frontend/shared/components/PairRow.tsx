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
  /** Leading visual slot (reference rows: <PairFlags />). */
  leading?: React.ReactNode;
  /** Full instrument name (markets variant), e.g. "Euro / US Dollar". */
  name?: string;
  /** Markets variant: catalog pair with no scan result yet — renders the
   *  grey "Unranked" pill instead of a score (never "Unavailable": the pair
   *  simply was not in the last scan). */
  unranked?: boolean;
  /** 'home' = reference 03 shortlist row (flags, divider, solid Focus pill,
   *  large score without /100, arrow). 'markets' = reference 04 row (flags,
   *  code + full name, right column score over a pale status pill, chevron).
   *  Default keeps the Z1 row. */
  variant?: 'default' | 'home' | 'markets';
  onClick?: () => void;
  className?: string;
}

/** Reference-03 status pill: Focus solid green, others pale semantic fills. */
const HOME_PILL: Record<MarketStatus, string> = {
  focus: 'text-white',
  watch: 'bg-[var(--color-mint-wash)] text-[var(--color-accent)]',
  avoid: 'bg-[var(--color-avoid-bg)] text-[var(--color-avoid-text)]',
  unavailable: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
};

function HomeRow({
  pair,
  status,
  score,
  freshness,
  sparkline,
  leading,
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
      className={`flex w-full items-center gap-3 rounded-[var(--radius-row)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[var(--shadow-row)] ${
        interactive ? 'transition-transform hover:bg-[var(--color-surface-hover)] active:scale-[0.99]' : ''
      } ${className}`}
    >
      {leading}
      {leading && <span aria-hidden="true" className="h-11 w-px shrink-0 bg-[var(--color-border-soft)]" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[19px] leading-tight font-extrabold tracking-tight text-[var(--color-text)]">
          {pair}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${HOME_PILL[status]}`}
            style={status === 'focus' ? { background: 'var(--gradient-primary-action)' } : undefined}
          >
            {status.toUpperCase()}
          </span>
          {typeof score === 'number' && (
            <span className="tnum text-[26px] leading-none font-extrabold text-[var(--color-accent)]">{score}</span>
          )}
          {freshness}
        </span>
      </span>
      {sparkline}
      {interactive && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-faint)]">
          <path d="M4 12h15m-6-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Wrapper>
  );
}

/** Reference-04 status pill: pale semantic fills (Focus/Watch mint in the
 *  study; Avoid keeps its burgundy semantics, Unavailable grey). */
const MARKETS_PILL: Record<MarketStatus, string> = {
  focus: 'bg-[var(--color-mint-wash)] text-[var(--color-accent)]',
  watch: 'bg-[var(--color-mint-wash)] text-[var(--color-accent)]',
  avoid: 'bg-[var(--color-avoid-bg)] text-[var(--color-avoid-text)]',
  unavailable: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
};

function MarketsRow({
  pair,
  name,
  status,
  score,
  freshness,
  leading,
  unranked,
  onClick,
  className = '',
}: PairRowProps) {
  const interactive = typeof onClick === 'function';
  const Wrapper = interactive ? 'button' : 'div';
  const greyPill = unranked ? 'Unranked' : status === 'unavailable' ? 'Unavailable' : null;
  return (
    <Wrapper
      {...(interactive
        ? { type: 'button' as const, onClick, 'aria-label': `${pair} details` }
        : {})}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-row)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3.5 text-left shadow-[var(--shadow-row)] ${
        interactive ? 'transition-transform hover:bg-[var(--color-surface-hover)] active:scale-[0.99]' : ''
      } ${className}`}
    >
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[21px] leading-tight font-extrabold tracking-tight text-[var(--color-text)]">
          {pair}
        </span>
        {name && (
          <span className="mt-0.5 block truncate text-sm text-[var(--color-text-muted)]">{name}</span>
        )}
        {freshness}
      </span>
      <span className="flex shrink-0 flex-col items-end">
        {greyPill ? (
          <span className="inline-flex items-center rounded-full bg-[var(--color-unavailable-bg)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--color-unavailable-text)]">
            {greyPill}
          </span>
        ) : (
          <>
            {typeof score === 'number' && (
              <span className="tnum text-[30px] leading-none font-extrabold text-[var(--color-accent)]">
                {score}
              </span>
            )}
            <span
              className={`mt-1.5 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold tracking-wider ${MARKETS_PILL[status]}`}
            >
              {status.toUpperCase()}
            </span>
          </>
        )}
      </span>
      {interactive && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-faint)]">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </Wrapper>
  );
}

export function PairRow(props: PairRowProps) {
  if (props.variant === 'home') return <HomeRow {...props} />;
  if (props.variant === 'markets') return <MarketsRow {...props} />;
  const { pair, status, bias, score, freshness, sparkline, leading, onClick, className = '' } = props;
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
      {leading}
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
