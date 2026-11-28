/**
 * Tiny inline-SVG charts (Z3, local to admin-portal).
 * They only ever render aggregates handed to them by a page — every value
 * traces to a real API response. No time series is drawn unless the API
 * returned one (it does not).
 */

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = [
  'var(--color-accent)',
  'var(--color-info)',
  'var(--color-warning)',
  'var(--color-avoid)',
  'var(--color-danger)',
  'var(--color-text-muted)',
];

/** Horizontal bars scaled to the largest value. */
export function BarList({ data, format }: { data: BarDatum[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-text)]">{d.label}</span>
            <span className="tnum font-semibold text-[var(--color-text)]">
              {format ? format(d.value) : d.value.toLocaleString()}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]"
            role="img"
            aria-label={`${d.label}: ${format ? format(d.value) : d.value}`}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: max > 0 ? `${(d.value / max) * 100}%` : '0%',
                background: d.color ?? PALETTE[i % PALETTE.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Donut of parts of a whole (e.g. tier distribution). Parts must sum to the whole the caller describes. */
export function Donut({ data, size = 160 }: { data: BarDatum[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const frac = total > 0 ? d.value / total : 0;
      const seg = { ...d, frac, dash: frac * c, start: offset, color: d.color ?? PALETTE[i % PALETTE.length] };
      offset += frac * c;
      return seg;
    });
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Distribution chart">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-surface-elevated)" strokeWidth="20" />
        {segments.map((s) => (
          <circle
            key={s.label}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={`${Math.max(s.dash - 2, 0)} ${c - s.dash + 2}`}
            strokeDashoffset={-s.start}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-text)">
          {total.toLocaleString()}
        </text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
          total
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: d.color ?? PALETTE[i % PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="text-[var(--color-text-muted)]">{d.label}</span>
            <span className="tnum font-semibold text-[var(--color-text)]">{d.value.toLocaleString()}</span>
            <span className="tnum text-[var(--color-text-muted)]">
              {total > 0 ? `(${((d.value / total) * 100).toFixed(1)}%)` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
