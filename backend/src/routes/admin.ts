import { reconcileCredits } from '../services/credit-audit.js';
import { asyncRouter } from '../middleware/async-router.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

import { prisma } from '../services/db.js';
const router: Router = asyncRouter();

// Admin access is independent of subscription tier.
router.use(requireAdmin);
router.get('/credits/reconciliation', async (_req,res)=>{res.json({success:true,data:await reconcileCredits()});});

const paymentVerifySchema = z.object({
  paymentId: z.string(),
  action: z.enum(['APPROVE', 'REJECT']),
  tier: z.enum(['PRO', 'ELITE']).optional(),
  durationDays: z.number().int().min(1).max(366).optional()
});

router.get('/users', async (req: AuthRequest, res) => {
  const parsed=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),tier:z.enum(['FREE','PRO','ELITE']).optional(),search:z.string().max(100).optional()}).safeParse(req.query);
  if(!parsed.success) return res.status(400).json({success:false,error:'Invalid pagination or filter'});
  const {page:pageNum,limit:limitNum,tier,search}=parsed.data;
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (tier) where.tier = tier;
  if (search) {
    where.OR = [
      { telegramId: { contains: search as string } },
      { username: { contains: search as string } },
      { firstName: { contains: search as string } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { payments: true, referrals: true } }
      }
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: users.map(u => ({
      id: u.id,
      telegramId: u.telegramId,
      username: u.username,
      firstName: u.firstName,
      tier: u.tier,
      trialEndsAt: u.trialEndsAt,
      referralCode: u.referralCode,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
      activeSubscription: u.subscriptions[0] ? {
        tier: u.subscriptions[0].tier,
        status: u.subscriptions[0].status,
        expiresAt: u.subscriptions[0].expiresAt
      } : null,
      paymentCount: u._count.payments,
      referralCount: u._count.referrals
    })),
    meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) }
  });
});

router.get('/users/:id', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      referrals: { include: { referred: true } }
    }
  });
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

router.patch('/users/:id/tier', async (req: AuthRequest, res) => {
  const parsed=z.object({tier:z.enum(['FREE','PRO','ELITE']),expiresAt:z.string().datetime({offset:true}).optional()}).safeParse(req.body);
  if(!parsed.success) return res.status(400).json({success:false,error:'Invalid tier or expiry'});
  const {tier,expiresAt}=parsed.data;
  const now=new Date();
  if(tier!=='FREE' && (!expiresAt || new Date(expiresAt)<=now)) return res.status(400).json({success:false,error:'Paid tier requires a future expiry'});
  const user=await prisma.$transaction(async tx=>{
    const user=await tx.user.findUnique({where:{id:req.params.id}});
    if(!user) return null;
    await tx.user.update({where:{id:user.id},data:{tier,trialEndsAt:null}});
    await tx.subscription.updateMany({where:{userId:user.id,status:{in:['ACTIVE','TRIAL']}},data:{status:'CANCELLED'}});
    if(tier!=='FREE' && expiresAt) await tx.subscription.create({data:{userId:user.id,tier,status:'ACTIVE',startsAt:now,expiresAt:new Date(expiresAt)}});
    return {id:user.id,tier};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(!user) return res.status(404).json({success:false,error:'User not found'});
  res.json({success:true,data:user});
});

router.get('/payments/pending', async (_req: AuthRequest, res) => {
  const payments = await prisma.payment.findMany({
    where: { status: 'PENDING' },
    include: { user: { select: { telegramId: true, username: true, firstName: true, tier: true } } },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ success: true, data: payments });
});

router.post('/payments/verify', async (req: AuthRequest, res) => {
  const parsed = paymentVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.errors });
  }

  const { paymentId, action, tier, durationDays } = parsed.data;

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }
  if (payment.status !== 'PENDING') {
    return res.status(400).json({ success: false, error: 'Payment already processed' });
  }

  if (action === 'APPROVE' && process.env.ENABLE_LEGACY_PAYMENT_APPROVAL !== 'true') return res.status(503).json({success:false,error:'Payment approval disabled pending catalog verification'});
  if (action === 'APPROVE') {
    const subTier = tier || 'PRO';
    const days = durationDays || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const approved = await prisma.$transaction(async tx => {
      const claimed = await tx.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'APPROVED', verifiedAt: new Date(), verifiedBy: req.user!.id }
      });
      if (claimed.count !== 1) return false;
      await tx.user.update({
        where: { id: payment.userId },
        data: { tier: subTier }
      });
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          tier: subTier as any,
          status: 'ACTIVE',
          expiresAt
        }
      });
      return true;
    });
    if (!approved) return res.status(409).json({ success: false, error: 'Payment already processed' });
  } else {
    const rejected = await prisma.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'REJECTED', verifiedAt: new Date(), verifiedBy: req.user!.id }
    });
    if (rejected.count !== 1) return res.status(409).json({ success: false, error: 'Payment already processed' });
  }

  res.json({ success: true, data: { action, paymentId } });
});

router.get('/metrics', async (_req: AuthRequest, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers30d,
    newUsers7d,
    proUsers,
    eliteUsers,
    trialUsers,
    totalRevenue,
    pendingPayments,
    approvedPayments30d,
    totalReferrals,
    activeReferrals
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { tier: 'PRO' } }),
    prisma.user.count({ where: { tier: 'ELITE' } }),
    prisma.user.count({ where: { trialEndsAt: { gte: now } } }),
    prisma.payment.aggregate({ where: { status: 'APPROVED' }, _sum: { amount: true } }),
    prisma.payment.count({ where: { status: 'PENDING' } }),
    prisma.payment.count({ where: { status: 'APPROVED', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.referral.count(),
    prisma.referral.count({ where: { status: 'CREDITED' } })
  ]);

  const activationRate = totalUsers > 0 ? (await prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } })) / totalUsers * 100 : 0;
  const trialConversion = await prisma.user.count({ where: { tier: { in: ['PRO', 'ELITE'] }, trialEndsAt: { lt: now } } });

  res.json({
    success: true,
    data: {
      users: { total: totalUsers, new30d: newUsers30d, new7d: newUsers7d },
      tiers: { free: totalUsers - proUsers - eliteUsers, pro: proUsers, elite: eliteUsers, trial: trialUsers },
      revenue: { total: totalRevenue._sum.amount || 0, pendingPayments, approved30d: approvedPayments30d },
      referrals: { total: totalReferrals, active: activeReferrals },
      activation: { rate: Math.round(activationRate * 100) / 100 },
      trialConversion: { converted: trialConversion }
    }
  });
});

router.post('/analysis/trigger', async (_req: AuthRequest, res) => {
  // Import dynamically to avoid circular deps
  const { runDailyPublishing } = await import('../services/analysis.js');
  try {
    const results = await runDailyPublishing();
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Admin analysis trigger error:', error);
    res.status(500).json({ success: false, error: 'Analysis trigger failed' });
  }
});

export { router as adminRoutes };