import { asyncRouter } from '../middleware/async-router.js';
import { randomUUID, createHash } from 'node:crypto';
import { withRadarCredits, InsufficientCredits, DuplicateTrigger, RadarRequestConflict, RadarRunExpired } from '../services/credits.js';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { runAnalysisForUser, getCachedAnalysis, runDailyPublishing } from '../services/analysis.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

import { sessionOverview } from '../services/session-clock.js';
import { pagination } from '../services/pagination.js';
import { getLatestRadarRun, listRadarRuns, getRadarRunById } from '../services/radar-history.js';
import { MarketDataUnavailable } from '../services/market-data.js';
const router: Router = asyncRouter();

// Read-only market clock: no credits charged.
router.get('/sessions', (_req, res) => {
  res.json({success:true,data:sessionOverview(Math.floor(Date.now()/1000))});
});

const analysisRequestSchema = z.object({
  session: z.enum(['Asian', 'London', 'New York']).optional(),
  watchlist: z.array(z.string().min(1).max(32)).max(32).optional()
});

router.post('/focus', async (req: AuthRequest, res) => {
  const parsed = analysisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.errors });
  }

  try {
    const key = req.get('Idempotency-Key') || randomUUID();
    if (!/^[A-Za-z0-9:_-]{1,128}$/.test(key)) return res.status(400).json({success:false,error:'Invalid idempotency key'});
    const fingerprint = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
    const result = await withRadarCredits(req.user!.id, key, () => runAnalysisForUser(req.user!.id, parsed.data), fingerprint);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof InsufficientCredits) return res.status(402).json({success:false,error:'10 credits required'});
    if (error instanceof MarketDataUnavailable) return res.status(503).json({success:false,error:'Market data unavailable; try again later'});
    if (error instanceof RadarRequestConflict) return res.status(409).json({success:false,error:'Request key already used for different input'});
    if (error instanceof RadarRunExpired) return res.status(503).json({success:false,error:'Radar timed out; credits refunded'});
    if (error instanceof DuplicateTrigger) return res.status(409).json({success:false,error:'Trigger already submitted'});
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

// Read-only Radar history (handoff §5): owner-scoped SUCCEEDED runs, zero
// credits — these handlers never touch the credits service.
router.get('/runs/latest', async (req: AuthRequest, res) => {
  const run = await getLatestRadarRun(req.user!.id);
  res.json({ success: true, data: run });
});

router.get('/runs', async (req: AuthRequest, res) => {
  const p = pagination(req.query);
  const { runs, total } = await listRadarRuns(req.user!.id, p);
  res.json({ success: true, data: runs, meta: { page: p.page, limit: p.limit, total } });
});

router.get('/runs/:id', async (req: AuthRequest, res) => {
  const run = await getRadarRunById(req.user!.id, req.params.id);
  if (!run) return res.status(404).json({ success: false, error: 'Run not found' });
  res.json({ success: true, data: run });
});

router.get('/focus/:session', async (req: AuthRequest, res) => {
  const { session } = req.params;
  if (!['Asian', 'London', 'New York'].includes(session)) {
    return res.status(400).json({ success: false, error: 'Invalid session' });
  }

  try {
    return res.status(405).set('Allow','POST').json({success:false,error:'Use POST /api/analysis/focus to explicitly trigger Radar'});
  } catch (error) {
    if (error instanceof InsufficientCredits) return res.status(402).json({success:false,error:'10 credits required'});
    console.error('Cached analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analysis' });
  }
});

router.get('/pairs', (_req, res) => {
  // Return available trading pairs
  const pairs = [
    // FX pairs (EUR > GBP > AUD > NZD > USD > CAD > CHF > JPY order)
    'EUR/USD', 'EUR/GBP', 'EUR/AUD', 'EUR/NZD', 'EUR/USD', 'EUR/CAD', 'EUR/CHF', 'EUR/JPY',
    'GBP/USD', 'GBP/AUD', 'GBP/NZD', 'GBP/USD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY',
    'AUD/USD', 'AUD/NZD', 'AUD/USD', 'AUD/CAD', 'AUD/CHF', 'AUD/JPY',
    'NZD/USD', 'NZD/USD', 'NZD/CAD', 'NZD/CHF', 'NZD/JPY',
    'USD/CAD', 'USD/CHF', 'USD/JPY',
    'CAD/CHF', 'CAD/JPY',
    'CHF/JPY',
    // Assets
    'Gold', 'Silver', 'Oil', 'Bitcoin'
  ];

  // Deduplicate
  const uniquePairs = [...new Set(pairs)];
  res.json({ success: true, data: uniquePairs });
});

// Admin: trigger daily publishing
router.post('/publish/daily', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const results = await runDailyPublishing();
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Daily publishing error:', error);
    res.status(500).json({ success: false, error: 'Publishing failed' });
  }
});

export { router as analysisRoutes };