import { useCallback, useEffect, useState } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { Skeleton } from '@shared/components/Skeleton';
import { ErrorState } from '@shared/components/ErrorState';
import { userApi, type CreditsData } from '../services/api';
import { useAuth } from '../hooks/useAuth';

/**
 * Credits (study 21, handoff §3 row 21). Balance, daily grant and scan cost
 * are read from GET /user/credits ONLY — server values, never computed
 * locally. Credits accrue on a UTC day boundary (server-side on read); the
 * next grant is therefore described in UTC terms, not derived from the
 * device clock. No transaction history or purchase UI: the API does not
 * support them here.
 */
export default function Credits({ goToTab }: { goToTab: (tab: 'markets') => void }) {
  const { user } = useAuth();
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
      setError('Could not load your credits. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4 px-4">
      <div>
        <h1 className="text-2xl font-bold">Radar Credits</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Use Radar credits to scan markets for high-potential opportunities.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading credits">
          <Skeleton height={120} />
          <div className="grid grid-cols-2 gap-3"><Skeleton height={88} /><Skeleton height={88} /></div>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : credits ? (
        <>
          <div className="rounded-[var(--radius-lg)] p-5 text-white shadow-[var(--shadow-md)]" style={{ background: 'var(--grad-hero)' }}>
            <p className="text-sm opacity-80">Your wallet</p>
            <p className="tnum mt-1 text-4xl font-bold">{credits.balance} credits</p>
            <p className="mt-1 text-sm opacity-90">
              {credits.radarCost > 0
                ? `≈ ${Math.floor(credits.balance / credits.radarCost)} Radar run${Math.floor(credits.balance / credits.radarCost) === 1 ? '' : 's'} available`
                : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card className="text-center">
              <p className="tnum text-2xl font-bold">+{credits.dailyGrant}</p>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                Daily grant (credits). The next grant is added at the start of the next UTC day —
                balances are calculated by the server, not on this device.
              </p>
            </Card>
            <Card className="text-center">
              <p className="tnum text-2xl font-bold">{credits.radarCost}</p>
              <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                Credits per Radar run. Viewing results and changing filters is always free.
              </p>
            </Card>
          </div>

          <Button className="w-full" size="lg" onClick={() => goToTab('markets')}>
            Open Radar
          </Button>

          <Card>
            <h2 className="text-base font-bold">Your tier</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Current tier: <strong className="text-[var(--color-text)]">{user?.tier ?? '—'}</strong>
              {user?.isTrialActive ? ' · Pro trial active' : ''}
              {user?.subscription
                ? ` · Subscription ${user.subscription.tier} (${user.subscription.status}), expires ${new Date(user.subscription.expiresAt).toLocaleDateString()}`
                : ''}
            </p>
          </Card>
        </>
      ) : null}
    </div>
  );
}
