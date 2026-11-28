import { Suspense, lazy, useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
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
import { profileApi, type UserProfile } from './services/api';
import {
  onboardingGate,
  persistOnboardingSkipped,
  profileReminderVisible,
  readOnboardingSkipped,
  type ProfileLoadState,
} from './onboarding/gate';
import { haptics } from './telegram';

// Per-tab code splitting keeps the initial (entry) chunk within the
// ≤200 KB budget (handoff §6): only the shell + auth load eagerly; every
// tab page is a lazy chunk.
const Home = lazy(() => import('./pages/Home'));
const Markets = lazy(() => import('./pages/Markets'));
const Plan = lazy(() => import('./pages/Plan'));
const Journal = lazy(() => import('./pages/Journal'));
const More = lazy(() => import('./pages/More'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

// Reference tab bar (studies 03/04): Home / Markets / Plan / Journal /
// More. Watchlist, Session Clock, Credits, Referrals and Profile live
// under More.
export type Tab = 'home' | 'markets' | 'plan' | 'journal' | 'more';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <HomeIcon size={20} /> },
  { id: 'markets', label: 'Markets', icon: <MarketsIcon size={20} /> },
  { id: 'plan', label: 'Plan', icon: <PlanIcon size={20} /> },
  { id: 'journal', label: 'Journal', icon: <JournalIcon size={20} /> },
  { id: 'more', label: 'More', icon: <MoreIcon size={20} /> },
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

type MoreTarget = 'menu' | 'credits' | 'membership';

export default function App() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  // More hosts Credits/Membership as subviews; deep-links land there via
  // this target + nonce (More mounts fresh when the nonce changes).
  const [moreNonce, setMoreNonce] = useState(0);
  const [moreTarget, setMoreTarget] = useState<MoreTarget>('menu');

  // Onboarding chapter: profile gate state (see onboarding/gate.ts).
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoad, setProfileLoad] = useState<ProfileLoadState>('loading');
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);
  const [forceOnboarding, setForceOnboarding] = useState(false);
  const userId = user?.id ?? null;

  const loadProfile = useCallback(async () => {
    try {
      const res = await profileApi.get();
      setProfile(res.data.data ?? null);
      setProfileLoad('ready');
    } catch {
      // Endpoint unavailable (e.g. backend not deployed yet): the gate
      // falls back to the plain app — onboarding must never trap users.
      setProfile(null);
      setProfileLoad('unavailable');
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoad('loading');
      setForceOnboarding(false);
      return;
    }
    setProfileLoad('loading');
    setOnboardingSkipped(readOnboardingSkipped(localStorage, userId));
    void loadProfile();
  }, [userId, loadProfile]);

  if (isLoading) {
    return <div className="app-shell"><LoadingScreen /></div>;
  }
  if (!user) {
    return <div className="app-shell"><FallbackScreen /></div>;
  }

  const gate = onboardingGate({
    loadState: profileLoad,
    profile,
    skipped: onboardingSkipped,
    force: forceOnboarding,
  });

  if (gate === 'loading') {
    return <div className="app-shell"><LoadingScreen /></div>;
  }

  if (gate === 'onboarding') {
    return (
      <div className="app-shell">
        <Suspense fallback={<LoadingScreen />}>
          <Onboarding
            firstName={user.firstName}
            initialEmail={profile?.email}
            initialPhone={profile?.phone}
            onSkip={() => {
              persistOnboardingSkipped(localStorage, user.id);
              setOnboardingSkipped(true);
              setForceOnboarding(false);
            }}
            onDone={() => {
              setForceOnboarding(false);
              void loadProfile();
            }}
          />
        </Suspense>
      </div>
    );
  }

  const goToTab = (next: Tab) => {
    setTab(next);
    haptics.selection();
  };

  const openMore = (target: MoreTarget) => {
    setMoreTarget(target);
    setMoreNonce((n) => n + 1);
    goToTab('more');
  };
  const openCredits = () => openMore('credits');
  const openMembership = () => openMore('membership');

  return (
    <div className="app-shell">
      <main key={tab} className="tb-page-enter">
        <Suspense fallback={<LoadingScreen />}>
          {tab === 'home' && (
            <Home goToTab={goToTab} onOpenCredits={openCredits} onOpenMembership={openMembership} />
          )}
          {tab === 'markets' && (
            <Markets onOpenCredits={openCredits} onOpenMembership={openMembership} />
          )}
          {tab === 'plan' && <Plan goToTab={goToTab} />}
          {tab === 'journal' && <Journal goToTab={goToTab} />}
          {tab === 'more' && (
            <More
              key={moreNonce}
              goToTab={goToTab}
              initialView={moreTarget}
              profileIncomplete={profileReminderVisible(profileLoad, profile)}
              onCompleteProfile={() => setForceOnboarding(true)}
            />
          )}
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
