import { Suspense, lazy, useCallback, useEffect, useState, type ComponentType } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Skeleton } from '@shared/components/Skeleton';
import {
  BookmarkIcon,
  ChevronRightIcon,
  ClockIcon,
  CoinsIcon,
  GearIcon,
  UsersIcon,
} from '@shared/components/icons';
import { adaptSessions, type SessionsOverviewView } from '@shared/radar/adapter';
import { analysisApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { SessionClock } from './SessionClock';
import type { Tab } from '../App';

const Watchlist = lazy(() => import('./Watchlist'));
const Credits = lazy(() => import('./Credits'));
const Referral = lazy(() => import('./Referral'));
const Profile = lazy(() => import('./Profile'));

type MoreView = 'menu' | 'watchlist' | 'clock' | 'credits' | 'referral' | 'profile';

type MoreItem = {
  id: Exclude<MoreView, 'menu'>;
  label: string;
  hint: string;
  icon: ComponentType<{ size?: number }>;
  group: 'Workspace' | 'Account';
};

const ITEMS: MoreItem[] = [
  { id: 'watchlist', label: 'Watchlist', hint: 'Pairs you follow', icon: BookmarkIcon, group: 'Workspace' },
  { id: 'clock', label: 'Session Clock', hint: 'Session windows and overlaps', icon: ClockIcon, group: 'Workspace' },
  { id: 'credits', label: 'Credits', hint: 'Balance, daily grant and scan cost', icon: CoinsIcon, group: 'Workspace' },
  { id: 'referral', label: 'Referrals', hint: 'Invite traders, earn Pro days', icon: UsersIcon, group: 'Account' },
  { id: 'profile', label: 'Profile & Settings', hint: 'Account, theme and sign-out', icon: GearIcon, group: 'Account' },
];

const GROUPS: MoreItem['group'][] = ['Workspace', 'Account'];

function ClockView() {
  const [overview, setOverview] = useState<SessionsOverviewView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analysisApi.getSessions();
      setOverview(adaptSessions(res.data.data as Parameters<typeof adaptSessions>[0]));
      setError('');
    } catch {
      setError('Session clock unavailable right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <SessionClock overview={overview} loading={loading} error={error} onRetry={() => void load()} />;
}

function SubviewFallback() {
  return (
    <div className="space-y-3 px-4" role="status" aria-label="Loading">
      <Skeleton height={90} />
      <Skeleton height={90} />
    </div>
  );
}

/**
 * More tab (reference 03/04 tab bar; study 14). Brand card with the real
 * plan pill plus grouped links to the destinations that are not primary
 * tabs: Watchlist, Session Clock, Credits, Referrals and Profile/Settings
 * — all existing pages, rendered as subviews with an in-page back row.
 * R3b: the menu is composed as the study's mint group panels (Workspace /
 * Account) with icon rows. The study also lists Risk Tools, Economic
 * Calendar, Alerts, Membership and Help rows — the Mini App has no such
 * destinations (they exist only in the web portal), so no dead rows are
 * rendered here.
 */
export default function More({
  goToTab,
  initialView = 'menu',
}: {
  goToTab: (tab: Tab) => void;
  initialView?: MoreView;
}) {
  const { user } = useAuth();
  const [view, setView] = useState<MoreView>(initialView);

  if (view !== 'menu') {
    const title = ITEMS.find((i) => i.id === view)?.label ?? 'More';
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-4">
          <Button variant="ghost" size="sm" onClick={() => setView('menu')} ariaLabel="Back to More">
            ← Back
          </Button>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <Suspense fallback={<SubviewFallback />}>
          {view === 'watchlist' && <Watchlist />}
          {view === 'clock' && (
            <div className="px-4">
              <ClockView />
            </div>
          )}
          {view === 'credits' && <Credits goToTab={(tab) => goToTab(tab)} />}
          {view === 'referral' && <Referral />}
          {view === 'profile' && <Profile />}
        </Suspense>
      </div>
    );
  }

  const planLabel = user?.isTrialActive
    ? 'Pro trial'
    : `${(user?.tier ?? 'FREE').charAt(0)}${(user?.tier ?? 'FREE').slice(1).toLowerCase()} plan`;

  return (
    <div className="space-y-4 px-4">
      <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">More</h1>

      {/* Brand card (study 14): checked-in bars tile + real plan pill. */}
      <div className="flex items-center gap-3.5 rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-4 shadow-[var(--shadow-card-soft)]">
        <Brand variant="tile" size={54} markOnly />
        <div className="min-w-0">
          <p className="truncate text-[20px] font-extrabold tracking-tight">TradingBeast</p>
          <span className="mt-1 inline-flex rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[13px] font-bold text-[var(--color-accent)]">
            {planLabel}
          </span>
          {(user?.firstName || user?.username) && (
            <p className="mt-1 truncate text-[12.5px] text-[var(--color-text-muted)]">
              Signed in as {user?.firstName ?? ''}
              {user?.username ? ` @${user.username}` : ''}
            </p>
          )}
        </div>
      </div>

      <nav aria-label="More destinations" className="space-y-4">
        {GROUPS.map((group) => (
          <section
            key={group}
            aria-label={group}
            className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-3 shadow-[var(--shadow-card-soft)]"
          >
            <h2 className="px-1.5 pb-2.5 text-[19px] font-extrabold tracking-tight">{group}</h2>
            <div className="divide-y divide-[var(--color-border-soft)] rounded-[var(--radius-row)] bg-[var(--color-surface)] px-4 shadow-[var(--shadow-row)]">
              {ITEMS.filter((i) => i.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    aria-label={`${item.label} — ${item.hint}`}
                    className="flex min-h-[56px] w-full items-center gap-3.5 py-3 text-left transition-transform active:scale-[0.99]"
                  >
                    <span aria-hidden="true" className="shrink-0 text-[var(--color-text)]">
                      <Icon size={24} />
                    </span>
                    <span className="min-w-0 flex-1 text-[16.5px] font-semibold">{item.label}</span>
                    <ChevronRightIcon size={20} className="shrink-0 text-[var(--color-text-faint)]" />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <p className="text-center text-[11px] text-[var(--color-text-muted)]">
        Analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
