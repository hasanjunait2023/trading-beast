import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { userApi, telegramApi, type ReferralEntry, type TelegramConfig } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { haptics, shareViaTelegram } from '../telegram';

const ENV_BOT_USERNAME =
  import.meta.env.VITE_BOT_USERNAME || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';
const PAGE_SIZE = 20;

/**
 * Referrals (study 26, handoff §3 row 26). Code + identity come from
 * GET /user/me; the list is paginated via GET /user/referrals using the
 * response envelope's meta.page / meta.limit. The bot link prefers the
 * configured bot username from telegramApi.config, falling back to the
 * build-time VITE_BOT_USERNAME. Reward terms shown are the approved product
 * truth only: 7 days of Pro for BOTH sides per credited referral.
 */
export default function Referral() {
  const { user } = useAuth();
  const toast = useToast();
  const [botUsername, setBotUsername] = useState(ENV_BOT_USERNAME);
  const [entries, setEntries] = useState<ReferralEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    telegramApi
      .config()
      .then((r) => {
        const cfg = r.data.data as TelegramConfig | undefined;
        if (cfg?.botUsername) setBotUsername(cfg.botUsername);
      })
      .catch(() => {
        /* env fallback already applied */
      });
  }, []);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await userApi.getReferrals(targetPage, PAGE_SIZE);
      const list = (res.data.data ?? []) as ReferralEntry[];
      const limit = res.data.meta?.limit ?? PAGE_SIZE;
      setEntries((prev) => (append ? [...prev, ...list] : list));
      setPage(res.data.meta?.page ?? targetPage);
      // A full page suggests there may be more; an empty/short page ends it.
      setHasMore(list.length >= limit && list.length > 0);
      setError('');
    } catch {
      if (!append) setError('Could not load your referrals. Check your connection and try again.');
      else toast.error('Could not load more referrals.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => { void loadPage(1, false); }, [loadPage]);

  const code = user?.referralCode ?? '';
  const referralLink = botUsername && code ? `https://t.me/${botUsername}?start=ref_${code}` : '';

  const copy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
      haptics.notification('success');
    } catch {
      toast.error('Copy failed — long-press to copy manually.');
      haptics.notification('error');
    }
  };

  const credited = entries.filter((r) => r.status === 'CREDITED').length;
  const pending = entries.filter((r) => r.status !== 'CREDITED').length;

  return (
    <div className="space-y-4 px-4">
      <div>
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-sm text-[var(--color-text-muted)]">Invite traders to TradingBeast and grow together.</p>
      </div>

      <div className="rounded-[var(--radius-lg)] p-5 text-white shadow-[var(--shadow-md)]" style={{ background: 'var(--grad-hero)' }}>
        <p className="text-sm opacity-80">Your referral code</p>
        <p className="mt-1 font-mono text-2xl font-bold break-all">{code || '—'}</p>
        {referralLink ? (
          <p className="mt-1 text-sm break-all opacity-90">{referralLink}</p>
        ) : (
          <p className="mt-1 text-sm opacity-90">
            Bot link is not configured yet — share your code above, or open /referral in the bot for a ready-made link.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={!code} onClick={() => void copy(code, 'Code')}>Copy code</Button>
          <Button variant="secondary" size="sm" disabled={!referralLink} onClick={() => void copy(referralLink, 'Link')}>Copy link</Button>
        </div>
      </div>

      <Card>
        <h2 className="text-base font-bold">How it works</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          When a friend joins with your link and their referral is credited,{' '}
          <strong className="text-[var(--color-text)]">you both get 7 days of Pro</strong> — 7 days
          for you and 7 days for them, for every credited referral.
        </p>
      </Card>

      <Button
        className="w-full"
        size="lg"
        disabled={!referralLink}
        onClick={() => {
          haptics.impact('light');
          shareViaTelegram(referralLink, 'Join me on TradingBeast — Session Focus Radar. We both get 7 days of Pro when you join with my link!');
        }}
      >
        Share in Telegram
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <p className="tnum text-2xl font-bold">{loading ? '—' : credited}</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">Credited (loaded)</p>
        </Card>
        <Card className="text-center">
          <p className="tnum text-2xl font-bold">{loading ? '—' : pending}</p>
          <p className="text-[13px] text-[var(--color-text-muted)]">Pending (loaded)</p>
        </Card>
      </div>

      <section aria-label="Your referrals" className="space-y-2">
        <h2 className="text-lg font-bold">Your referrals</h2>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Loading referrals">
            <Skeleton height={56} /><Skeleton height={56} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadPage(1, false)} />
        ) : entries.length === 0 ? (
          <Card>
            <EmptyState title="No referrals yet" message="Share your link above — when friends join and get credited, they will appear here." />
          </Card>
        ) : (
          <>
            {entries.map((r) => {
              const name = r.referred?.firstName || (r.referred?.username ? `@${r.referred.username}` : 'Telegram user');
              const isCredited = r.status === 'CREDITED';
              return (
                <Card key={r.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{name}</p>
                    <p className="text-[13px] text-[var(--color-text-muted)]">
                      Joined {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isCredited ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'}`}>
                    {isCredited ? 'Credited' : 'Pending'}
                  </span>
                </Card>
              );
            })}
            {hasMore && (
              <Button variant="secondary" className="w-full" loading={loadingMore} onClick={() => void loadPage(page + 1, true)}>
                Load more
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
