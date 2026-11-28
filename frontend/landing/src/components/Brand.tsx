/**
 * The checked-in TradingBeast brand mark — the same mark the web portal's
 * AppLayout renders (gradient tile + bar glyph + wordmark).
 */
export default function Brand({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-white"
        style={{ background: 'var(--grad-hero)' }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 20V10M10 20V4M16 20v-8M22 20H2"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        className="text-[18px] font-bold tracking-tight"
        style={{ color: onDark ? '#ffffff' : 'var(--color-text)' }}
      >
        Trading<span style={{ color: onDark ? '#7fe3c0' : 'var(--color-accent)' }}>Beast</span>
      </span>
    </span>
  );
}
