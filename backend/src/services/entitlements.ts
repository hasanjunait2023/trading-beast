import { prisma } from './db.js';
type Tier = 'FREE' | 'PRO' | 'ELITE';
type Subscription = { tier: Tier; status: string; startsAt: Date; expiresAt: Date };
const rank: Record<Tier, number> = { FREE: 0, PRO: 1, ELITE: 2 };
export function selectEffectiveSubscription<T extends Subscription>(subscriptions: T[], now = new Date()): T | null {
  return subscriptions.filter(s=>s.tier!=='FREE' && ['ACTIVE','TRIAL'].includes(s.status) && s.startsAt<=now && s.expiresAt>now)
    .sort((a,b)=>rank[b.tier]-rank[a.tier] || Number(b.status==='ACTIVE')-Number(a.status==='ACTIVE') || b.expiresAt.getTime()-a.expiresAt.getTime())[0] ?? null;
}
export function resolveTier(subscriptions: Subscription[], now = new Date()): Tier {
  return subscriptions.reduce<Tier>((best, sub) => {
    if (!['ACTIVE','TRIAL'].includes(sub.status) || sub.startsAt > now || sub.expiresAt <= now) return best;
    return rank[sub.tier] > rank[best] ? sub.tier : best;
  }, 'FREE');
}
export async function getEffectiveTier(userId: string): Promise<Tier> {
  const now = new Date();
  const subscriptions = await prisma.subscription.findMany({ where: { userId, status: { in: ['ACTIVE','TRIAL'] }, startsAt: { lte: now }, expiresAt: { gt: now } } });
  return resolveTier(subscriptions, now);
}
