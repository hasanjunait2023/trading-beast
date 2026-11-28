import { Card } from './Card';
import { ArrowUpDownIcon } from './icons';

/**
 * ADR usage panel (R1, reference 05). The scan payload supplies only the
 * ADR usage percentage (`adrPct`), so the absolute ADR / today's-range
 * rows render an em dash until the backend exposes those values — they are
 * never back-computed or invented. The gauge fill is the usage percentage
 * clamped to the track; the printed value stays exact.
 */
export interface AdrUsageProps {
  /** ADR usage in percent (payload `adrPct`); null hides the gauge. */
  usagePct?: number | null;
  /** Absolute ADR value text (e.g. "92 pips") when a payload supplies it. */
  adrValue?: string | null;
  /** Today's range value text when a payload supplies it. */
  rangeValue?: string | null;
  className?: string;
}

export function AdrUsage({ usagePct, adrValue, rangeValue, className = '' }: AdrUsageProps) {
  const pct = typeof usagePct === 'number' && Number.isFinite(usagePct) ? usagePct : null;
  const rows: { label: string; value: string }[] = [
    { label: 'ADR (20)', value: adrValue ?? '—' },
    { label: "Today's Range", value: rangeValue ?? '—' },
    { label: 'ADR Usage', value: pct !== null ? `${Math.round(pct)}%` : '—' },
  ];
  return (
    <Card className={`p-4 ${className}`} aria-label="ADR usage">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[var(--color-accent)]">
          <ArrowUpDownIcon size={18} />
        </span>
        <h3 className="text-[16px] font-extrabold tracking-tight text-[var(--color-text)]">
          ADR Usage
        </h3>
      </div>
      <dl className="mt-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-2 border-t border-[var(--color-border-soft)] py-2 first:border-t-0 first:pt-0"
          >
            <dt className="text-[13px] text-[var(--color-text-muted)]">{row.label}</dt>
            <dd className="tnum text-[13px] font-bold text-[var(--color-text)]">{row.value}</dd>
          </div>
        ))}
      </dl>
      {pct !== null && (
        <div
          className="mt-1.5 h-3 overflow-hidden rounded-full bg-[var(--color-mint-wash)]"
          role="img"
          aria-label={`ADR usage ${Math.round(pct)} percent`}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, pct))}%`,
              background: 'var(--gradient-primary-action)',
            }}
          />
        </div>
      )}
    </Card>
  );
}
