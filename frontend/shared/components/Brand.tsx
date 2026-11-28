export interface BrandProps {
  /** Rendered height of the mark in px (wordmark scales with it). */
  size?: number;
  /** 'tile' = emerald rounded square with the white mark (app-icon geometry);
   *  'plain' = emerald rings + bright focus dot, for light headers. */
  variant?: 'plain' | 'tile';
  /** Hide the wordmark (mark only). */
  markOnly?: boolean;
  className?: string;
}

/**
 * Session Rings mark geometry — the master files live in
 * frontend/shared/assets/logo/ (mark.svg). Three concentric ring segments
 * (the Asian / London / New York sessions) orbit a solid focus dot: the
 * product's name, Session Focus Radar, as one gesture. The paths below are
 * the master 256-canvas geometry, scaled into this component's 48 viewBox.
 */
const RINGS_PATH =
  'M178.8 107 A55 55 0 1 1 139.9 74.3 L135.1 95.8 A33 33 0 1 0 158.5 115.4 Z ' +
  'M52.1 176.4 A90 90 0 1 1 124.1 217.9 L125 195.9 A68 68 0 1 0 70.6 164.5 Z ' +
  'M100.9 6 A125 125 0 1 1 12.5 80.2 L32.8 88.6 A103 103 0 1 0 105.7 27.4 Z';

function RingsMark({ rings, dot }: { rings: string; dot: string }) {
  return (
    <>
      <path fill={rings} d={RINGS_PATH} />
      <circle cx="128" cy="128" r="17" fill={dot} />
    </>
  );
}

/**
 * Shared TradingBeast brand. One mark everywhere — the Session Rings
 * (docs/brand/BRAND-GUIDELINES.md). Wordmark is a single colour
 * (var(--color-text)); no two-tone split.
 */
export function Brand({ size = 34, variant = 'plain', markOnly = false, className = '' }: BrandProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        {variant === 'tile' ? (
          <>
            <rect width="48" height="48" rx="11" fill="#00664B" />
            {/* Same inset as app-icon.svg: mark at 68% centred on the tile. */}
            <g transform="translate(7.69 7.69) scale(0.1275)">
              <RingsMark rings="#ffffff" dot="#ffffff" />
            </g>
          </>
        ) : (
          <g transform="scale(0.1875)">
            <RingsMark rings="#00664B" dot="#00A870" />
          </g>
        )}
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
