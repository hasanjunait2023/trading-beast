import {pagination} from '../services/pagination.js';
import { normalizeWatchlist } from '../services/watchlist.js';
import { selectEffectiveSubscription } from '../services/entitlements.js';
import { asyncRouter } from '../middleware/async-router.js';
import { creditBalance, DAILY_CREDITS, RADAR_COST } from '../services/credits.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

import { prisma } from '../services/db.js';
import { getPreferences, upsertPreferences, isValidTimezone, KNOWN_SESSIONS } from '../services/preferences.js';
import {
  listPlansForDate, getPlan, createPlan, updatePlan, parsePlanDate, todayUtc,
  PlanAlreadyExistsError, PlanNotFoundError, VersionConflictError, InvalidPinnedRunError,
} from '../services/plans.js';
const router: Router = asyncRouter();

const watchlistSchema = z.object({
  watchlist: z.array(z.string().min(1).max(32)).max(32)
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

  let watchlist:string[];
  try {watchlist=normalizeWatchlist(parsed.data.watchlist);} catch {return res.status(400).json({success:false,error:'Unknown watchlist instrument'});}
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { watchlist }
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
  const p=pagination(req.query);
  const payments = await prisma.payment.findMany({
    where: { userId: req.user!.id },skip:p.skip,take:p.take,
    orderBy: [{createdAt:'desc'},{id:'desc'}]
  });
  res.json({ success: true, data: payments,meta:{page:p.page,limit:p.limit} });
});

// --- Server preferences (handoff §5): account-level timezone + sessions ---

const preferencesSchema = z.object({
  timezone: z.string().max(64).nullable().optional(),
  preferredSessions: z.array(z.enum(KNOWN_SESSIONS)).max(3).optional()
});

router.get('/preferences', async (req: AuthRequest, res) => {
  res.json({ success: true, data: await getPreferences(req.user!.id) });
});

router.put('/preferences', async (req: AuthRequest, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid preferences', details: parsed.error.errors });
  }
  const { timezone, preferredSessions } = parsed.data;
  if (timezone !== undefined && timezone !== null && !isValidTimezone(timezone)) {
    return res.status(400).json({ success: false, error: 'Invalid timezone: not an IANA time zone' });
  }
  const data = await upsertPreferences(req.user!.id, { timezone, preferredSessions });
  res.json({ success: true, data });
});

// --- Session plans (handoff §3 row 09): owner-scoped, optimistic concurrency ---

const planDateSchema = z.string().refine((v) => parsePlanDate(v) !== null, 'Expected a YYYY-MM-DD date');

const createPlanSchema = z.object({
  session: z.enum(KNOWN_SESSIONS),
  planDate: planDateSchema.optional(),
  date: planDateSchema.optional()
});

const checklistItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(200),
  done: z.boolean()
});

const patchPlanSchema = z.object({
  checklist: z.array(checklistItemSchema).max(50).optional(),
  invalidation: z.string().max(2000).nullable().optional(),
  riskNotes: z.string().max(2000).nullable().optional(),
  status: z.enum(['DRAFT', 'READY']).optional(),
  pinnedRunId: z.string().min(1).max(128).nullable().optional(),
  version: z.number().int().min(1)
});

router.get('/plans', async (req: AuthRequest, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : todayUtc();
  if (!parsePlanDate(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date: expected YYYY-MM-DD' });
  }
  res.json({ success: true, data: await listPlansForDate(req.user!.id, date) });
});

router.get('/plans/current', async (req: AuthRequest, res) => {
  const session = typeof req.query.session === 'string' ? req.query.session : '';
  const date = typeof req.query.date === 'string' ? req.query.date : todayUtc();
  if (!(KNOWN_SESSIONS as readonly string[]).includes(session)) {
    return res.status(400).json({ success: false, error: 'Invalid session' });
  }
  if (!parsePlanDate(date)) {
    return res.status(400).json({ success: false, error: 'Invalid date: expected YYYY-MM-DD' });
  }
  res.json({ success: true, data: await getPlan(req.user!.id, session, date) });
});

router.post('/plans', async (req: AuthRequest, res) => {
  const parsed = createPlanSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan', details: parsed.error.errors });
  }
  const planDate = parsed.data.planDate ?? parsed.data.date ?? todayUtc();
  try {
    const plan = await createPlan(req.user!.id, { session: parsed.data.session, planDate });
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    if (err instanceof PlanAlreadyExistsError) {
      // Documented contract: 409 with the existing plan in `data`, so the
      // client can adopt it without a second round-trip.
      return res.status(409).json({ success: false, error: 'PLAN_EXISTS', data: err.existing });
    }
    throw err;
  }
});

router.patch('/plans/:id', async (req: AuthRequest, res) => {
  const parsed = patchPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan update', details: parsed.error.errors });
  }
  try {
    const plan = await updatePlan(req.user!.id, req.params.id, parsed.data);
    res.json({ success: true, data: plan });
  } catch (err) {
    if (err instanceof PlanNotFoundError) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    if (err instanceof VersionConflictError) {
      return res.status(409).json({ success: false, error: 'VERSION_CONFLICT', current: err.current });
    }
    if (err instanceof InvalidPinnedRunError) {
      return res.status(400).json({ success: false, error: err.message });
    }
    throw err;
  }
});

router.get('/referrals', async (req: AuthRequest, res) => {
  const p=pagination(req.query);
  const referrals = await prisma.referral.findMany({
    where: { referrerId: req.user!.id },skip:p.skip,take:p.take,
    include: { referred: { select: { telegramId: true, firstName: true, createdAt: true, tier: true } } },
    orderBy: [{createdAt:'desc'},{id:'desc'}]
  });
  res.json({ success: true, data: referrals,meta:{page:p.page,limit:p.limit} });
});

export { router as userRoutes };