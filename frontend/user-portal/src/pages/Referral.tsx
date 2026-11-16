import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { Users, Copy, Link, Check, Share2, Gift, Clock, Trophy } from 'lucide-react';

export default function Referral() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, credited: 0, pending: 0, freeDaysEarned: 0 });

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      const res = await userApi.getReferrals();
      if (res.data.success) {
        const data = res.data.data;
        setReferrals(data);
        setStats({
          total: data.length,
          credited: data.filter((r: any) => r.status === 'CREDITED').length,
          pending: data.filter((r: any) => r.status === 'PENDING').length,
          freeDaysEarned: data.filter((r: any) => r.status === 'CREDITED').length * 7
        });
      }
    } catch (error) {
      console.error('Failed to fetch referrals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const botUsername = import.meta.env?.VITE_TELEGRAM_BOT_USERNAME || 'your_bot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${user?.referralCode}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Referral Program</h1>
        <p className="text-[var(--color-text-muted)]">Earn free Pro time by inviting friends</p>
      </div>

      {/* Stats */}
      <div className="grid grid-2 md:grid-4 gap-4">
        <div className="card-elevated text-center">
          <Users className="w-8 h-8 mx-auto mb-2 text-[var(--color-accent)]" />
          <p className="font-display text-3xl font-bold">{stats.total}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Total Referrals</p>
        </div>
        <div className="card-elevated text-center">
          <Check className="w-8 h-8 mx-auto mb-2 text-[var(--color-success)]" />
          <p className="font-display text-3xl font-bold">{stats.credited}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Successful</p>
        </div>
        <div className="card-elevated text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-[var(--color-warning)]" />
          <p className="font-display text-3xl font-bold">{stats.pending}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Pending</p>
        </div>
        <div className="card-elevated text-center">
          <Gift className="w-8 h-8 mx-auto mb-2 text-amber-400" />
          <p className="font-display text-3xl font-bold">{stats.freeDaysEarned}</p>
          <p className="text-sm text-[var(--color-text-muted)]">Free Pro Days Earned</p>
        </div>
      </div>

      {/* Your Referral Code */}
      <div className="card-elevated">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Link className="w-5 h-5" />
          Your Referral Code
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 bg-[var(--color-bg)] rounded-lg">
          <div className="flex-1">
            <code className="font-display text-2xl font-bold text-[var(--color-accent)] break-all">
              {user?.referralCode}
            </code>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Share this code with friends</p>
          </div>
          <button
            onClick={() => copyToClipboard(user?.referralCode || '')}
            className="btn btn-primary whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Code
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[var(--color-bg)] rounded-lg">
          <div className="flex-1 min-w-0">
            <code className="text-sm break-all text-[var(--color-text-muted)]">{referralLink}</code>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">Or share this direct link</p>
          </div>
          <button
            onClick={() => copyToClipboard(referralLink)}
            className="btn btn-secondary whitespace-nowrap"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
        </div>

        <button
          onClick={() => navigator.share?.({ title: 'Session Focus Radar', text: 'Join me on Session Focus Radar!', url: referralLink })}
          className="btn btn-ghost w-full sm:w-auto mt-4 justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share via Native
        </button>
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="font-medium mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          How It Works
        </h2>
        <div className="grid grid-1 md:grid-3 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--color-accent)] font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">Share Your Code</p>
              <p className="text-[var(--color-text-muted)]">Give friends your referral code or link</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--color-accent)] font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">They Sign Up</p>
              <p className="text-[var(--color-text-muted)]">Friend uses your code at signup, gets 7 days free Pro</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[var(--color-accent)] font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">You Get Rewarded</p>
              <p className="text-[var(--color-text-muted)]">You get 7 days free Pro per successful referral</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral History */}
      <div className="card">
        <h2 className="font-medium mb-4">Referral History</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-accent)] border-t-transparent" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No referrals yet</p>
            <p className="text-sm mt-1">Share your code to start earning free Pro time</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[var(--color-accent)]" />
                  </div>
                  <div>
                    <p className="font-medium">{ref.referred?.firstName || 'Unknown'}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      @{ref.referred?.username || ref.referred?.telegramId}
                      · {new Date(ref.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`badge ${ref.status === 'CREDITED' ? 'badge-approved' : ref.status === 'PENDING' ? 'badge-pending' : 'badge-rejected'}`}>
                  {ref.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}