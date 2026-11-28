import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  SendIcon,
  UsersIcon,
} from '@shared/components/icons';
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
 * R3b: presentation rebuilt to the study — code in a bordered box on the
 * gradient card with a Copy link pill, icon-chip Pending/Credited stat
 * cards (counts cover the loaded entries and are labelled as such — the
 * API exposes no global pending total), initials-avatar rows and a
 * gradient Invite action (Telegram share, as before).
 */

function initialsOf(entry: ReferralEntry): string {
  const name =
    entry.referred?.firstName ||
    (entry.referred?.username ? entry.referred.username : '') ||
    'Telegram user';
  const parts = name.replace(/^@/, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

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
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">Referrals</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Invite traders to TradingBeast and grow together.</p>
      </div>

      {/* Referral code card (study 26). */}
      <section
        aria-label="Your referral code"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-4 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div className="relative">
          <p className="text-[15px] font-semibold text-white/90">Your Referral Code</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-row)] border-2 border-white/35 bg-white/10 px-4 py-3">
            <p className="flex-1 font-mono text-[24px] font-extrabold tracking-wide break-all">{code || '—'}</p>
            {referralLink ? (
              <button
                type="button"
                onClick={() => void copy(referralLink, 'Link')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/30"
              >
                <CopyIcon size={16} /> Copy link
              </button>
            ) : code ? (
              <button
                type="button"
                onClick={() => void copy(code, 'Code')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/30"
              >
                <CopyIcon size={16} /> Copy code
              </button>
            ) : null}
          </div>
          {referralLink ? (
            <p className="mt-2.5 text-sm break-all text-white/85">{referralLink}</p>
          ) : (
            <p className="mt-2.5 text-sm text-white/85">
              Bot link is not configured yet — share your code above, or open /referral in the bot for a ready-made link.
            </p>
          )}
        </div>
      </section>

      <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-4 shadow-[var(--shadow-card-soft)]">
        <h2 className="text-base font-bold">How it works</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          When a friend joins with your link and their referral is credited,{' '}
          <strong className="text-[var(--color-text)]">you both get 7 days of Pro</strong> — 7 days
          for you and 7 days for them, for every credited referral.
        </p>
      </div>

      {/* Stats (study 26 order: Pending, then Credited). */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
          >
            <ClockIcon size={22} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">Pending</p>
            <p className="tnum text-[24px] leading-tight font-extrabold">{loading ? '—' : pending}</p>
            <p className="text-[10.5px] text-[var(--color-text-faint)]">loaded entries</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
          >
            <UsersIcon size={22} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-text-muted)]">Credited</p>
            <p className="tnum text-[24px] leading-tight font-extrabold">{loading ? '—' : credited}</p>
            <p className="text-[10.5px] text-[var(--color-text-faint)]">loaded entries</p>
          </div>
        </Card>
      </div>

      <section aria-label="Your referrals" className="space-y-2.5">
        <h2 className="text-[20px] font-extrabold tracking-tight">Recent Referrals</h2>
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Loading referrals">
            <Skeleton height={60} /><Skeleton height={60} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadPage(1, false)} />
        ) : entries.length === 0 ? (
          <Card>
            <EmptyState title="No referrals yet" message="Share your link above — when friends join and get credited, they will appear here." />
          </Card>
        ) : (
          <>
            <Card className="py-1">
              <ul className="divide-y divide-[var(--color-border-soft)]">
                {entries.map((r) => {
                  const name = r.referred?.firstName || (r.referred?.username ? `@${r.referred.username}` : 'Telegram user');
                  const isCredited = r.status === 'CREDITED';
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-3">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[14px] font-extrabold text-[var(--color-accent)]"
                      >
                        {initialsOf(r)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold">{name}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Joined {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${isCredited ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'}`}
                      >
                        {isCredited ? <CheckIcon size={13} /> : <ClockIcon size={13} />}
                        {isCredited ? 'Credited' : 'Pending'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            {hasMore && (
              <Button variant="secondary" className="w-full" loading={loadingMore} onClick={() => void loadPage(page + 1, true)}>
                Load more
              </Button>
            )}
          </>
        )}
      </section>

      <Button
        size="lg"
        className="w-full rounded-full text-white"
        style={{ background: 'var(--gradient-primary-action)' }}
        disabled={!referralLink}
        onClick={() => {
          haptics.impact('light');
          shareViaTelegram(referralLink, 'Join me on TradingBeast — Session Focus Radar. We both get 7 days of Pro when you join with my link.');
        }}
      >
        <SendIcon size={19} /> Invite Friends <ArrowRightIcon size={19} />
      </Button>
    </div>
  );
}
