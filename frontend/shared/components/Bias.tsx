import type { Bias } from '../design-tokens';

export type { Bias };

const LABELS: Record<Bias, string> = {
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral',
};

const ARROWS: Record<Bias, string> = {
  bullish: '↑',
  bearish: '↓',
  neutral: '→',
};

const COLORS: Record<Bias, string> = {
  bullish: 'var(--color-bullish)',
  bearish: 'var(--color-bearish)',
  neutral: 'var(--color-neutral-bias)',
};

export interface BiasTextProps {
  bias: Bias;
  showArrow?: boolean;
  className?: string;
}

/** Directional bias as text (never color alone) — separate from rank/status. */
export function BiasText({ bias, showArrow = true, className = '' }: BiasTextProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${className}`}
      style={{ color: COLORS[bias] }}
    >
      {showArrow && <span aria-hidden="true">{ARROWS[bias]}</span>}
      {LABELS[bias]}
    </span>
  );
}

export function biasLabel(bias: Bias): string {
  return LABELS[bias];
}
