
export interface SkeletonProps {
  variant?: 'block' | 'text' | 'circle';
  width?: string | number;
  height?: string | number;
  /** Number of text lines (text variant). */
  lines?: number;
  className?: string;
}

/** Loading placeholder with shimmer; static under prefers-reduced-motion (theme.css). */
export function Skeleton({
  variant = 'block',
  width,
  height,
  lines = 3,
  className = '',
}: SkeletonProps) {
  if (variant === 'text') {
    return (
      <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className="tb-skeleton h-3.5 rounded"
            style={{ width: i === lines - 1 ? '60%' : (width ?? '100%') }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`tb-skeleton ${variant === 'circle' ? 'rounded-full' : 'rounded-[var(--radius-md)]'} ${className}`}
      style={{
        width: width ?? '100%',
        height: height ?? (variant === 'circle' ? 40 : 96),
      }}
    />
  );
}
