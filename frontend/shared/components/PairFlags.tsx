import { useId } from 'react';

/**
 * Circular currency-flag pairs (R0, references 03/04/28). Repo-native
 * inline SVG — no external flag CDN or raster images. FX pairs render two
 * overlapping circles (base in front-left, quote behind-right) with a white
 * ring and soft shadow; assets (Gold/Silver/Oil/Bitcoin) render a single
 * medallion; anything unknown falls back to an initials medallion.
 */

export type { FlagCode } from '../radar/flags';
export { parsePairCurrencies, flagForCurrency } from '../radar/flags';
import { parsePairCurrencies, flagForCurrency, type FlagCode } from '../radar/flags';

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function FlagArt({ code }: { code: FlagCode }) {
  switch (code) {
    case 'EU':
      return (
        <>
          <rect width="48" height="48" fill="#003399" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
            return (
              <polygon
                key={i}
                points={starPoints(24 + 13.5 * Math.cos(a), 24 + 13.5 * Math.sin(a), 3.4)}
                fill="#FFCC00"
              />
            );
          })}
        </>
      );
    case 'US':
      return (
        <>
          <rect width="48" height="48" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(48 / 13) * i} width="48" height={48 / 13} fill="#B22234" />
          ))}
          <rect width="26" height={(48 / 13) * 7} fill="#3C3B6E" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle key={`${r}-${c}`} cx={3.4 + c * 5} cy={3.4 + r * 6} r={1.15} fill="#fff" />
            )),
          )}
        </>
      );
    case 'GB':
      return (
        <>
          <rect width="48" height="48" fill="#012169" />
          <path d="M0 0 48 48M48 0 0 48" stroke="#fff" strokeWidth="9" />
          <path d="M0 0 48 48M48 0 0 48" stroke="#C8102E" strokeWidth="3" />
          <path d="M24 0v48M0 24h48" stroke="#fff" strokeWidth="15" />
          <path d="M24 0v48M0 24h48" stroke="#C8102E" strokeWidth="9" />
        </>
      );
    case 'JP':
      return (
        <>
          <rect width="48" height="48" fill="#fff" />
          <circle cx="24" cy="24" r="9.5" fill="#BC002D" />
        </>
      );
    case 'CH':
      return (
        <>
          <rect width="48" height="48" fill="#DA291C" />
          <path d="M20 13h8v7h7v8h-7v7h-8v-7h-7v-8h7z" fill="#fff" />
        </>
      );
    case 'AU':
      return (
        <>
          <rect width="48" height="48" fill="#00247D" />
          <path d="M0 0h24v24H0z" fill="#012169" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#C8102E" strokeWidth="1.8" />
          <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="8" />
          <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="5" />
          <polygon points={starPoints(12, 34, 4.6)} fill="#fff" />
          <polygon points={starPoints(36, 10, 3.4)} fill="#fff" />
          <polygon points={starPoints(40, 24, 3.4)} fill="#fff" />
          <polygon points={starPoints(33, 32, 3.4)} fill="#fff" />
          <polygon points={starPoints(37, 40, 2.8)} fill="#fff" />
        </>
      );
    case 'NZ':
      return (
        <>
          <rect width="48" height="48" fill="#00247D" />
          <path d="M0 0h24v24H0z" fill="#012169" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#fff" strokeWidth="5" />
          <path d="M0 0 24 24M24 0 0 24" stroke="#C8102E" strokeWidth="1.8" />
          <path d="M12 0v24M0 12h24" stroke="#fff" strokeWidth="8" />
          <path d="M12 0v24M0 12h24" stroke="#C8102E" strokeWidth="5" />
          {[
            [36, 8],
            [40, 18],
            [34, 27],
            [38, 38],
          ].map(([cx, cy], i) => (
            <polygon key={i} points={starPoints(cx, cy, 3.6)} fill="#CC142B" stroke="#fff" strokeWidth="0.7" />
          ))}
        </>
      );
    case 'CA':
      return (
        <>
          <rect width="48" height="48" fill="#fff" />
          <rect width="12" height="48" fill="#FF0000" />
          <rect x="36" width="12" height="48" fill="#FF0000" />
          <path
            d="M24 10l2.2 4.2 3.4-1.6-1 4 4-2.4-2 4.4 4.6.6-3.4 3 1.6 2.8h-4l.8 4.4-3.2-2.6-3.2 2.6.8-4.4h-4l1.6-2.8-3.4-3 4.6-.6-2-4.4 4 2.4-1-4 3.4 1.6z"
            fill="#FF0000"
          />
        </>
      );
  }
}

