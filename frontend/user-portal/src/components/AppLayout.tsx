import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar, type NavItem } from '@shared/components/Sidebar';
import { BottomNav } from '@shared/components/BottomNav';
import { Brand } from '@shared/components/Brand';
import { CreditPill } from '@shared/components/CreditPill';
import { SessionBadge } from '@shared/components/SessionBadge';
import {
  BellIcon,
  CardIcon,
  ClockIcon,
  CoinsIcon,
  GearIcon,
  HelpCircleIcon,
  HomeIcon,
  JournalIcon,
  ListIcon,
  MarketsIcon,
  PlanIcon,
  SlidersIcon,
  UsersIcon,
} from '@shared/components/icons';
import { useTheme } from '@shared/theme';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { userApi } from '../services/api';
import { useProfileStore } from '../store/profile';
import {
  readOnboardingSkipped,
  shouldGateToOnboarding,
  shouldShowProfileBanner,
} from '../utils/profileGate';
import { isTelegram } from '../telegram';

/**
 * Responsive shell (handoff §2 + study 28): ≥1024px left sidebar (~224px,
 * white, shared Brand, icon nav with a mint active pill) + sticky top bar;
 * below that a compact top bar + bottom nav with the primary enabled
 * destinations only. Built from the shared Sidebar/BottomNav primitives —
 * composed directly (rather than via AppShell) because the desktop sidebar
 * carries more destinations than the mobile bottom nav, and AppShell drives
 * both from a single list. Inside Telegram the sidebar is hidden (compact
 * chrome). Markets + Pair Detail use the wide layout (study 28/29: ~1600px
 * canvas with room for the 320px contextual rail); on those routes the page
 * renders its own title row with the credits pill, so the header omits its
 * session badge and pill there to avoid a second competing header.
 */

interface Dest {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  match: (pathname: string) => boolean;
  mobile?: boolean;
}

const ICON = 20;

const DESTINATIONS: Dest[] = [
  { id: 'home', label: 'Home', path: '/app', icon: <HomeIcon size={ICON} />, mobile: true, match: (p) => p === '/app' || p === '/dashboard' || p === '/' },
  { id: 'markets', label: 'Markets', path: '/app/markets', icon: <MarketsIcon size={ICON} />, mobile: true, match: (p) => p.startsWith('/app/markets') || p === '/focus' },
  // Plan is sidebar-only: the mobile bottom nav stays at its five slots.
  { id: 'plan', label: 'Plan', path: '/app/plan', icon: <PlanIcon size={ICON} />, match: (p) => p.startsWith('/app/plan') },
  // Journal is sidebar-only: the mobile bottom nav stays at its five slots.
  { id: 'journal', label: 'Journal', path: '/app/journal', icon: <JournalIcon size={ICON} />, match: (p) => p.startsWith('/app/journal') },
  // Alerts is sidebar-only: the mobile bottom nav stays at its five slots.
  { id: 'alerts', label: 'Alerts', path: '/app/alerts', icon: <BellIcon size={ICON} />, match: (p) => p.startsWith('/app/alerts') },
  // Risk Tools is sidebar-only: the mobile bottom nav stays at its five slots.
  { id: 'tools', label: 'Risk Tools', path: '/app/tools', icon: <SlidersIcon size={ICON} />, match: (p) => p.startsWith('/app/tools') },
  { id: 'watchlist', label: 'Watchlist', path: '/app/watchlist', icon: <ListIcon size={ICON} />, mobile: true, match: (p) => p.startsWith('/app/watchlist') || p === '/watchlist' },
  { id: 'sessions', label: 'Sessions', path: '/app/sessions', icon: <ClockIcon size={ICON} />, match: (p) => p.startsWith('/app/sessions') },
  { id: 'credits', label: 'Credits', path: '/app/credits', icon: <CoinsIcon size={ICON} />, mobile: true, match: (p) => p.startsWith('/app/credits') },
  {
    id: 'membership',
    label: 'Membership',
    path: '/app/membership',
    icon: <CardIcon size={ICON} />,
    match: (p) =>
      p.startsWith('/app/membership') ||
      ['/plans', '/subscription', '/payments', '/billing', '/payment/success'].includes(p),
  },
  { id: 'referrals', label: 'Referrals', path: '/app/referrals', icon: <UsersIcon size={ICON} />, match: (p) => p.startsWith('/app/referrals') || p === '/referral' },
  { id: 'settings', label: 'Settings', path: '/app/settings', icon: <GearIcon size={ICON} />, mobile: true, match: (p) => p.startsWith('/app/settings') || p === '/settings' || p.startsWith('/app/setup') },
  { id: 'help', label: 'Help', path: '/app/help', icon: <HelpCircleIcon size={ICON} />, match: (p) => p.startsWith('/app/help') || p === '/help' },
];

