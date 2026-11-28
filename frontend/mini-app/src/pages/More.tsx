import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Brand } from '@shared/components/Brand';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { Skeleton } from '@shared/components/Skeleton';
import { ChevronRightIcon } from '@shared/components/icons';
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

const ITEMS: { id: Exclude<MoreView, 'menu'>; label: string; hint: string }[] = [
  { id: 'watchlist', label: 'Watchlist', hint: 'Pairs you follow' },
  { id: 'clock', label: 'Session Clock', hint: 'Session windows and overlaps' },
  { id: 'credits', label: 'Credits', hint: 'Balance, daily grant and scan cost' },
  { id: 'referral', label: 'Referrals', hint: 'Invite traders, earn Pro days' },
  { id: 'profile', label: 'Profile & Settings', hint: 'Account, theme and sign-out' },
];

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
 * More tab (reference 03/04 tab bar; study 14). Account header plus grouped
 * links to the destinations that are not primary tabs: Watchlist, Session
 * Clock, Credits, Referrals and Profile/Settings — all existing pages,
 * rendered as subviews with an in-page back row.
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

  return (
    <div className="space-y-4 px-4">
      <Brand size={32} />
      <Card className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold text-white"
          style={{ background: 'var(--gradient-primary-action)' }}
        >
          {(user?.firstName ?? user?.username ?? 'T').slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold">
            {user?.firstName ?? user?.username ?? 'TradingBeast account'}
          </p>
          <p className="text-[13px] text-[var(--color-text-muted)]">
            {user?.tier ?? 'FREE'} tier{user?.isTrialActive ? ' · Pro trial active' : ''}
          </p>
        </div>
      </Card>

      <nav aria-label="More destinations" className="space-y-2.5">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className="flex min-h-[60px] w-full items-center gap-3 rounded-[var(--radius-row)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3 text-left shadow-[var(--shadow-row)] transition-transform active:scale-[0.99]"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold">{item.label}</span>
              <span className="block text-[13px] text-[var(--color-text-muted)]">{item.hint}</span>
            </span>
            <ChevronRightIcon size={20} className="shrink-0 text-[var(--color-text-faint)]" />
          </button>
        ))}
      </nav>

      <p className="text-center text-[11px] text-[var(--color-text-muted)]">
        Analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}
