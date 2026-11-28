import type { Bias, MarketStatus } from '../design-tokens';
import { BookmarkIcon, TrendingUpIcon } from './icons';

/**
 * Pair hero (R1, reference 05): green gradient panel with the pair code,
 * full name and scan price on the left, and — separated by a translucent
 * divider — the status, score (/100) and a white bias pill on the right.
 * Only real payload values render: when the scan carries no price, the
 * price row is omitted (never estimated), and no % change is ever shown
 * (the payload defines no reference close for one).
 */

function HeroWaves() {
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g fill="none" stroke="#ffffff" strokeWidth="1.6">
        <path d="M-10 150 C 90 118, 170 178, 270 142 S 430 108, 500 138" opacity="0.10" />
        <path d="M-10 168 C 100 138, 190 194, 290 158 S 440 128, 500 156" opacity="0.07" />
        <path d="M-10 132 C 80 104, 180 158, 280 124 S 420 92, 500 118" opacity="0.05" />
      </g>
    </svg>
  );
}

const BIAS_TEXT: Record<Bias, string> = {
  bullish: 'Bullish Bias',
  bearish: 'Bearish Bias',
  neutral: 'Neutral Bias',
};

export interface PairHeroProps {
  /** Pair code, e.g. "EUR/USD". */
  pair: string;
  /** Full instrument name, e.g. "Euro / US Dollar" (optional). */
  name?: string;
  status: MarketStatus;
  /** Score in points out of 100. */
  score: number;
  bias: Bias;
  /** Scan-time price (latest 15m close); null omits the price row. */
  price?: number | null;
  /** Decimal places for the price, from the instrument catalog. */
  priceDecimals?: number;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  className?: string;
}

export function PairHero({
  pair,
  name,
  status,
  score,
  bias,
  price,
  priceDecimals = 5,
  inWatchlist,
  onToggleWatchlist,
  className = '',
}: PairHeroProps) {
  return (
    <section
      aria-label={`${pair} summary`}
      className={`relative overflow-hidden rounded-[var(--radius-hero)] text-white shadow-[var(--shadow-hero)] ${className}`}
      style={{ background: 'var(--gradient-session-hero)' }}
    >
      <HeroWaves />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(3,40,28,0.45) 0%, rgba(3,40,28,0.10) 55%, rgba(3,40,28,0) 80%)',
        }}
      />
      {onToggleWatchlist && (
        <button
          type="button"
          onClick={onToggleWatchlist}
          aria-pressed={!!inWatchlist}
          aria-label={inWatchlist ? `Remove ${pair} from watchlist` : `Add ${pair} to watchlist`}
          className="absolute top-3.5 right-3.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
          <BookmarkIcon size={19} filled={!!inWatchlist} />
        </button>
      )}
      <div className="relative flex items-stretch gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="h-10 w-[5px] shrink-0 rounded-full bg-[var(--color-hero-highlight)]" />
            <h1 className="truncate text-[32px] leading-none font-extrabold tracking-tight">{pair}</h1>
          </div>
          {name && <p className="mt-2 text-[15px] text-white/75">{name}</p>}
          {typeof price === 'number' && (
            <p className="tnum mt-3 text-[28px] leading-none font-extrabold">
              {price.toFixed(priceDecimals)}
            </p>
          )}
        </div>
        <div aria-hidden="true" className="w-px shrink-0 bg-white/25" />
        <div className="flex shrink-0 flex-col items-start justify-center">
          <p className="text-[13px] font-bold tracking-[0.14em] text-white/85 uppercase">
            {status}
          </p>
          <p className="tnum mt-1 text-[36px] leading-none font-extrabold">
            {score}
            <span className="ml-0.5 text-[17px] font-bold text-white/70">/100</span>
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-[var(--color-hero-900)]">
            {bias !== 'neutral' && (
              <TrendingUpIcon
                size={16}
                className={bias === 'bearish' ? '-scale-y-100 text-[var(--color-bearish)]' : 'text-[var(--color-accent)]'}
              />
            )}
            {BIAS_TEXT[bias]}
          </span>
        </div>
      </div>
    </section>
  );
}
