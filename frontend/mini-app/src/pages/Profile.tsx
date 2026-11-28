import { useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { useTheme } from '@shared/theme';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import { CheckIcon, LogoutIcon } from '@shared/components/icons';
import { useAuth } from '../hooks/useAuth';
import { getTelegramUser, isTelegram } from '../telegram';

/**
 * Profile / Settings (study 15, handoff §3 row 15). Profile fields are
 * read-only (the API exposes no profile mutations). Includes the theme
 * preference toggle (shared useTheme), Telegram connection state, and
 * session sign-out via POST /auth/logout plus sign-out-everywhere via
 * POST /auth/logout-all. All account-scoped state is cleared on sign-out
 * (handled in useAuth).
 * R3b: presentation rebuilt to the study — gradient profile hero with the
 * real plan pill, Telegram account row with a Connected pill, and the
 * mint Sign Out action. The study's timezone/language/session/notification
 * controls are NOT reproduced: the Mini App exposes no such preferences
 * (timezone + sessions live in the web portal's Settings, alert delivery
 * on the portal's Alerts page) — inventing local-only toggles would fake
 * a save.
 */
export default function Profile({
  profileIncomplete = false,
  onCompleteProfile,
}: {
  /** Onboarding chapter: show the finish-setup reminder until completed. */
  profileIncomplete?: boolean;
  onCompleteProfile?: () => void;
} = {}) {
  const { user, logout, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const [confirmingAll, setConfirmingAll] = useState(false);
  const tgUser = getTelegramUser();
  const connected = isTelegram() || Boolean(user?.telegramId);

  const displayName = user?.firstName || tgUser?.first_name || 'Trader';
  const username = user?.username || tgUser?.username;
  const language = user?.languageCode || tgUser?.language_code || 'en';

  const planLabel = user?.isTrialActive
    ? 'Pro Trial'
    : user?.isProActive
      ? 'Pro Active'
      : (user?.tier ?? 'FREE');

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
      {/* Onboarding reminder — persistent until the profile is completed. */}
      {profileIncomplete && onCompleteProfile && (
        <div className="rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] p-4">
          <h2 className="text-base font-bold">Your profile isn't finished yet</h2>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
            Add your Gmail, mobile number and a password so your account can be recovered if you
            ever lose access to Telegram. It takes under a minute.
          </p>
          <button
            type="button"
            onClick={onCompleteProfile}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius-lg)] px-4 text-[15.5px] font-bold text-white shadow-[var(--shadow-hero)] transition-transform active:scale-[0.99]"
            style={{ background: 'var(--gradient-primary-action)' }}
          >
            Complete my profile
          </button>
        </div>
      )}

      {/* Profile hero (study 15). */}
      <section
        aria-label="Profile"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-4 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.5) 0%, rgba(3,40,28,0.15) 60%, rgba(3,40,28,0) 85%)',
          }}
        />
        <div className="relative flex items-center gap-4">
          {tgUser?.photo_url ? (
            <img
              src={tgUser.photo_url}
              alt=""
              className="h-[68px] w-[68px] shrink-0 rounded-full border-[3px] border-white/70 object-cover"
            />
          ) : (
            <div
              className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-[3px] border-white/70 bg-white/15 text-[26px] font-extrabold"
              aria-hidden="true"
            >
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2.5 text-[23px] font-extrabold tracking-tight">
              <span className="truncate">{displayName}</span>
              <span className="rounded-full bg-[var(--color-mint-wash)] px-3 py-1 text-[11.5px] font-bold tracking-wide text-[var(--color-accent)]">
                {planLabel.toUpperCase()}
              </span>
            </p>
            <p className="mt-0.5 truncate text-[14px] text-white/85">
              {username ? `@${username} · ` : ''}Discretionary FX analysis account
            </p>
          </div>
        </div>
      </section>

      <Card className="space-y-0 py-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 border-b border-[var(--color-border-soft)] py-2.5 text-sm last:border-0">
            <span className="text-[var(--color-text-muted)]">{label}</span>
            <span className="tnum text-right font-semibold">{value}</span>
          </div>
        ))}
      </Card>

      {/* Telegram account (study 15). */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">Telegram Account</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              Connect your Telegram to receive analysis alerts
            </p>
            {username && <p className="mt-1.5 text-sm font-semibold">@{username}</p>}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${connected ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-unavailable-bg)] text-[var(--color-unavailable-text)]'}`}
          >
            {connected && <CheckIcon size={14} />}
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
        <button
          type="button"
          onClick={logout}
          className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-[var(--radius-row)] bg-[var(--color-mint-wash)] text-[17px] font-bold text-[var(--color-accent)] transition-transform active:scale-[0.99]"
        >
          <LogoutIcon size={21} /> Sign Out
        </button>
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
