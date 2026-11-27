import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, CalendarPlus, Radar, Crown, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userApi, CreditsData } from '../services/api';
import { CreditsSkeleton } from '../components/ui';

export default function Credits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi
      .credits()
      .then((r) => {
        if (r.data.success) setCredits(r.data.data as CreditsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const balance = credits?.balance ?? null;
  const dailyGrant = credits?.dailyGrant ?? 10;
  const radarCost = credits?.radarCost ?? 10;
  const runsLeft = balance !== null && radarCost > 0 ? Math.floor(balance / radarCost) : null;

  const tier = user?.tier ?? 'FREE';
  const trialActive = user?.isTrialActive;
  const trialDaysLeft =
    trialActive && user?.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(user.trialEndsAt).getTime() - Date.now()) / 86_400_000
          )
        )
      : null;

  return (
    <div className="space-y-4 px-4">
      <div>
        <h1 className="text-xl">Credits & Tier</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          One wallet across Telegram, Mini App and browser
        </p>
      </div>

      {loading ? (
        <CreditsSkeleton />
      ) : (
        <>
          <motion.div
            className="card-gradient text-center py-6"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Coins className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-warning)' }} />
            <p className="font-display font-bold text-4xl">{balance ?? '—'}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Available credits
            </p>
            {runsLeft !== null && (
              <p className="text-sm mt-2">
                ≈ {runsLeft} Radar run{runsLeft === 1 ? '' : 's'} available
              </p>
            )}
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <CalendarPlus className="w-6 h-6 mx-auto mb-1.5" style={{ color: 'var(--color-success)' }} />
              <p className="font-display font-bold text-xl">+{dailyGrant}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Free credits every day (they accumulate, never expire)
              </p>
            </div>
            <div className="card text-center">
              <Radar className="w-6 h-6 mx-auto mb-1.5" style={{ color: 'var(--color-link)' }} />
              <p className="font-display font-bold text-xl">{radarCost}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Credits per Radar run (refunded if analysis fails)
              </p>
            </div>
          </div>
        </>
      )}

      <div className="card space-y-3">
        <h2 className="flex items-center gap-2 text-base">
          <Crown className="w-5 h-5" style={{ color: '#fbbf24' }} /> Your tier
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge badge-${tier.toLowerCase()}`}>{tier}</span>
          {trialActive && <span className="badge badge-trial">Pro Trial</span>}
          {user?.isProActive && <span className="badge badge-pro">Pro Active</span>}
        </div>
        {trialActive && (
          <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Clock className="w-4 h-4 shrink-0" />
            {trialDaysLeft !== null
              ? `Trial ends in ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'}`
              : 'Trial active'}
            {user?.trialEndsAt
              ? ` · ${new Date(user.trialEndsAt).toLocaleDateString()}`
              : ''}
          </p>
        )}
        {user?.subscription && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Subscription: {user.subscription.tier} · {user.subscription.status} ·
            expires {new Date(user.subscription.expiresAt).toLocaleDateString()}
          </p>
        )}
        <div className="text-sm space-y-1.5" style={{ color: 'var(--color-text-muted)' }}>
          <p>🆓 <strong style={{ color: 'var(--color-text)' }}>Free</strong> — Focus pairs, basic info, {dailyGrant} credits/day</p>
          <p>⭐ <strong style={{ color: 'var(--color-text)' }}>Pro</strong> — All pairs, Watch/Avoid, full analysis, live alerts</p>
          <p>💎 <strong style={{ color: 'var(--color-text)' }}>Elite</strong> — Pro + custom alerts, priority support</p>
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Premium credit packages are not available yet — use /pay in the bot
          for current upgrade options.
        </p>
      </div>
    </div>
  );
}
