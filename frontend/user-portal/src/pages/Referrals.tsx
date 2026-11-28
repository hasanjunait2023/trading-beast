import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
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
import { useAuth } from '../hooks/useAuth';
import { useBotUsername, referralUrl } from '../hooks/useBotConfig';
import { userApi, type ReferralEntry } from '../services/api';

const PAGE_SIZE = 10;

/**
 * Referrals (study 26). Personal code + share/copy (configured bot link
 * only — no link is shown when no bot username is configured) and the
 * paginated referral list. Reward terms are the approved product truth:
 * each credited referral = 7 days of free Pro for BOTH sides. Aliased at
 * /referral.
 * R3b: presentation rebuilt to the study — gradient code card with the
 * code in a bordered box and a Copy link pill, Pending/Credited stat
 * cards, initials-avatar referral rows and a gradient Invite action.
 * Counts stay honest: Credited is the account total from GET /user/me;
 * Pending counts only the loaded page and is labelled as such (the API
 * exposes no global pending total).
 */

function initialsOf(entry: ReferralEntry): string {
  const name =
    entry.referred?.firstName ||
    (entry.referred?.username ? entry.referred.username : '') ||
    'New trader';
  const parts = name.replace(/^@/, '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Referrals() {
  const { user } = useAuth();
  const toast = useToast();
  const botUsername = useBotUsername();
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const code = user?.referralCode ?? '';
  const link = referralUrl(botUsername, code);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await userApi.getReferrals(p, PAGE_SIZE);
      setReferrals(res.data.data ?? []);
      setError('');
    } catch {
      setError('Could not load your referrals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error('Copy is not available here — select the text and copy it manually.');
    }
  };

  const share = async () => {
    if (!link) return;
    const shareData = {
      title: 'TradingBeast',
      text: 'Join TradingBeast with my referral link — we both get 7 days of free Pro when it is credited.',
      url: link,
    };
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled or share failed — fall back to copy */
      }
    }
    await copyText(link, 'Referral link');
  };

  const pendingThisPage = referrals.filter((r) => r.status !== 'CREDITED').length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Referrals"
        subtitle="Invite traders to TradingBeast and grow together."
      />

      {/* Referral code card (study 26). */}
      <section
        aria-label="Your referral code"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-5 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div className="relative">
          <p className="text-[15px] font-semibold text-white/90">Your Referral Code</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[var(--radius-row)] border-2 border-white/35 bg-white/10 px-4 py-3">
            <p className="tnum flex-1 text-[26px] font-extrabold tracking-wide">{code || '—'}</p>
            {link ? (
              <button
                type="button"
                onClick={() => void copyText(link, 'Referral link')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/30"
              >
                <CopyIcon size={16} /> Copy link
              </button>
            ) : code ? (
              <button
                type="button"
                onClick={() => void copyText(code, 'Referral code')}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-white/20 px-4 text-sm font-bold text-white transition-colors hover:bg-white/30"
              >
                <CopyIcon size={16} /> Copy code
              </button>
            ) : null}
          </div>
          {link ? (
            <>
              <p className="mt-3 break-all text-sm text-white/85">{link}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void share()}>
                  Share your link
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void copyText(code, 'Referral code')}>
                  Copy code
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-white/85">
              The bot link is not configured in this build — share your code directly and ask
              friends to enter it when they connect.
            </p>
          )}
        </div>
      </section>

      {/* Stats (study 26): real totals only, page-scoped count labelled. */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
          >
            <ClockIcon size={23} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[var(--color-text-muted)]">Pending</p>
            <p className="tnum text-[26px] leading-tight font-extrabold">
              {loading && referrals.length === 0 ? '—' : pendingThisPage}
            </p>
            <p className="text-[11px] text-[var(--color-text-faint)]">on this page</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3.5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
          >
            <UsersIcon size={23} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-[var(--color-text-muted)]">Credited</p>
            <p className="tnum text-[26px] leading-tight font-extrabold">
              {typeof user?.referralCount === 'number' ? user.referralCount : '—'}
            </p>
            <p className="text-[11px] text-[var(--color-text-faint)]">all time</p>
          </div>
        </Card>
      </div>

      <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-4 shadow-[var(--shadow-card-soft)]">
        <p className="font-bold">How rewards work</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Each credited referral gives <strong className="text-[var(--color-text)]">7 days of free Pro to you</strong> and{' '}
          <strong className="text-[var(--color-text)]">7 days of free Pro to the person you invited</strong>. There is no limit on
          referrals.
        </p>
      </div>

      <section aria-label="Your referrals">
        <h2 className="mb-2.5 text-[21px] font-extrabold tracking-tight">Recent Referrals</h2>
        {loading && referrals.length === 0 ? (
          <div className="space-y-2" role="status" aria-label="Loading referrals">
            <Skeleton height={56} />
            <Skeleton height={56} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : referrals.length === 0 && page === 1 ? (
          <Card>
            <EmptyState
              title="No referrals yet"
              message="Share your code to start earning free Pro time."
            />
          </Card>
        ) : (
          <>
            <Card className="py-1">
              <ul className="divide-y divide-[var(--color-border-soft)]">
                {referrals.map((r) => {
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
                        <p className="truncate text-[15px] font-bold">
                          {r.referred?.firstName ||
                            (r.referred?.username ? `@${r.referred.username}` : 'A new trader')}
                        </p>
                        <p className="tnum text-xs text-[var(--color-text-muted)]">
                          Joined {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                          isCredited
                            ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                            : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                        }`}
                      >
                        {isCredited ? <CheckIcon size={13} /> : <ClockIcon size={13} />}
                        {isCredited ? 'Credited' : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </Button>
              <span className="tnum text-sm text-[var(--color-text-muted)]">Page {page}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={loading || referrals.length < PAGE_SIZE}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          </>
        )}
      </section>

      {link && (
        <Button
          size="lg"
          className="w-full rounded-full text-white"
          style={{ background: 'var(--gradient-primary-action)' }}
          onClick={() => void share()}
        >
          <SendIcon size={19} /> Invite Friends <ArrowRightIcon size={19} />
        </Button>
      )}
    </div>
  );
}
