import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { useToast } from '@shared/components/Toast';
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
 */
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

  return (
    <div className="space-y-4">
      <PageHeader title="Referrals" subtitle="Invite friends — you both earn free Pro time." />

      <Card elevated>
        <p className="text-sm text-[var(--color-text-muted)]">Your referral code</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="tnum text-3xl font-bold tracking-wide">{code || '—'}</p>
          {code && (
            <Button variant="secondary" size="sm" onClick={() => void copyText(code, 'Referral code')}>
              Copy code
            </Button>
          )}
        </div>
        {link ? (
          <>
            <p className="mt-3 break-all text-sm text-[var(--color-text-muted)]">{link}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void share()}>Share your link</Button>
              <Button variant="secondary" onClick={() => void copyText(link, 'Referral link')}>
                Copy link
              </Button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            The bot link is not configured in this build — share your code directly and ask
            friends to enter it when they connect.
          </p>
        )}
        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] p-3 text-sm">
          <p className="font-semibold">How rewards work</p>
          <p className="mt-1">
            Each credited referral gives <strong>7 days of free Pro to you</strong> and{' '}
            <strong>7 days of free Pro to the person you invited</strong>. There is no limit on
            referrals.
          </p>
        </div>
        {typeof user?.referralCount === 'number' && (
          <p className="tnum mt-3 text-sm text-[var(--color-text-muted)]">
            Credited referrals so far: <strong className="text-[var(--color-text)]">{user.referralCount}</strong>
          </p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Your referrals</h2>
        {loading && referrals.length === 0 ? (
          <div className="space-y-2" role="status" aria-label="Loading referrals">
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(page)} />
        ) : referrals.length === 0 && page === 1 ? (
          <EmptyState
            title="No referrals yet"
            message="Share your code to start earning free Pro time."
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--color-border)]">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {r.referred?.firstName ||
                        (r.referred?.username ? `@${r.referred.username}` : 'A new trader')}
                    </p>
                    <p className="tnum text-xs text-[var(--color-text-muted)]">
                      Joined {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      r.status === 'CREDITED'
                        ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                        : 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]'
                    }`}
                  >
                    {r.status === 'CREDITED' ? 'Credited' : r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
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
      </Card>
    </div>
  );
}
