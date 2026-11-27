import { useState, FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Radar as RadarIcon,
  List,
  Coins,
  Users,
  User as UserIcon,
  Target,
  AlertCircle,
  Send,
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { haptics } from './telegram';
import Radar from './pages/Radar';
import Watchlist from './pages/Watchlist';
import Credits from './pages/Credits';
import Referral from './pages/Referral';
import Profile from './pages/Profile';

type Tab = 'radar' | 'watchlist' | 'credits' | 'referral' | 'profile';

const TABS: { id: Tab; label: string; Icon: typeof RadarIcon }[] = [
  { id: 'radar', label: 'Radar', Icon: RadarIcon },
  { id: 'watchlist', label: 'Watchlist', Icon: List },
  { id: 'credits', label: 'Credits', Icon: Coins },
  { id: 'referral', label: 'Referral', Icon: Users },
  { id: 'profile', label: 'Profile', Icon: UserIcon },
];

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div
        className="animate-spin rounded-full h-9 w-9 border-2 border-t-transparent mb-4"
        style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }}
      />
      <p style={{ color: 'var(--color-text-muted)' }}>Connecting to TradingBeast…</p>
    </div>
  );
}

/**
 * Shown when the app is NOT opened from Telegram (no initData) and there is
 * no session: explain how to open it from the bot, and offer the same
 * one-time /login code flow the web portal uses (for browser testing).
 * No fake login is ever performed.
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
      setError(
        err instanceof Error ? err.message : 'Login failed — check the code and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-4 animate-fade-in">
      <div className="text-center pt-8 pb-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg,#4f6dff,#7c5cff)' }}
        >
          <Target className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl">TradingBeast</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Session Focus Radar — open this app from the Telegram bot for
          instant, secure sign-in.
        </p>
      </div>

      <div className="card space-y-3 mb-4">
        <h2 className="flex items-center gap-2 text-base">
          <Send className="w-5 h-5" style={{ color: 'var(--color-link)' }} />
          Open from the bot (recommended)
        </h2>
        <ol className="text-sm space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>1. Open the TradingBeast bot in Telegram.</li>
          <li>2. Send /app — or tap the “Open App” menu button in the chat.</li>
          <li>3. The Mini App opens here, already signed in. No password needed.</li>
        </ol>
        {inTelegram && authError && (
          <>
            <div
              className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
            <button className="btn-primary" onClick={() => void retryTelegramLogin()}>
              Retry Telegram sign-in
            </button>
          </>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="text-base">Browser testing — /login code</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Send <code className="font-mono">/login</code> to the bot in a private
          chat and paste the one-time code here.
        </p>
        {(error || (!inTelegram && authError)) && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            role="alert"
            style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error || authError}</span>
          </div>
        )}
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <input
            className="input font-mono"
            type="password"
            autoComplete="one-time-code"
            placeholder="One-time login code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="btn-primary"
            type="submit"
            disabled={submitting || code.trim().length !== 64}
          >
            {submitting ? 'Connecting…' : 'Connect with code'}
          </button>
          {code.trim().length > 0 && code.trim().length !== 64 && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              The code is 64 characters — paste the full code from the bot.
            </p>
          )}
        </form>
      </div>

      <p className="text-center text-[11px] mt-4" style={{ color: 'var(--color-text-muted)' }}>
        ⚠️ Analysis tool only. Not investment advice. Trading involves risk.
      </p>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>('radar');

  if (isLoading) {
    return (
      <div className="app-shell">
        <LoadingScreen />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <FallbackScreen />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={tab}
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tab === 'radar' && <Radar />}
          {tab === 'watchlist' && <Watchlist />}
          {tab === 'credits' && <Credits />}
          {tab === 'referral' && <Referral />}
          {tab === 'profile' && <Profile />}
        </motion.main>
      </AnimatePresence>

      <nav
        aria-label="Mini App tabs"
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          paddingBottom: 'var(--tg-safe-bottom)',
        }}
      >
        <div className="max-w-[480px] mx-auto grid grid-cols-5">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <motion.button
                key={id}
                onClick={() => {
                  setTab(id);
                  haptics.selection();
                }}
                aria-current={active ? 'page' : undefined}
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-0.5 py-2.5 border-none bg-transparent"
                style={{
                  color: active ? 'var(--color-link)' : 'var(--color-text-muted)',
                }}
              >
                <span className="relative flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="tab-active-pill"
                      className="absolute rounded-full"
                      style={{
                        inset: -6,
                        background: 'rgba(107, 134, 255, 0.14)',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <motion.span
                    className="relative flex"
                    animate={{ scale: active ? 1.12 : 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  >
                    <Icon className="w-5 h-5" />
                  </motion.span>
                </span>
                <span className="text-[10px] font-medium">{label}</span>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
