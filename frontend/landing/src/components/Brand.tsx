/**
 * TradingBeast brand lockup for the landing — the Session Rings mark, the
 * same geometry as the shared Brand component and the master files in
 * frontend/shared/assets/logo/ (docs/brand/BRAND-GUIDELINES.md): three
 * concentric ring segments (the Asian / London / New York sessions) orbit
 * one solid focus dot. Wordmark is a single colour — no two-tone split.
 */
const RINGS_PATH =
  'M178.8 107 A55 55 0 1 1 139.9 74.3 L135.1 95.8 A33 33 0 1 0 158.5 115.4 Z ' +
  'M52.1 176.4 A90 90 0 1 1 124.1 217.9 L125 195.9 A68 68 0 1 0 70.6 164.5 Z ' +
  'M100.9 6 A125 125 0 1 1 12.5 80.2 L32.8 88.6 A103 103 0 1 0 105.7 27.4 Z';

export default function Brand({ onDark = false }: { onDark?: boolean }) {
  const rings = onDark ? '#ffffff' : '#00664B';
  const dot = onDark ? '#ffffff' : '#00A870';
  return (
    <span className="flex items-center gap-2">
      <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <g transform="scale(0.1875)">
          <path fill={rings} d={RINGS_PATH} />
          <circle cx="128" cy="128" r="17" fill={dot} />
        </g>
      </svg>
      <span
        className="text-[18px] font-bold tracking-tight"
        style={{ color: onDark ? '#ffffff' : 'var(--color-text)' }}
      >
        TradingBeast
      </span>
    </span>
  );
}