function FlagCircle({ code, size, className = '', style }: { code: FlagCode; size: number; className?: string; style?: React.CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clipId = `tb-flag-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={`shrink-0 rounded-full shadow-[0_2px_8px_rgba(16,55,40,0.18)] ring-2 ring-white ${className}`}
      style={style}
    >
      <clipPath id={clipId}>
        <circle cx="24" cy="24" r="24" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <FlagArt code={code} />
      </g>
      <circle cx="24" cy="24" r="23.4" fill="none" stroke="rgba(16,29,44,0.08)" strokeWidth="1.2" />
    </svg>
  );
}

type AssetKind = 'gold' | 'silver' | 'oil' | 'bitcoin';

function assetKindFor(name: string): AssetKind | null {
  const n = name.toLowerCase();
  if (n.includes('gold') || n.includes('xau')) return 'gold';
  if (n.includes('silver') || n.includes('xag')) return 'silver';
  if (n.includes('oil') || n.includes('wti') || n.includes('brent')) return 'oil';
  if (n.includes('bitcoin') || n.includes('btc')) return 'bitcoin';
  return null;
}

function AssetMedallion({ kind, size }: { kind: AssetKind; size: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `tb-asset-${uid}`;
  const palette: Record<AssetKind, [string, string]> = {
    gold: ['#f6c453', '#d9930d'],
    silver: ['#e8edf2', '#9aa8b5'],
    oil: ['#3a4450', '#141a21'],
    bitcoin: ['#f7931a', '#e2761b'],
  };
  const [from, to] = palette[kind];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="shrink-0 rounded-full shadow-[0_2px_8px_rgba(16,55,40,0.18)] ring-2 ring-white"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill={`url(#${gid})`} />
      {kind === 'gold' && (
        <g fill="#fff8e1" stroke="#b97e0a" strokeWidth="1">
          <path d="M10 30h12l-2.4-6H12.4z" />
          <path d="M26 30h12l-2.4-6h-7.2z" />
          <path d="M18 22h12l-2.4-6h-7.2z" />
        </g>
      )}
      {kind === 'silver' && (
        <g fill="#ffffff" stroke="#7d8ea0" strokeWidth="1">
          <path d="M10 30h12l-2.4-6H12.4z" />
          <path d="M26 30h12l-2.4-6h-7.2z" />
          <path d="M18 22h12l-2.4-6h-7.2z" />
        </g>
      )}
      {kind === 'oil' && (
        <g fill="none" stroke="#f2f5f7" strokeWidth="2.4">
          <path d="M24 9c4.5 5.6 7 9.7 7 13a7 7 0 1 1-14 0c0-3.3 2.5-7.4 7-13z" />
        </g>
      )}
      {kind === 'bitcoin' && (
        <text x="24" y="33" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff" fontFamily="inherit">
          ₿
        </text>
      )}
    </svg>
  );
}

function InitialsMedallion({ label, size }: { label: string; size: number }) {
  const initials = label.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] font-bold text-[var(--color-accent)] ring-2 ring-white shadow-[0_2px_8px_rgba(16,55,40,0.15)]"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  );
}

export interface FlagTileProps {
  pair: string;
  base?: string | null;
  quote?: string | null;
  kind?: 'fx' | 'asset';
  /** Display name used for asset detection / fallback initials. */
  name?: string;
  /** Tile edge length in px (references 09/11 use ~52). */
  size?: number;
  className?: string;
}

/**
 * Rounded-square flag tile (references 09/11): the base currency's flag
 * fills the tile for FX pairs; assets get their medallion palette as a
 * tile with the asset glyph; unknown symbols fall back to initials. Used
 * by the Session Plan shortlist and Journal trade rows, where the studies
 * show a single-flag tile rather than the overlapping pair.
 */
