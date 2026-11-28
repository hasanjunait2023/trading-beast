import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * Unified offline notice (Z5): a slim, non-blocking banner pinned to the
 * top of the viewport whenever the browser reports offline. Rendered once
 * per app at the root; renders nothing while online. Uses the shared
 * warning tokens so it reads identically in the light and dark themes.
 * Paid actions must still be blocked by their own flows — this banner is
 * the app-level surface, not the guard.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-[var(--color-warning-bg)] px-4 py-2 text-center text-[13px] font-semibold text-[var(--color-warning)] shadow-[var(--shadow-md)]"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        <path
          d="M2 8.5A15 15 0 0 1 22 8.5M5.5 12.5a10.5 10.5 0 0 1 13 0M8.8 16a6 6 0 0 1 6.4 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="19.5" r="1.4" fill="currentColor" />
      </svg>
      <span>You are offline. Changes and paid actions are unavailable until the connection returns.</span>
    </div>
  );
}
