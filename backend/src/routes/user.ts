import {pagination} from '../services/pagination.js';
import { normalizeWatchlist } from '../services/watchlist.js';
import { selectEffectiveSubscription } from '../services/entitlements.js';
import { asyncRouter } from '../middleware/async-router.js';
import { creditBalance, DAILY_CREDITS, RADAR_COST } from '../services/credits.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

import { prisma } from '../services/db.js';
import { getPreferences, upsertPreferences, isValidTimezone, isValidTimeOfDay, KNOWN_SESSIONS } from '../services/preferences.js';
import {
  listAlertRules, createAlertRule, setAlertRuleEnabled, deleteAlertRule,
  EVALUATOR_SCOPE, AlertAlreadyExistsError, AlertNotFoundError,
} from '../services/alerts.js';
import {
  listPlansForDate, getPlan, createPlan, updatePlan, parsePlanDate, todayUtc,
  PlanAlreadyExistsError, PlanNotFoundError, VersionConflictError, InvalidPinnedRunError,
} from '../services/plans.js';
import {
  listJournalTrades, getJournalTrade, createJournalTrade, updateJournalTrade,
  deleteJournalTrade, parseRangeBound,
  JournalNotFoundError, JournalValidationError,
} from '../services/journal.js';
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

const timeOfDaySchema = z.string().refine(isValidTimeOfDay, 'Expected HH:MM (24h)');

const preferencesSchema = z.object({
  timezone: z.string().max(64).nullable().optional(),
  preferredSessions: z.array(z.enum(KNOWN_SESSIONS)).max(3).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietStart: timeOfDaySchema.nullable().optional(),
  quietEnd: timeOfDaySchema.nullable().optional()
});

router.get('/preferences', async (req: AuthRequest, res) => {
  res.json({ success: true, data: await getPreferences(req.user!.id) });
});

router.put('/preferences', async (req: AuthRequest, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid preferences', details: parsed.error.errors });
  }
  const { timezone, preferredSessions, quietHoursEnabled, quietStart, quietEnd } = parsed.data;
  if (timezone !== undefined && timezone !== null && !isValidTimezone(timezone)) {
    return res.status(400).json({ success: false, error: 'Invalid timezone: not an IANA time zone' });
  }
  // Quiet hours are validated against the MERGED state: enabling requires
  // both bounds, whether they arrive in this request or were saved earlier.
  if (quietHoursEnabled !== undefined || quietStart !== undefined || quietEnd !== undefined) {
    const current = await getPreferences(req.user!.id);
    const merged = {
      enabled: quietHoursEnabled ?? current.quietHoursEnabled,
      start: quietStart !== undefined ? quietStart : current.quietStart,
      end: quietEnd !== undefined ? quietEnd : current.quietEnd
    };
    if (merged.enabled && (!merged.start || !merged.end)) {
      return res.status(400).json({ success: false, error: 'Quiet hours require both a start and an end time' });
    }
  }
  const data = await upsertPreferences(req.user!.id, {
    timezone, preferredSessions, quietHoursEnabled, quietStart, quietEnd
  });
  res.json({ success: true, data });
});

// --- Alerts (handoff §3 row 13): owner-scoped SESSION_START rules only ---
// The evaluator scope is stated in every list response: SESSION_START is the
// only type that can actually be evaluated and delivered today.

router.get('/alerts', async (req: AuthRequest, res) => {
  const [rules, user] = await Promise.all([
    listAlertRules(req.user!.id),
    prisma.user.findUnique({ where: { id: req.user!.id }, select: { telegramId: true } })
  ]);
  res.json({
    success: true,
    data: {
      rules,
      status: {
        telegramLinked: Boolean(user?.telegramId),
        // Boolean only — the token value itself is never exposed.
        botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        evaluator: EVALUATOR_SCOPE
      }
    }
  });
});

const createAlertSchema = z.object({
  type: z.literal('SESSION_START'),
  session: z.enum(KNOWN_SESSIONS)
});

router.post('/alerts', async (req: AuthRequest, res) => {
  const parsed = createAlertSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid alert rule: only SESSION_START rules are available', details: parsed.error.errors });
  }
  try {
    const rule = await createAlertRule(req.user!.id, parsed.data);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    if (err instanceof AlertAlreadyExistsError) {
      // Same contract as plans: 409 with the existing rule in `data`.
      return res.status(409).json({ success: false, error: 'ALERT_EXISTS', data: err.existing });
    }
    throw err;
  }
});

const patchAlertSchema = z.object({
  enabled: z.boolean()
});

router.patch('/alerts/:id', async (req: AuthRequest, res) => {
  const parsed = patchAlertSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid alert update', details: parsed.error.errors });
  }
  try {
    const rule = await setAlertRuleEnabled(req.user!.id, req.params.id, parsed.data.enabled);
    res.json({ success: true, data: rule });
  } catch (err) {
    if (err instanceof AlertNotFoundError) {
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }
    throw err;
  }
});