export function FlagTile({ pair, base, quote, kind, name, size = 52, className = '' }: FlagTileProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const label = name ?? pair;
  const radius = Math.round(size * 0.26);
  const asset = kind === 'asset' || !pair.includes('/') ? (assetKindFor(label) ?? assetKindFor(pair)) : null;
  if (asset) {
    const palette: Record<AssetKind, [string, string]> = {
      gold: ['#f6c453', '#d9930d'],
      silver: ['#e8edf2', '#9aa8b5'],
      oil: ['#3a4450', '#141a21'],
      bitcoin: ['#f7931a', '#e2761b'],
    };
    const [from, to] = palette[asset];
    return (
      <span
        role="img"
        aria-label={label}
        className={`inline-flex shrink-0 items-center justify-center shadow-[0_2px_8px_rgba(16,55,40,0.15)] ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: `linear-gradient(135deg, ${from}, ${to})`,
        }}
      >
        {asset === 'bitcoin' ? (
          <span className="font-extrabold text-white" style={{ fontSize: Math.round(size * 0.5) }}>₿</span>
        ) : asset === 'oil' ? (
          <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="#f2f5f7" strokeWidth="2" aria-hidden="true">
            <path d="M12 3c3.5 4.4 5.5 7.6 5.5 10.2a5.5 5.5 0 1 1-11 0C6.5 10.6 8.5 7.4 12 3z" />
          </svg>
        ) : (
          <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" aria-hidden="true">
            <g fill="#fff8e1" stroke={asset === 'gold' ? '#b97e0a' : '#7d8ea0'} strokeWidth="1">
              <path d="M10 30h12l-2.4-6H12.4z" />
              <path d="M26 30h12l-2.4-6h-7.2z" />
              <path d="M18 22h12l-2.4-6h-7.2z" />
            </g>
          </svg>
        )}
      </span>
    );
  }
  const currencies = parsePairCurrencies(pair, base, quote);
  const baseFlag = currencies ? flagForCurrency(currencies[0]) : null;
  if (!baseFlag) {
    return (
      <span
        role="img"
        aria-label={label}
        className={`inline-flex shrink-0 items-center justify-center bg-[var(--color-mint-wash)] font-bold text-[var(--color-accent)] shadow-[0_2px_8px_rgba(16,55,40,0.12)] ${className}`}
        style={{ width: size, height: size, borderRadius: radius, fontSize: Math.round(size * 0.34) }}
      >
        {label.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?'}
      </span>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      className={`shrink-0 shadow-[0_2px_8px_rgba(16,55,40,0.15)] ${className}`}
      style={{ borderRadius: radius }}
    >
      <clipPath id={`tb-tile-${uid}`}>
        <rect width="48" height="48" rx="12" />
      </clipPath>
      <g clipPath={`url(#tb-tile-${uid})`}>
        <FlagArt code={baseFlag} />
      </g>
      <rect width="47" height="47" x="0.5" y="0.5" rx="12" fill="none" stroke="rgba(16,29,44,0.08)" strokeWidth="1" />
    </svg>
  );
}

export interface PairFlagsProps {
  pair: string;
  base?: string | null;
  quote?: string | null;
  kind?: 'fx' | 'asset';
  /** Display name used for asset detection / fallback initials. */
  name?: string;
  /** Diameter of one circle in px (reference rows use 44). */
  size?: number;
  className?: string;
}

/**
 * Overlapping flag pair for FX, single medallion for assets. Falls back to
 * an initials medallion when a currency has no flag art — never renders a
 * wrong flag.
 */
export function PairFlags({ pair, base, quote, kind, name, size = 44, className = '' }: PairFlagsProps) {
  const label = name ?? pair;
  if (kind === 'asset' || !pair.includes('/')) {
    const asset = assetKindFor(label) ?? assetKindFor(pair);
    return (
      <span className={`inline-flex ${className}`} role="img" aria-label={label}>
        {asset ? <AssetMedallion kind={asset} size={size} /> : <InitialsMedallion label={label} size={size} />}
      </span>
    );
  }
  const currencies = parsePairCurrencies(pair, base, quote);
  const baseFlag = currencies ? flagForCurrency(currencies[0]) : null;
  const quoteFlag = currencies ? flagForCurrency(currencies[1]) : null;
  if (!baseFlag || !quoteFlag) {
    return (
      <span className={`inline-flex ${className}`} role="img" aria-label={label}>
        <InitialsMedallion label={label} size={size} />
      </span>
    );
  }
  const overlap = Math.round(size * 0.38);
  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size * 2 - overlap, height: size }}
      role="img"
      aria-label={label}
    >
      <FlagCircle code={baseFlag} size={size} className="relative z-10" />
      <FlagCircle code={quoteFlag} size={size} className="absolute top-0" style={{ left: size - overlap }} />
    </span>
  );
}
