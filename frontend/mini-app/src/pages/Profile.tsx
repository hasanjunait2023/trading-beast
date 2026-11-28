import { useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { useTheme } from '@shared/theme';
import { useAuth } from '../hooks/useAuth';
import { getTelegramUser, isTelegram } from '../telegram';

/**
 * Profile / Settings (study 15, handoff §3 row 15). Profile fields are
 * read-only (the API exposes no profile mutations). Includes the theme
 * preference toggle (shared useTheme), Telegram connection state, and
 * session sign-out via POST /auth/logout plus sign-out-everywhere via
 * POST /auth/logout-all. All account-scoped state is cleared on sign-out
 * (handled in useAuth).
 */
export default function Profile() {
  const { user, logout, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmingAll, setConfirmingAll] = useState(false);
  const tgUser = getTelegramUser();
  const connected = isTelegram() || Boolean(user?.telegramId);

  const displayName = user?.firstName || tgUser?.first_name || 'Trader';
  const username = user?.username || tgUser?.username;
  const language = user?.languageCode || tgUser?.language_code || 'en';

  const rows: [string, string][] = [
    ['Telegram ID', String(user?.telegramId ?? tgUser?.id ?? '—')],
    ['Referral code', user?.referralCode ?? '—'],
    ['Language', language.toUpperCase()],
    ['Watchlist pairs', String(user?.watchlist?.length ?? 0)],
    ['Referrals credited', String(user?.referralCount ?? 0)],
    ['Tier', user?.tier ?? '—'],
    [
      'Subscription',
      user?.subscription
        ? `${user.subscription.tier} · ${user.subscription.status} · expires ${new Date(user.subscription.expiresAt).toLocaleDateString()}`
        : 'None',
    ],
  ];
  if (user?.isTrialActive) {
    rows.push(['Pro trial', user.trialEndsAt ? `Ends ${new Date(user.trialEndsAt).toLocaleDateString()}` : 'Active']);
  }

  return (
    <div className="space-y-4 px-4">
      <div>
        <h1 className="text-2xl font-bold">Profile & Settings</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Your TradingBeast account</p>
      </div>

      <Card elevated>
        <div className="flex items-center gap-3">
          {tgUser?.photo_url ? (
            <img src={tgUser.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: 'var(--grad-hero)' }} aria-hidden="true">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{displayName}</p>
            {username && <p className="text-sm text-[var(--color-text-muted)]">@{username}</p>}
            <p className="mt-0.5 text-[13px] font-semibold">
              {user?.tier ?? 'FREE'}{user?.isTrialActive ? ' · Pro Trial' : ''}{user?.isProActive ? ' · Pro Active' : ''}
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-0 py-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2.5 text-sm last:border-0">
            <span className="text-[var(--color-text-muted)]">{label}</span>
            <span className="tnum text-right font-semibold">{value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Telegram</span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${connected ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]'}`}>
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-bold">Appearance</h2>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">Theme preference for this device.</p>
        <div className="mt-3 flex gap-2" role="group" aria-label="Theme">
          {(['light', 'dark'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)}
              className={`min-h-[44px] flex-1 rounded-[var(--radius-md)] px-3 text-sm font-semibold capitalize border ${theme === t ? 'bg-[var(--color-accent)] text-[var(--color-accent-text)] border-transparent' : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)]'}`}>
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs text-[var(--color-text-muted)]">
          Disclaimer: TradingBeast is an analysis tool only. It does not provide investment advice,
          trade signals or execution. Trading forex and leveraged products involves substantial
          risk of loss. Past performance does not guarantee future results. Always do your own
          research.
        </p>
      </Card>

      <div className="space-y-2">
        <Button variant="secondary" className="w-full" onClick={logout}>Sign out</Button>
        {confirmingAll ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              Sign out on every device? Other sessions will need to sign in again.
            </p>
            <Button variant="danger" className="w-full" onClick={logoutAll}>Yes, sign out everywhere</Button>
            <Button variant="ghost" className="w-full" onClick={() => setConfirmingAll(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmingAll(true)}>
            Sign out everywhere
          </Button>
        )}
        <p className="text-center text-[11px] text-[var(--color-text-muted)]">
          Signing out clears this device and all account data stored in the app. Reopen the Mini
          App from the bot to sign back in instantly.
        </p>
      </div>
    </div>
  );
}
