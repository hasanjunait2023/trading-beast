import { User as UserIcon, LogOut, Globe, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getTelegramUser, openLink } from '../telegram';

export default function Profile() {
  const { user, logout } = useAuth();
  const tgUser = getTelegramUser();

  const displayName =
    user?.firstName || tgUser?.first_name || 'Trader';
  const username = user?.username || tgUser?.username;
  const language = user?.languageCode || tgUser?.language_code || 'en';

  return (
    <div className="space-y-4 animate-fade-in px-4">
      <div>
        <h1 className="text-xl">Profile</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Your TradingBeast account
        </p>
      </div>

      <div className="card-elevated">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#4f6dff,#7c5cff)' }}
          >
            {tgUser?.photo_url ? (
              <img
                src={tgUser.photo_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-7 h-7 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-lg truncate">{displayName}</p>
            {username && (
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                @{username}
              </p>
            )}
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              <span className={`badge badge-${(user?.tier ?? 'FREE').toLowerCase()}`}>
                {user?.tier ?? 'FREE'}
              </span>
              {user?.isTrialActive && <span className="badge badge-trial">Pro Trial</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--color-text-muted)' }}>Telegram ID</span>
          <span className="font-mono">{user?.telegramId ?? tgUser?.id ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--color-text-muted)' }}>Referral code</span>
          <span className="font-mono">{user?.referralCode ?? '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: 'var(--color-text-muted)' }}>
            <Globe className="w-4 h-4" /> Language
          </span>
          <span className="font-mono uppercase">{language}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--color-text-muted)' }}>Watchlist pairs</span>
          <span className="font-mono">{user?.watchlist?.length ?? 0}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--color-text-muted)' }}>Referrals</span>
          <span className="font-mono">{user?.referralCount ?? 0}</span>
        </div>
      </div>

      <button
        className="btn-secondary w-full"
        onClick={() => openLink('https://tradingbeast.ecomex.cloud')}
      >
        <ExternalLink className="w-4 h-4" /> Open full web portal
      </button>

      <div className="card flex items-start gap-2.5">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          ⚠️ Disclaimer: TradingBeast is an analysis tool only. It does not
          provide investment advice, trade signals or execution. Trading
          forex and leveraged products involves substantial risk of loss.
          Past performance does not guarantee future results. Always do your
          own research.
        </p>
      </div>

      <button
        className="btn-ghost w-full"
        style={{ color: 'var(--color-danger)' }}
        onClick={logout}
      >
        <LogOut className="w-4 h-4" /> Log out
      </button>
      <p className="text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Logging out only clears this device. Reopen the Mini App from the bot
        to sign back in instantly.
      </p>
    </div>
  );
}
