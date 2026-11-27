import { getSessionWindow } from './session-clock.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { runAnalysis, buildPairs, detectSession, type SessionConfig, type FocusResult, type PairConfig } from './analysis-engine.js';
import { marketSnapshots, toEngineInput, MarketDataUnavailable } from './market-data.js';

const prisma = new PrismaClient();

export interface AnalysisRequest {
  session?: 'Asian' | 'London' | 'New York';
  watchlist?: string[];
}

export async function runAnalysisForUser(userId: string, request: AnalysisRequest = {}): Promise<FocusResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const snapshot = await marketSnapshots.get();
  const nowSec = snapshot.asOf;
  const cfg: SessionConfig = request.session ? getSessionWindow(request.session, nowSec) : detectSession(nowSec);

  cfg.watchlist = request.watchlist ?? (user.watchlist.length ? user.watchlist : null);

  const result = await runAnalysis(toEngineInput(snapshot), cfg, snapshot.asOf);
  validateResult(result, snapshot.fxCoverage);

  // Personalized requests must never overwrite shared session snapshots.
  if (!cfg.watchlist) await prisma.focusResult.upsert({
    where: { session_date: { session: cfg.session, date: sessionDate(cfg.sessionStartTs) } },
    update: {
      focusPairs: result.focus as unknown as Prisma.InputJsonValue,
      watchPairs: result.watch as unknown as Prisma.InputJsonValue,
      avoidPairs: result.avoid as unknown as Prisma.InputJsonValue
    },
    create: {
      session: cfg.session,
      date: sessionDate(cfg.sessionStartTs),
      focusPairs: result.focus as unknown as Prisma.InputJsonValue,
      watchPairs: result.watch as unknown as Prisma.InputJsonValue,
      avoidPairs: result.avoid as unknown as Prisma.InputJsonValue
    }
  });

  return result;
}

export async function getCachedAnalysis(session: string, date: Date = new Date()): Promise<FocusResult | null> {
  const cached = await prisma.focusResult.findUnique({
    where: { session_date: { session, date: sessionDate(Math.floor(date.getTime() / 1000)) } }
  });
  return cached ? {
    session: cached.session,
    timestamp: cached.createdAt.toISOString(),
    scope: 'cached',
    focus: cached.focusPairs as any,
    watch: cached.watchPairs as any || [],
    avoid: cached.avoidPairs as any || [],
    warnings: ['Cached result'],
    marketClosed: false,
    closedAssets: [],
    skippedCount: 0,
    orReady: false
  } : null;
}

export async function runDailyPublishing(): Promise<FocusResult[]> {
  const snapshot = await marketSnapshots.get();
  const nowSec = snapshot.asOf;
  const sessions: ('Asian' | 'London' | 'New York')[] = ['Asian', 'London', 'New York'];
  const results: FocusResult[] = [];

  for (const session of sessions) {
    const cfg: SessionConfig = { ...getSessionWindow(session, nowSec), watchlist: null };

    const result = await runAnalysis(toEngineInput(snapshot), cfg, snapshot.asOf);
    validateResult(result, snapshot.fxCoverage);

    await prisma.focusResult.upsert({
      where: { session_date: { session, date: sessionDate(cfg.sessionStartTs) } },
      update: {
        focusPairs: result.focus as unknown as Prisma.InputJsonValue,
        watchPairs: result.watch as unknown as Prisma.InputJsonValue,
        avoidPairs: result.avoid as unknown as Prisma.InputJsonValue
      },
      create: {
        session,
        date: sessionDate(cfg.sessionStartTs),
        focusPairs: result.focus as unknown as Prisma.InputJsonValue,
        watchPairs: result.watch as unknown as Prisma.InputJsonValue,
        avoidPairs: result.avoid as unknown as Prisma.InputJsonValue
      }
    });

    results.push(result);
  }

  return results;
}
// UTC calendar date representing the session's local start day.
function sessionDate(ts: number): Date { const d = new Date((ts + 21600) * 1000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }

function validateResult(result: FocusResult, coverage: number) {
  if (result.skippedCount > 8 || coverage < 0.8) throw new MarketDataUnavailable('Insufficient analyzable market data');
  if (!result.focus.length && !result.watch.length && !result.avoid.length) throw new MarketDataUnavailable('No analyzable results for requested scope');
  result.warnings.push('Closed candles only; quotes are not live execution prices');
}