router.delete('/alerts/:id', async (req: AuthRequest, res) => {
  try {
    await deleteAlertRule(req.user!.id, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    if (err instanceof AlertNotFoundError) {
      return res.status(404).json({ success: false, error: 'Alert rule not found' });
    }
    throw err;
  }
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

// --- Trade journal (handoff §3 rows 11 + 18): owner-scoped trades CRUD ---
// Decimal fields travel as strings (number also accepted) to preserve
// precision; the service re-validates the (merged) trade state and computes
// P&L / R. Field-level failures surface via zod `details` or, for service
// validation, details:[{field, message}].

const decimalValue = z.union([
  z.string().trim().min(1).max(64),
  z.number().finite()
]);

const journalBase = {
  symbol: z.string().trim().min(1).max(32),
  side: z.enum(['LONG', 'SHORT']),
  openedAt: z.string().min(1).max(64),
  closedAt: z.string().min(1).max(64).nullable(),
  quantity: decimalValue,
  entryPrice: decimalValue,
  exitPrice: decimalValue.nullable(),
  stopPrice: decimalValue.nullable(),
  fees: decimalValue,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3,4}$/),
  initialRiskAmount: decimalValue.nullable(),
  notes: z.string().max(5000).nullable(),
  tags: z.array(z.string().trim().min(1).max(32)).max(20)
};

const createJournalSchema = z.object({
  symbol: journalBase.symbol,
  side: journalBase.side,
  openedAt: journalBase.openedAt,
  closedAt: journalBase.closedAt.optional(),
  quantity: journalBase.quantity,
  entryPrice: journalBase.entryPrice,
  exitPrice: journalBase.exitPrice.optional(),
  stopPrice: journalBase.stopPrice.optional(),
  fees: journalBase.fees.optional(),
  currency: journalBase.currency.optional(),
  initialRiskAmount: journalBase.initialRiskAmount.optional(),
  notes: journalBase.notes.optional(),
  tags: journalBase.tags.optional()
});

const patchJournalSchema = z.object({
  symbol: journalBase.symbol.optional(),
  side: journalBase.side.optional(),
  openedAt: journalBase.openedAt.optional(),
  closedAt: journalBase.closedAt.optional(),
  quantity: journalBase.quantity.optional(),
  entryPrice: journalBase.entryPrice.optional(),
  exitPrice: journalBase.exitPrice.optional(),
  stopPrice: journalBase.stopPrice.optional(),
  fees: journalBase.fees.optional(),
  currency: journalBase.currency.optional(),
  initialRiskAmount: journalBase.initialRiskAmount.optional(),
  notes: journalBase.notes.optional(),
  tags: journalBase.tags.optional()
});

function journalError(res: Response, err: unknown): boolean {
  if (err instanceof JournalNotFoundError) {
    res.status(404).json({ success: false, error: 'Trade not found' });
    return true;
  }
  if (err instanceof JournalValidationError) {
    res.status(400).json({
      success: false,
      error: err.message,
      details: err.field ? [{ field: err.field, message: err.message }] : undefined
    });
    return true;
  }
  return false;
}

router.get('/journal', async (req: AuthRequest, res) => {
  const p = pagination(req.query);
  const fromRaw = typeof req.query.from === 'string' ? req.query.from : undefined;
  const toRaw = typeof req.query.to === 'string' ? req.query.to : undefined;
  const from = fromRaw === undefined ? null : parseRangeBound(fromRaw, 'from');
  const to = toRaw === undefined ? null : parseRangeBound(toRaw, 'to');
  if ((fromRaw !== undefined && from === null) || (toRaw !== undefined && to === null)) {
    return res.status(400).json({ success: false, error: 'Invalid date range: expected ISO dates for from/to' });
  }
  if (from && to && from.getTime() > to.getTime()) {
    return res.status(400).json({ success: false, error: 'Invalid date range: from must not be after to' });
  }
  const { trades, total, summary } = await listJournalTrades(req.user!.id, { skip: p.skip, take: p.take, from, to });
  res.json({ success: true, data: trades, meta: { page: p.page, limit: p.limit, total, summary } });
});

router.get('/journal/:id', async (req: AuthRequest, res) => {
  const trade = await getJournalTrade(req.user!.id, req.params.id);
  if (!trade) {
    return res.status(404).json({ success: false, error: 'Trade not found' });
  }
  res.json({ success: true, data: trade });
});

router.post('/journal', async (req: AuthRequest, res) => {
  const parsed = createJournalSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid trade', details: parsed.error.errors });
  }
  try {
    const trade = await createJournalTrade(req.user!.id, parsed.data);
    res.status(201).json({ success: true, data: trade });
  } catch (err) {
    if (!journalError(res, err)) throw err;
  }
});

router.patch('/journal/:id', async (req: AuthRequest, res) => {
  const parsed = patchJournalSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid trade update', details: parsed.error.errors });
  }
  try {
    const trade = await updateJournalTrade(req.user!.id, req.params.id, parsed.data);
    res.json({ success: true, data: trade });
  } catch (err) {
    if (!journalError(res, err)) throw err;
  }
});

router.delete('/journal/:id', async (req: AuthRequest, res) => {
  try {
    await deleteJournalTrade(req.user!.id, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    if (!journalError(res, err)) throw err;
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