export interface BrandProps {
  /** Rendered height of the mark in px (wordmark scales with it). */
  size?: number;
  /** 'tile' = gradient rounded square with white bars (favicon geometry);
   *  'plain' = emerald bars only, for light headers (references 03/04). */
  variant?: 'plain' | 'tile';
  /** Hide the wordmark (mark only). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Shared TradingBeast brand (R0). One mark everywhere — the bars geometry
 * from the checked-in favicon.svg; the generated studies' swoosh/zigzag
 * logo variants are NOT used. Wordmark is a single navy colour (no
 * two-tone split).
 */
export function Brand({ size = 34, variant = 'plain', markOnly = false, className = '' }: BrandProps) {
  const gid = variant === 'tile' ? 'tb-brand-tile' : 'tb-brand-plain';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#054333" />
            <stop offset="1" stopColor="#00a870" />
          </linearGradient>
        </defs>
        {variant === 'tile' && <rect width="48" height="48" rx="11" fill={`url(#${gid})`} />}
        <path
          d="M11 37V21M20 37V11M29 37V25M40 37H7"
          stroke={variant === 'tile' ? '#ffffff' : `url(#${gid})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {!markOnly && (
        <span
          className="font-bold tracking-tight text-[var(--color-text)]"
          style={{ fontSize: Math.round(size * 0.62), lineHeight: 1.1 }}
        >
          TradingBeast
        </span>
      )}
    </span>
  );
}