/** Routes rendered on the wide study-28/29 canvas with their own title row. */
function isWideRoute(pathname: string): boolean {
  return pathname.startsWith('/app/markets') || pathname === '/focus';
}

export default function AppLayout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const inTelegramHost = isTelegram();
  const { overview } = useSessions();
  const [balance, setBalance] = useState<number | null>(null);
  const wide = isWideRoute(location.pathname);

  // Onboarding profile (Conversion chapter): fetched once per account.
  // The store belongs to the signed-in user only — a stale snapshot from a
  // previous account is ignored via the userId check.
  const profile = useProfileStore((s) => s.profile);
  const profileUserId = useProfileStore((s) => s.userId);
  const profileStatus = useProfileStore((s) => s.status);
  const ensureProfile = useProfileStore((s) => s.ensure);
  useEffect(() => {
    if (user) void ensureProfile(user.id);
  }, [user, ensureProfile]);
  const ownProfile = user && profileUserId === user.id ? profile : null;
  const ownStatus = user && profileUserId === user.id ? profileStatus : 'idle';

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
        icon: d.icon,
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

  // Onboarding gate: a KNOWN-incomplete profile is routed to the wizard
  // once per session (skippable there); an unavailable endpoint never gates.
  if (
    shouldGateToOnboarding({
      status: ownStatus,
      profile: ownProfile,
      skippedThisSession: readOnboardingSkipped(),
      pathname: location.pathname,
    })
  ) {
    return (
      <Navigate to="/app/welcome" replace state={{ from: location.pathname }} />
    );
  }
  const showProfileBanner = shouldShowProfileBanner({
    status: ownStatus,
    profile: ownProfile,
    pathname: location.pathname,
  });

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {!inTelegramHost && (
        <div className="sticky top-0 hidden h-screen lg:flex">
          <Sidebar
            items={sidebarItems}
            brand={<Brand size={34} />}
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
        {showProfileBanner && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[var(--color-mint-wash)] px-4 py-2 text-center text-[13px]"
          >
            <span>
              <strong>Finish setting up your account</strong> — add your email
              and a password so you can sign in anywhere, not just Telegram.
            </span>
            <button
              type="button"
              onClick={() => navigate('/app/welcome')}
              className="font-bold text-[var(--color-accent)] underline underline-offset-4"
            >
              Complete setup
            </button>
          </div>
        )}
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="lg:hidden">
              <Brand size={30} />
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!wide &&
              (activeWindow ? (
                <span className="hidden sm:block">
                  <SessionBadge name={activeWindow.session} state="live" />
                </span>
              ) : overview ? (
                <span className="hidden text-sm text-[var(--color-text-muted)] sm:block">
                  No session live
                </span>
              ) : null)}
            {!wide && balance !== null && (
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
        <main
          className={`mx-auto w-full flex-1 px-4 pt-4 pb-24 sm:px-6 lg:pb-8 ${
            wide ? 'max-w-[1600px] lg:px-8' : 'max-w-6xl'
          }`}
        >
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
