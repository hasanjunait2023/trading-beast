import { Card } from '@shared/components/Card';

/** KPI stat card — value must come from a real API response. */
export function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
      <p className="tnum mt-1 text-2xl font-bold text-[var(--color-text)]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </Card>
  );
}

const TIER_STYLES: Record<string, string> = {
  FREE: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
  PRO: 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]',
  ELITE: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  TRIAL: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
};

export function TierPill({ tier }: { tier: string }) {
  const t = tier.toUpperCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap ${TIER_STYLES[t] ?? TIER_STYLES.FREE}`}>
      {t}
    </span>
  );
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  APPROVED: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  ACTIVE: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  CREDITED: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  REJECTED: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  EXPIRED: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]',
  CANCELLED: 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]',
  TRIAL: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
};

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap ${STATUS_STYLES[s] ?? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'}`}>
      {s}
    </span>
  );
}

export function PageLoading() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tb-skeleton h-24 rounded-[var(--radius-lg)]" />
        ))}
      </div>
      <div className="tb-skeleton h-64 rounded-[var(--radius-lg)]" />
    </div>
  );
}
