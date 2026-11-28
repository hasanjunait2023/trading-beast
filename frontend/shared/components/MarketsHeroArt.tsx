/**
 * Markets hero artwork (R1, reference 04): layered area-chart mountains
 * sweeping up to the right with a run of green candlesticks climbing
 * diagonally. Pure inline SVG, decorative only (aria-hidden), clipped by
 * the hero's radius. This is artwork, NOT a data chart — it carries no
 * prices, axes or values and must never be presented as market data.
 */

interface Candle {
  x: number;
  bodyY: number;
  bodyH: number;
  bright?: boolean;
}

const CANDLES: Candle[] = [
  { x: 218, bodyY: 148, bodyH: 17 },
  { x: 236, bodyY: 140, bodyH: 21 },
  { x: 254, bodyY: 126, bodyH: 15 },
  { x: 272, bodyY: 130, bodyH: 23 },
  { x: 290, bodyY: 114, bodyH: 17, bright: true },
  { x: 308, bodyY: 102, bodyH: 21 },
  { x: 326, bodyY: 108, bodyH: 13 },
  { x: 344, bodyY: 90, bodyH: 21, bright: true },
  { x: 362, bodyY: 82, bodyH: 15 },
  { x: 380, bodyY: 70, bodyH: 21 },
  { x: 398, bodyY: 58, bodyH: 15, bright: true },
  { x: 416, bodyY: 48, bodyH: 19 },
  { x: 434, bodyY: 36, bodyH: 15 },
  { x: 452, bodyY: 27, bodyH: 17, bright: true },
];

/** Absolutely-positioned artwork layer for the Markets hero (parent must be
 *  relative + overflow-hidden). */
export function MarketsHeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {/* Layered area mountains, back to front. */}
      <path
        d="M150 200 L250 108 L320 138 L392 62 L480 96 V200 Z"
        fill="#ffffff"
        opacity="0.07"
      />
      <path
        d="M120 200 L238 128 L318 154 L404 84 L480 122 V200 Z"
        fill="#043d2d"
        opacity="0.35"
      />
      <path
        d="M170 200 L286 152 L356 172 L436 116 L480 140 V200 Z"
        fill="var(--color-hero-silhouette)"
        opacity="0.75"
      />
      {/* Candlesticks climbing over the mountains. */}
      <g strokeLinecap="round">
        {CANDLES.map((c) => {
          const color = c.bright ? '#43e39a' : '#22c07d';
          const cx = c.x + 3.5;
          return (
            <g key={c.x} opacity={c.bright ? 1 : 0.88}>
              <line
                x1={cx}
                y1={c.bodyY - 7}
                x2={cx}
                y2={c.bodyY + c.bodyH + 7}
                stroke={color}
                strokeWidth="1.8"
              />
              <rect x={c.x} y={c.bodyY} width="7" height={c.bodyH} rx="1.4" fill={color} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
