
export interface CreditPillProps {
  credits: number;
  onClick?: () => void;
  className?: string;
}

export function CreditPill({ credits, onClick, className = '' }: CreditPillProps) {
  const content = (
    <>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" stroke="currentColor" strokeWidth="2" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="tnum">{credits}</span>
      <span>credits</span>
    </>
  );
  const classes = `inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] px-2.5 text-[13px] font-semibold text-[var(--color-text)] ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={`${credits} credits`} className={classes}>
        {content}
      </button>
    );
  }
  return (
    <span className={classes} aria-label={`${credits} credits`}>
      {content}
    </span>
  );
}
