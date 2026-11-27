import { PrismaClient, Prisma } from '@prisma/client';
import { runAnalysis, buildPairs, detectSession, type SessionConfig, type FocusResult, type PairConfig } from './analysis-engine.js';
import { fetchMultipleSymbols, type Candle } from './yahoo.js';

const prisma = new PrismaClient();

export interface AnalysisRequest {
  session?: 'Asian' | 'London' | 'New York';
  watchlist?: string[];
}

export async function runAnalysisForUser(userId: string, request: AnalysisRequest = {}): Promise<FocusResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const nowSec = Math.floor(Date.now() / 1000);
  const cfg = detectSession(nowSec);

  // Override session if explicitly requested (for testing/admin)
  if (request.session) {
    const dNow = nowSec + 21600;
    const hourMap: Record<string, number> = { Asian: 7, London: 12, 'New York': 18 };
    const startHour = hourMap[request.session];
    let startD = dNow - (dNow % 86400) + startHour * 3600;
    if (startD > dNow) startD -= 86400;
    cfg.session = request.session;
    cfg.sessionStartTs = startD - 21600;
    cfg.orDone = nowSec >= cfg.sessionStartTs + 3600;
  }

  cfg.watchlist = request.watchlist ?? (user.watchlist.length ? user.watchlist : null);

  const pairs = buildPairs();
  const symbols = pairs.map(p => p.yahoo);

  // Fetch data - use 15m (30d) and 1h (60d max for intraday)
  const [data15m, data1h] = await Promise.all([
    fetchMultipleSymbols(symbols, '15m', '30d'),
    fetchMultipleSymbols(symbols, '1h', '60d')
  ]);

  const yahooData = new Map<string, { data15m: any; data1h: any }>();
  for (const p of pairs) {
    const d15 = data15m.get(p.yahoo);
    const d1 = data1h.get(p.yahoo);
    if (d15 && d1) {
      yahooData.set(p.yahoo, { data15m: { chart: { result: [{ timestamp: d15.map(c => c.ts), indicators: { quote: [{ open: d15.map(c => c.o), high: d15.map(c => c.h), low: d15.map(c => c.l), close: d15.map(c => c.c) }] } }] } },
        data1h: { chart: { result: [{ timestamp: d1.map(c => c.ts), indicators: { quote: [{ open: d1.map(c => c.o), high: d1.map(c => c.h), low: d1.map(c => c.l), close: d1.map(c => c.c) }] } }] } } });
    }
  }

  const result = await runAnalysis(yahooData, cfg, nowSec);

  // Personalized requests must never overwrite shared session snapshots.
  if (!cfg.watchlist?.length) await prisma.focusResult.upsert({
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
  const nowSec = Math.floor(Date.now() / 1000);
  const sessions: ('Asian' | 'London' | 'New York')[] = ['Asian', 'London', 'New York'];
  const results: FocusResult[] = [];

  for (const session of sessions) {
    const dNow = nowSec + 21600;
    const hourMap = { Asian: 7, London: 12, 'New York': 18 };
    const startHour = hourMap[session];
    let startD = dNow - (dNow % 86400) + startHour * 3600;
    if (startD > dNow) startD -= 86400;
    const cfg = {
      session,
      startHour,
      sessionStartTs: startD - 21600,
      orDone: nowSec >= startD - 21600 + 3600,
      watchlist: null as string[] | null
    } as SessionConfig;

    const pairs = buildPairs();
    const symbols = pairs.map(p => p.yahoo);
    const [data15m, data1h] = await Promise.all([
      fetchMultipleSymbols(symbols, '15m', '30d'),
      fetchMultipleSymbols(symbols, '1h', '60d')
    ]);

    const yahooData = new Map<string, { data15m: any; data1h: any }>();
    for (const p of pairs) {
      const d15 = data15m.get(p.yahoo);
      const d1 = data1h.get(p.yahoo);
      if (d15 && d1) {
        yahooData.set(p.yahoo, {
          data15m: { chart: { result: [{ timestamp: d15.map(c => c.ts), indicators: { quote: [{ open: d15.map(c => c.o), high: d15.map(c => c.h), low: d15.map(c => c.l), close: d15.map(c => c.c) }] } }] } },
          data1h: { chart: { result: [{ timestamp: d1.map(c => c.ts), indicators: { quote: [{ open: d1.map(c => c.o), high: d1.map(c => c.h), low: d1.map(c => c.l), close: d1.map(c => c.c) }] } }] } } });
      }
    }

    const result = await runAnalysis(yahooData, cfg, nowSec);

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
