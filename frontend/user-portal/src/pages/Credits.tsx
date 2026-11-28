import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { userApi, type CreditsData } from '../services/api';

/**
 * Credits (study 21). Balance, daily grant and Radar cost come straight from
 * GET /user/credits. Grants accrue on the server in UTC — this page never
 * computes a spendable balance from local time; it only states when the next
 * grant lands (the next UTC day). No history or purchase UI: neither exists
 * in the API.
 */
export default function Credits() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.credits();
      if (res.data.data) setCredits(res.data.data);
      setError('');
    } catch {
      setError('Could not load your credit balance. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !credits) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading credits">
        <Skeleton height={120} />
        <Skeleton height={80} />
      </div>
    );
  }
  if (error && !credits) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }
  if (!credits) return null;

  return (
    <div className="space-y-4">
      <PageHeader title="Credits" subtitle="One wallet, shared across the bot, Mini App and this portal." />

      <Card elevated>
        <p className="text-sm text-[var(--color-text-muted)]">Current balance</p>
        <p className="tnum mt-1 text-4xl font-bold">
          {credits.balance} <span className="text-base font-medium text-[var(--color-text-muted)]">credits</span>
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Credits never expire. Your balance is read from the server — it is the same wallet
          everywhere you use TradingBeast.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Daily grant</p>
          <p className="tnum mt-1 text-2xl font-bold">{credits.dailyGrant} credits / UTC day</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Grants are applied by the server on the UTC day boundary — your next grant arrives
            at the start of the next UTC day. If you are away for a few days, missed grants
            catch up automatically when you return.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-[var(--color-text-muted)]">Radar run cost</p>
          <p className="tnum mt-1 text-2xl font-bold">{credits.radarCost} credits / run</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Credits are spent only when you explicitly confirm a Radar run. Browsing, filters
            and the Session Clock are always free.
          </p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => navigate('/app/markets')}>
          Open Radar
        </Button>
        <Button size="lg" variant="secondary" onClick={() => navigate('/app/membership')}>
          View membership
        </Button>
      </div>
    </div>
  );
}
