import { selectEffectiveSubscription } from '../services/entitlements.js';
import { asyncRouter } from '../middleware/async-router.js';
import { creditBalance, DAILY_CREDITS, RADAR_COST } from '../services/credits.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

import { prisma } from '../services/db.js';
const router: Router = asyncRouter();

const watchlistSchema = z.object({
  watchlist: z.array(z.string()).min(1).max(50)
});

const paymentSchema = z.object({
  amount: z.number().int().positive().max(2147483647),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3,4}$/).default('USD'),
  method: z.enum(['BKASH', 'NAGAD', 'USDT']),
  transactionId: z.string().trim().min(1).max(128),
  screenshotUrl: z.string().max(2048).url().refine(s=>s.startsWith('https://')).optional()
});

router.get('/credits', async (req: AuthRequest, res, next) => {
  try { res.json({success:true,data:{balance:await creditBalance(req.user!.id),dailyGrant:DAILY_CREDITS,radarCost:RADAR_COST}}); } catch(e) { next(e); }
});

router.get('/me', async (req: AuthRequest, res) => {
  const now = new Date();
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      subscriptions: { where: {status:{in:['ACTIVE','TRIAL']},startsAt:{lte:now},expiresAt:{gt:now}} },
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      referrals: { where: { status: 'CREDITED' } }
    }
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const activeSub = selectEffectiveSubscription(user.subscriptions, now);
  const isTrialActive = activeSub?.status === 'TRIAL' && activeSub.expiresAt > new Date();
  const isProActive = activeSub?.status === 'ACTIVE' && activeSub.expiresAt > new Date();

  res.json({
    success: true,
    data: {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      tier: req.user!.tier,
      trialEndsAt: user.trialEndsAt,
      referralCode: user.referralCode,
      watchlist: user.watchlist,
      languageCode: user.languageCode,
      isTrialActive,
      isProActive,
      subscription: activeSub ? {
        tier: activeSub.tier,
        status: activeSub.status,
        expiresAt: activeSub.expiresAt
      } : null,
      recentPayments: user.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt
      })),
      referralCount: user.referrals.length
    }
  });
});

router.patch('/watchlist', async (req: AuthRequest, res) => {
  const parsed = watchlistSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid watchlist', details: parsed.error.errors });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { watchlist: parsed.data.watchlist }
  });

  res.json({ success: true, data: { watchlist: user.watchlist } });
});

router.post('/payment', async (req: AuthRequest, res) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid payment data', details: parsed.error.errors });
  }

  const { amount, currency, method, transactionId, screenshotUrl } = parsed.data;

  // Check for duplicate transaction
  const existing = await prisma.payment.findFirst({ where: { transactionId } });
  if (existing) {
    return res.status(409).json({ success: false, error: 'Transaction ID already used' });
  }

  const payment = await prisma.payment.create({
    data: {
      userId: req.user!.id,
      amount,
      currency,
      method,
      transactionId,
      screenshotUrl,
      status: 'PENDING'
    }
  });

  res.json({ success: true, data: { paymentId: payment.id, status: 'PENDING', message: 'Payment submitted for verification' } });
});

router.get('/payments', async (req: AuthRequest, res) => {
  const payments = await prisma.payment.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: payments });
});

router.get('/referrals', async (req: AuthRequest, res) => {
  const referrals = await prisma.referral.findMany({
    where: { referrerId: req.user!.id },
    include: { referred: { select: { telegramId: true, firstName: true, createdAt: true, tier: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ success: true, data: referrals });
});

export { router as userRoutes };