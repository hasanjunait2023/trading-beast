import { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

/**
 * Shared polish primitives for the Mini App: skeleton placeholders that
 * mirror each page's real layout while data loads, and a consistent
 * empty state (icon + title + hint). Motion uses transform/opacity only.
 */

export function Skeleton({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Mirrors a Radar PairCard: accent strip, header row, three-stat row. */
export function PairCardSkeleton() {
  return (
    <div className="card-elevated" aria-hidden="true">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-9 h-9" style={{ borderRadius: 10 }} />
          <div className="space-y-1.5">
            <Skeleton className="w-20 h-4" />
            <Skeleton className="w-12 h-3" />
          </div>
        </div>
        <Skeleton className="w-16 h-5" style={{ borderRadius: 9999 }} />
      </div>
      <div className="flex items-center justify-between px-1">
        <Skeleton className="w-10 h-8" />
        <Skeleton className="w-14 h-5" />
        <Skeleton className="w-10 h-5" />
      </div>
      <Skeleton className="w-full h-1.5 mt-4" style={{ borderRadius: 9999 }} />
    </div>
  );
}

export function RadarSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading radar results">
      {Array.from({ length: count }).map((_, i) => (
        <PairCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Mirrors the Watchlist pair rows inside their card. */
export function WatchlistSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card space-y-1" style={{ padding: 8 }} role="status" aria-label="Loading pairs">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3" aria-hidden="true">
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-6 h-6" style={{ borderRadius: 9999 }} />
        </div>
      ))}
    </div>
  );
}

/** Mirrors the Credits balance card + the two stat cards under it. */
export function CreditsSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading credits">
      <div className="card-elevated py-6 flex flex-col items-center" aria-hidden="true">
        <Skeleton className="w-10 h-10 mb-3" style={{ borderRadius: 9999 }} />
        <Skeleton className="w-24 h-10 mb-2" />
        <Skeleton className="w-32 h-4" />
      </div>
      <div className="grid grid-cols-2 gap-3" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="card flex flex-col items-center py-4">
            <Skeleton className="w-6 h-6 mb-2" style={{ borderRadius: 9999 }} />
            <Skeleton className="w-10 h-6 mb-2" />
            <Skeleton className="w-full h-3" />
            <Skeleton className="w-3/4 h-3 mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mirrors rows of the Referral "Recent referrals" list. */
export function ReferralListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card space-y-2" role="status" aria-label="Loading referrals">
      <Skeleton className="w-32 h-5 mb-1" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-2.5 rounded-lg"
          style={{ background: 'var(--color-bg)' }}
          aria-hidden="true"
        >
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-32 h-3" />
          </div>
          <Skeleton className="w-16 h-5" style={{ borderRadius: 9999 }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Polished empty state: gently floating icon in a tinted disc, a title and
 * a short hint. The float loop is transform-only and honours
 * prefers-reduced-motion via the app's MotionConfig.
 */
export function EmptyState({
  Icon,
  title,
  body,
}: {
  Icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      className="card text-center py-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <motion.div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: 'var(--color-surface-elevated)' }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} />
      </motion.div>
      <p className="font-medium">{title}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {body}
      </p>
    </motion.div>
  );
}
