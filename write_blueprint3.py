with open('.claude/team/BLUEPRINT.md', 'a', encoding='utf-8') as f:
    f.write("""

---

## 3. Backend API Specification (Fastify + TypeScript)

### 3.1 Project Structure

```
/backend
src/
  main.ts
  config/index.ts
  config/database.ts
  modules/users/{controller,service,repository,routes,dto}.ts
  modules/subscriptions/{service,repository,routes}.ts
  modules/payments/{service,repository,routes}.ts
  modules/referrals/{service,repository,routes}.ts
  modules/analysis/
    analysis.engine.ts
    analysis.service.ts
    analysis.cache.ts
    chart.generator.ts
    yahoo.client.ts
    finnhub.client.ts
  modules/publishing/{service,telegram.channel,facebook.page}.ts
  modules/admin/{controller,routes,metrics.service}.ts
  modules/telegram-bot/
    bot.ts
    commands/{start,focus,watchlist,subscription,pay,referral,help}.ts
    middleware/{tier.gate,rate.limit}.ts
  shared/types/{analysis,api,database}.ts
  shared/utils/{date,crypto,validation}.ts
  shared/constants/{pairs,scoring}.ts
  plugins/{database,redis,auth,swagger}.ts
prisma/schema.prisma
tests/{analysis.engine.test.ts, yahoo.client.test.ts, integration/}
package.json, tsconfig.json, Dockerfile, .env.example, docker-compose.yml
```

### 3.2 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/v1/users/onboard | Bot token | Create/get user from Telegram webhook |
| GET | /api/v1/users/me | JWT (user) | Get current user profile |
| PATCH | /api/v1/users/me/watchlist | JWT (user) | Update watchlist (tier-gated) |
| GET | /api/v1/users/me/subscription | JWT (user) | Get subscription status |
| GET | /api/v1/focus | JWT (user) | Core: Get focus list for session |
| POST | /api/v1/payments/submit | JWT (user) | Submit payment screenshot |
| GET | /api/v1/referrals/me | JWT (user) | Get referral stats & link |
| POST | /api/v1/referrals/claim | JWT (user) | Claim referral credit |
| GET | /api/v1/publishing/focus-card | Admin/API key | Generate daily Focus Card |
| POST | /api/v1/admin/payments/:id/verify | JWT (admin) | Approve/reject payment |
| GET | /api/v1/admin/users | JWT (admin) | List users with filters |
| PATCH | /api/v1/admin/users/:id/tier | JWT (admin) | Manual tier override |
| GET | /api/v1/admin/metrics | JWT (admin) | Dashboard metrics |
| GET | /api/v1/health | Public | Health check |

### 3.3 Analysis Engine -- Ported from n8n (Critical)

**File:** `src/modules/analysis/analysis.engine.ts`

The existing n8n workflow contains ~500 lines of JavaScript in two Code nodes:
- `Parse Request` -- session detection, watchlist config
- `Analyze & Score2` / `Analyze & Score3` -- full technical analysis

**Porting strategy:**
1. Extract pure functions (EMA, RSI, ATR, swings, ER, ADR, OR, scoring)
2. Add TypeScript interfaces for all intermediate types
3. Make `watchlist`, `session`, `tier` explicit parameters (not hardcoded)
4. Add retry/backoff for Yahoo requests (exponential, max 3 retries)
5. Add Finnhub fallback when Yahoo returns 429/5xx
6. Fix 1H 200-EMA NaN bug: change `range=120d` to `range=60d` (Yahoo 60-day intraday limit)
7. Use spot symbols for metals: `XAUUSD=X` (Gold), `XAGUSD=X` (Silver), `WTI=X` or `CL=F` (Oil)
8. Bitcoin: keep `BTC-USD` but add disclaimer flag; legal review before public launch

**Core types:**

```typescript
// src/shared/types/analysis.ts
export interface PairConfig {
  symbol: string;
  kind: 'fx' | 'asset';
  group: string;
  yahooSymbol: string;
  decimals: number;
  icon: string;
  sessions: string[] | null;
  base?: string;
  quote?: string;
}

export interface AnalysisInput {
  pairs: PairConfig[];
  watchlist: string[] | null;
  session: 'Asian' | 'London' | 'New York';
  sessionStartTs: number;
  orDone: boolean;
  nowSec: number;
  tier: 'FREE' | 'PRO' | 'ELITE';
}

export interface FocusOutput {
  focus: PairAnalysis[];
  watch: PairAnalysis[];
  avoid: PairAnalysis[];
  metadata: {
    session: string;
    timeBDT: string;
    scope: string;
    skipped: string[];
    marketClosed: boolean;
    orReady: boolean;
    hasAsset: boolean;
  };
}
```

**Yahoo Client with Fallback:**

```typescript
// src/modules/analysis/yahoo.client.ts
const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const FINNHUB_BASE = 'https://finnhub.io/api/v1/';

export class YahooClient {
  private finnhubToken: string;
  private http: any;
  
  async fetch15m(symbol: string) { return this.fetchWithFallback(symbol, '15m', '30d'); }
  async fetch1H(symbol: string) { return this.fetchWithFallback(symbol, '60m', '60d'); } // FIXED: was 120d
  async fetch1m(symbol: string) { return this.fetchWithFallback(symbol, '1m', '2d'); }
  
  private async fetchWithFallback(symbol: string, interval: string, range: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await this.http.get(YAHOO_BASE + symbol, {
          params: { interval, range, includePrePost: false },
          headers: { 'User-Agent': 'Mozilla/5.0...' },
          timeout: 10000
        });
        if (res.status === 200) return res.data;
        if (res.status === 429) throw new Error('RATE_LIMIT');
      } catch (e) {
        if (attempt === 2) break;
        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }
    return this.fetchFinnhub(symbol, interval);
  }
}
```

### 3.4 Self-Hosted QuickChart

**Docker image:** `ianw/quickchart:latest`  
**Deploy:** Contabo VPS (Docker Compose)

```yaml
# docker-compose.quickchart.yml
version: '3.8'
services:
  quickchart:
    image: ianw/quickchart:latest
    ports: ["3400:3400"]
    environment:
      - MAX_IMAGE_PIXELS=2000000
      - CACHE_CONTROL_MAX_AGE=3600
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3400/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

**Chart Generator Client:**

```typescript
// src/modules/analysis/chart.generator.ts
const QUICKCHART_URL = process.env.QUICKCHART_URL || 'http://contabo-vps:3400';

export async function generateCandlestickChart(params: {
  pair: PairConfig;
  candles: Candle[];
  emas: { e9: number[]; e15: number[]; e200: number[] };
  rsi: number[];
  orHigh?: number; orLow?: number;
  bias: 'BUY' | 'SELL';
  score: number;
}): Promise<Buffer> {
  const config = buildChartConfig(params);
  const res = await fetch(QUICKCHART_URL + '/chart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: '3',
      backgroundColor: 'white',
      width: 1200,
      height: 850,
      format: 'png',
      chart: config
    })
  });
  if (!res.ok) throw new Error('QuickChart ' + res.status);
  return Buffer.from(await res.arrayBuffer());
}
```
""")
print("Part 3 written")
