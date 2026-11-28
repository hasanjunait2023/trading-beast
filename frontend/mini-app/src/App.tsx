import { Suspense, lazy, useState, type FormEvent, type ReactNode } from 'react';
import { BottomNav } from '@shared/components/BottomNav';
import { Button } from '@shared/components/Button';
import { Card } from '@shared/components/Card';
import { Input, FormField } from '@shared/components/FormField';
import { Skeleton } from '@shared/components/Skeleton';
import {
  HomeIcon,
  JournalIcon,
  MarketsIcon,
  MoreIcon,
  PlanIcon,
} from '@shared/components/icons';
import { useAuth } from './hooks/useAuth';
import { haptics } from './telegram';

// Per-tab code splitting keeps the initial (entry) chunk within the
// ≤200 KB budget (handoff §6): only the shell + auth load eagerly; every
// tab page is a lazy chunk.
const Home = lazy(() => import('./pages/Home'));
const Markets = lazy(() => import('./pages/Markets'));
const Plan = lazy(() => import('./pages/Plan'));
const Journal = lazy(() => import('./pages/Journal'));
const More = lazy(() => import('./pages/More'));

// Reference tab bar (studies 03/04): Home / Markets / Plan / Journal /
// More. Watchlist, Session Clock, Credits, Referrals and Profile live
// under More.
export type Tab = 'home' | 'markets' | 'plan' | 'journal' | 'more';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon size={24} /> },
  { id: 'markets', label: 'Markets', icon: <MarketsIcon size={24} /> },
  { id: 'plan', label: 'Plan', icon: <PlanIcon size={24} /> },
  { id: 'journal', label: 'Journal', icon: <JournalIcon size={24} /> },
  { id: 'more', label: 'More', icon: <MoreIcon size={24} /> },
];

function LoadingScreen() {
  return (
    <div className="space-y-3 px-4 pt-6" role="status" aria-label="Connecting to TradingBeast">
      <Skeleton height={28} width="60%" />
      <Skeleton height={120} />
      <Skeleton height={72} />
      <Skeleton height={72} />
    </div>
  );
}

/**
 * Shown when the app is NOT opened from Telegram (no initData) and there is
 * no session: explain how to open it from the bot, and offer the same
 * one-time /login code flow the web portal uses. No fake login is ever
 * performed. (Behavior preserved from the pre-Z1 app; restyled on Z0
 * primitives.)
 */
function FallbackScreen() {
  const { loginWithCode, authError, inTelegram, retryTelegramLogin } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await loginWithCode(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed — check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shownError = error || authError;

  return (
    <div className="space-y-4 px-4 pt-6">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] text-3xl text-white" style={{ background: 'var(--grad-hero)' }} aria-hidden="true">◎</div>
        <h1 className="text-2xl font-bold">TradingBeast</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Session Focus Radar — open this app from the Telegram bot for instant, secure sign-in.
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="text-base font-bold">Open from the bot (recommended)</h2>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--color-text-muted)]">
          <li>Open the TradingBeast bot in Telegram.</li>
          <li>Send /app — or tap the “Open App” menu button in the chat.</li>
          <li>The Mini App opens here, already signed in. No password needed.</li>
        </ol>
        {inTelegram && authError && (
          <>
            <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">{authError}</p>
            <Button className="w-full" onClick={() => void retryTelegramLogin()}>Retry Telegram sign-in</Button>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base font-bold">Browser testing — /login code</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Send <code className="font-mono">/login</code> to the bot in a private chat and paste the one-time code here.
        </p>
        {shownError && !inTelegram && (
          <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">{shownError}</p>
        )}
        {shownError && inTelegram && error && (
          <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger)]">{error}</p>
        )}
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <FormField label="One-time login code" hint={code.trim().length > 0 && code.trim().length !== 64 ? 'The code is 64 characters — paste the full code from the bot.' : undefined}>
            <Input type="password" autoComplete="one-time-code" placeholder="One-time login code" value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
          </FormField>
          <Button type="submit" className="w-full" loading={submitting} disabled={code.trim().length !== 64}>
            Connect with code
          </Button>
        </form>
      </Card>

      <p className="text-center text-[11px] text-[var(--color-text-muted)]">
        Analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  // More hosts Credits as a subview; Home/Markets credit pills deep-link
  // there via this nonce (More mounts fresh when it changes).
  const [moreNonce, setMoreNonce] = useState(0);

  if (isLoading) {
    return <div className="app-shell"><LoadingScreen /></div>;
  }
  if (!user) {
    return <div className="app-shell"><FallbackScreen /></div>;
  }

  const goToTab = (next: Tab) => {
    setTab(next);
    haptics.selection();
  };

  const openCredits = () => {
    setMoreNonce((n) => n + 1);
    goToTab('more');
  };

  return (
    <div className="app-shell">
      <main key={tab} className="tb-page-enter">
        <Suspense fallback={<LoadingScreen />}>
          {tab === 'home' && <Home goToTab={goToTab} onOpenCredits={openCredits} />}
          {tab === 'markets' && <Markets onOpenCredits={openCredits} />}
          {tab === 'plan' && <Plan goToTab={goToTab} />}
          {tab === 'journal' && <Journal goToTab={goToTab} />}
          {tab === 'more' && <More key={moreNonce} goToTab={goToTab} initialView={moreNonce > 0 ? 'credits' : 'menu'} />}
        </Suspense>
      </main>
      <BottomNav
        items={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          active: tab === t.id,
          icon: t.icon,
          onSelect: (id: string) => goToTab(id as Tab),
        }))}
      />
    </div>
  );
}
