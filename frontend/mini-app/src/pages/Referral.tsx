import { useState, useEffect } from 'react';
import { Users, Copy, Check, Share2, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userApi, telegramApi, ReferralEntry, TelegramConfig } from '../services/api';
import { haptics, shareViaTelegram } from '../telegram';

const ENV_BOT_USERNAME =
  import.meta.env.VITE_BOT_USERNAME ||
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME ||
  '';

export default function Referral() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [botUsername, setBotUsername] = useState(ENV_BOT_USERNAME);

  // Prefer the backend's public config (Phase B: GET /api/telegram/config);
  // fall back to the build-time env username when it is unavailable.
  useEffect(() => {
    telegramApi
      .config()
      .then((r) => {
        const cfg: TelegramConfig = (r.data?.data ?? r.data) as TelegramConfig;
        if (cfg?.botUsername) setBotUsername(cfg.botUsername);
      })
      .catch(() => {
        /* env fallback already applied */
      });
  }, []);

  useEffect(() => {
    userApi
      .getReferrals()
      .then((r) => {
        if (r.data.success) {
          const data = r.data.data as ReferralEntry[] | { referrals?: ReferralEntry[]; count?: number; total?: number };
          if (Array.isArray(data)) {
            setReferrals(data);
            setTotalCount(data.length);
          } else if (data && typeof data === 'object') {
            const list = data.referrals ?? [];
            setReferrals(list);
            setTotalCount(data.count ?? data.total ?? list.length);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const code = user?.referralCode ?? '';
  const referralLink = botUsername
    ? `https://t.me/${botUsername}?start=ref_${code}`
    : '';

  const copy = async (text: string, which: 'code' | 'link') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      haptics.notification('success');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      haptics.notification('error');
    }
  };

  const credited = referrals.filter((r) => r.status === 'CREDITED').length;
  const pending = referrals.filter((r) => r.status === 'PENDING').length;
  const displayTotal = totalCount ?? user?.referralCount ?? referrals.length;

  return (
    <div className="space-y-4 animate-fade-in px-4">
      <div>
        <h1 className="text-xl">Referral Program</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Invite friends — you both get rewarded
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center" style={{ padding: 12 }}>
          <Users className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--color-link)' }} />
          <p className="font-display font-bold text-2xl">{loading ? '—' : displayTotal}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Total</p>
        </div>
        <div className="card text-center" style={{ padding: 12 }}>
          <Check className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--color-success)' }} />
          <p className="font-display font-bold text-2xl">{loading ? '—' : credited}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Credited</p>
        </div>
        <div className="card text-center" style={{ padding: 12 }}>
          <Users className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--color-warning)' }} />
          <p className="font-display font-bold text-2xl">{loading ? '—' : pending}</p>
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Pending</p>
        </div>
      </div>

      <div className="card-elevated space-y-4">
        <h2 className="flex items-center gap-2 text-base">
          <LinkIcon className="w-5 h-5" /> Your referral link
        </h2>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Code</p>
          <div className="flex items-center gap-2">
            <code className="font-display font-bold text-xl flex-1 break-all" style={{ color: 'var(--color-link)' }}>
              {code || '—'}
            </code>
            <button
              className="btn-secondary"
              onClick={() => void copy(code, 'code')}
              disabled={!code}
            >
              {copied === 'code' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied === 'code' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Link</p>
          {referralLink ? (
            <p className="text-sm break-all" style={{ color: 'var(--color-text-muted)' }}>
              {referralLink}
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-warning)' }}>
              Bot username not configured yet — share your code above, or open
              /referral in the bot for a ready-made link.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={!referralLink}
            onClick={() => {
              haptics.impact('light');
              shareViaTelegram(
                referralLink,
                'Join me on TradingBeast — session-aware forex focus radar. Get 10 free credits every day!'
              );
            }}
          >
            <Share2 className="w-4 h-4" /> Share in Telegram
          </button>
          <button
            className="btn-secondary"
            disabled={!referralLink}
            onClick={() => void copy(referralLink, 'link')}
          >
            {copied === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied === 'link' ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="card space-y-2">
        <h2 className="text-base">How it works</h2>
        <ol className="text-sm space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <li>1. Share your code or link with a friend.</li>
          <li>2. They open the bot with your link (the referral is captured automatically).</li>
          <li>3. You earn free Pro time for every successful referral.</li>
        </ol>
      </div>

      {referrals.length > 0 && (
        <div className="card space-y-2">
          <h2 className="text-base">Recent referrals</h2>
          {referrals.slice(0, 10).map((ref) => (
            <div
              key={ref.id}
              className="flex items-center justify-between p-2.5 rounded-lg"
              style={{ background: 'var(--color-bg)' }}
            >
              <div>
                <p className="text-sm font-medium">
                  {ref.referred?.firstName || 'Trader'}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {ref.referred?.username
                    ? `@${ref.referred.username}`
                    : ref.referred?.telegramId ?? ''}{' '}
                  · {new Date(ref.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`badge ${
                  ref.status === 'CREDITED' ? 'badge-trial' : 'badge-free'
                }`}
              >
                {ref.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
