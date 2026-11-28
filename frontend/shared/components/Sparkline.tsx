export interface SparklineProps {
  /** Real price series (e.g. hourly closes). Renders nothing for <2 points. */
  values?: number[] | null;
  width?: number;
  height?: number;
  tone?: 'positive' | 'negative' | 'neutral';
  /** Accessible description of what the series shows. */
  label: string;
  className?: string;
}

const TONE_STROKE = {
  positive: 'var(--color-success)',
  negative: 'var(--color-bearish)',
  neutral: 'var(--color-text-muted)',
} as const;

/**
 * Sparkline (R0, reference 03). Pure SVG polyline + soft area fill,
 * normalized from the supplied series ONLY. No random, hashed or
 * score-derived paths: without ≥2 real values it renders nothing and the
 * caller's layout slot collapses.
 */
export function Sparkline({ values, width = 96, height = 36, tone = 'positive', label, className = '' }: SparklineProps) {
  if (!values || values.length < 2 || !values.every(Number.isFinite)) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * iw;
    const y = pad + (1 - (v - min) / span) * ih;
    return [Number(x.toFixed(2)), Number(y.toFixed(2))] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  const stroke = TONE_STROKE[tone];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={`shrink-0 ${className}`}
    >
      <polygon points={area} fill={stroke} opacity="0.14" stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
