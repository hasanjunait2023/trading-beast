import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, type NavItem } from '@shared/components/Sidebar';
import { BottomNav } from '@shared/components/BottomNav';
import { CreditPill } from '@shared/components/CreditPill';
import { SessionBadge } from '@shared/components/SessionBadge';
import { useTheme } from '@shared/theme';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { userApi } from '../services/api';
import { isTelegram } from '../telegram';

/**
 * Responsive shell (handoff §2): ≥1024px left sidebar (~224px) + sticky top
 * bar; below that a compact top bar + bottom nav with the primary enabled
 * destinations only. Built from the shared Sidebar/BottomNav primitives —
 * composed directly (rather than via AppShell) because the desktop sidebar
 * carries nine destinations while the mobile bottom nav carries five, and
 * AppShell drives both from a single list. Inside Telegram the sidebar is
 * hidden (compact chrome, as the previous Layout did).
 */

interface Dest {
  id: string;
  label: string;
  path: string;
  match: (pathname: string) => boolean;
  mobile?: boolean;
}

const DESTINATIONS: Dest[] = [
  { id: 'home', label: 'Home', path: '/app', mobile: true, match: (p) => p === '/app' || p === '/dashboard' || p === '/' },
  { id: 'markets', label: 'Markets', path: '/app/markets', mobile: true, match: (p) => p.startsWith('/app/markets') || p === '/focus' },
  { id: 'watchlist', label: 'Watchlist', path: '/app/watchlist', mobile: true, match: (p) => p.startsWith('/app/watchlist') || p === '/watchlist' },
  { id: 'sessions', label: 'Sessions', path: '/app/sessions', match: (p) => p.startsWith('/app/sessions') },
  { id: 'credits', label: 'Credits', path: '/app/credits', mobile: true, match: (p) => p.startsWith('/app/credits') },
  {
    id: 'membership',
    label: 'Membership',
    path: '/app/membership',
    match: (p) =>
      p.startsWith('/app/membership') ||
      ['/plans', '/subscription', '/payments', '/billing', '/payment/success'].includes(p),
  },
  { id: 'referrals', label: 'Referrals', path: '/app/referrals', match: (p) => p.startsWith('/app/referrals') || p === '/referral' },
  { id: 'settings', label: 'Settings', path: '/app/settings', mobile: true, match: (p) => p.startsWith('/app/settings') || p === '/settings' || p.startsWith('/app/setup') },
  { id: 'help', label: 'Help', path: '/app/help', match: (p) => p.startsWith('/app/help') || p === '/help' },
];

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-white"
        style={{ background: 'var(--grad-hero)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[17px] font-bold tracking-tight">
        Trading<span className="text-[var(--color-accent)]">Beast</span>
      </span>
    </span>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const inTelegramHost = isTelegram();
  const { overview } = useSessions();
  const [balance, setBalance] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    try {
      const res = await userApi.credits();
      if (res.data.data) setBalance(res.data.data.balance);
    } catch {
      /* pill stays hidden until a read succeeds */
    }
  }, []);

  // Refresh the header balance on navigation (e.g. after a Radar run or a
  // visit to Credits) — a read-only GET, never a paid call.
  useEffect(() => {
    void loadBalance();
  }, [loadBalance, location.pathname]);

  const toItems = useCallback(
    (dests: Dest[]): NavItem[] =>
      dests.map((d) => ({
        id: d.id,
        label: d.label,
        active: d.match(location.pathname),
        onSelect: () => navigate(d.path),
      })),
    [location.pathname, navigate],
  );

  const sidebarItems = useMemo(() => toItems(DESTINATIONS), [toItems]);
  const mobileItems = useMemo(
    () => toItems(DESTINATIONS.filter((d) => d.mobile)),
    [toItems],
  );

  const activeSession = overview?.active[0];
  const activeWindow = overview?.sessions.find((s) => s.session === activeSession);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {!inTelegramHost && (
        <div className="sticky top-0 hidden h-screen lg:flex">
          <Sidebar
            items={sidebarItems}
            brand={<Brand />}
            footer={
              user ? (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] px-3 py-2">
                  <p className="truncate text-sm font-semibold">
                    {user.firstName || user.username || 'Your account'}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {user.tier} plan · @{user.username ?? user.telegramId}
                  </p>
                </div>
              ) : undefined
            }
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="lg:hidden">
              <Brand />
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {activeWindow ? (
              <span className="hidden sm:block">
                <SessionBadge name={activeWindow.session} state="live" />
              </span>
            ) : overview ? (
              <span className="hidden text-sm text-[var(--color-text-muted)] sm:block">
                No session live
              </span>
            ) : null}
            {balance !== null && (
              <CreditPill credits={balance} onClick={() => navigate('/app/credits')} />
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-24 sm:px-6 lg:pb-8">
          <div key={location.pathname} className="tb-page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav items={mobileItems} />
      </div>
    </div>
  );
}
