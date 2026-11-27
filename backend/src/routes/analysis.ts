import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { runAnalysisForUser, getCachedAnalysis, runDailyPublishing } from '../services/analysis.js';
import { AuthRequest, requireAdmin } from '../middleware/auth.js';

const router: Router = Router();

const analysisRequestSchema = z.object({
  session: z.enum(['Asian', 'London', 'New York']).optional(),
  watchlist: z.array(z.string()).optional()
});

router.post('/focus', async (req: AuthRequest, res) => {
  const parsed = analysisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.errors });
  }

  try {
    const result = await runAnalysisForUser(req.user!.id, parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

router.get('/focus/:session', async (req: AuthRequest, res) => {
  const { session } = req.params;
  if (!['Asian', 'London', 'New York'].includes(session)) {
    return res.status(400).json({ success: false, error: 'Invalid session' });
  }

  try {
    const cached = await getCachedAnalysis(session);
    if (cached) {
      return res.json({ success: true, data: cached });
    }
    // Fall back to live analysis
    const result = await runAnalysisForUser(req.user!.id, { session: session as any });
    res.json({ success: true, data: result });
  } catch (error) {
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