# Session Focus Radar - Buildable Blueprint

> **Project:** Session Focus Radar (Global Market Analysis Tool)  
> **Chartered:** 2026-11-16  
> **Pivot (2026-11-16):** Standalone software project, NOT n8n workflows. Global audience (English + Bengali UI).  
> **Target:** Production-ready in 90 days  
> **Blueprint version:** 1.0 (GATE 1 approved)

---

## 1. System Architecture

### 1.1 Component Diagram

```
SESSION FOCUS RADAR
+------------------+     +------------------+     +--------------------------+
|   Telegram Bot   |     |   Frontend       |     |      Admin Portal        |
|   (Node.js)      |<----|   (Next.js)      |<----|      (Next.js)           |
|                  |     |   User Portal    |     |      /admin              |
+--------+---------+     +--------+---------+     +------------+-------------+
         |                       |                          |
         +-----------------------+--------------------------+
                                 |
                       +---------v---------+
                       |   REST API        |
                       |   (Fastify/Node)  |
                       +---------+---------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
+--------v--------+    +--------v--------+    +---------v---------+
|  PostgreSQL     |    |  Redis Cache    |    |  Self-Hosted      |
|  (Supabase on   |    |  (Session,      |    |  QuickChart       |
|   mt5vps)       |    |   Rate Limit)   |    |  (Docker on       |
+-----------------+    +-----------------+    |   Contabo VPS)    |
                                             +-------------------+
                                 |
                       +---------v---------+
                       |  External APIs    |
                       |  * Yahoo Finance  |
                       |  * Finnhub        |
                       +-------------------+
```

### 1.2 Data Flow -- Key User Interactions

#### /start (Onboarding)
User -> Telegram Bot -> API: POST /api/v1/users/onboard
  -> Check existing user (telegram_id)
  -> If new: create user (tier=FREE, trial_ends_at=NULL, referral_code=GEN)
  -> If referred: update referrals table, grant trial credit
  -> Return welcome message with tier explanation, trial CTA, referral link
  -> Sync to PostgreSQL

#### /focus (Core Analysis Request)
User -> Telegram Bot -> API: GET /api/v1/focus?session=auto&tier={user.tier}
  -> Validate subscription (check tier, trial_ends_at, subscription status)
  -> Gate features by tier:
     - FREE: 1 session summary/day, 3 pairs, 30-min delay
     - PRO: All pairs, live /focus, custom watchlist, session alerts
     - ELITE: Prop firm rules, journal integration, custom alerts
  -> Fetch user watchlist (or default 28 FX + 4 assets for PRO/ELITE)
  -> Check analysis_cache (pair, session, date) -- return cached if < 5 min old
  -> If cache miss: run analysis engine (parameterized by watchlist)
  -> Store result in analysis_cache
  -> Generate charts for FOCUS pairs (async, self-hosted QuickChart)
  -> Return formatted text + chart URLs
  -> Telegram bot sends text + photos

#### Watchlist Change (/watchlist add EUR/USD)
User -> Telegram Bot -> API: PATCH /api/v1/users/me/watchlist
  -> Validate pair exists in master list (28 FX + 4 assets)
  -> Enforce tier limits: FREE=3, PRO=20, ELITE=unlimited
  -> Update users.watchlist (JSONB array)
  -> Return confirmation

#### Payment Submission (bKash/Nagad)
User -> Telegram Bot -> /pay command -> Upload screenshot
  -> Bot forwards to admin channel + creates payment record (status=PENDING)
  -> Admin Portal: Payment verification queue
  -> Admin reviews screenshot, clicks Approve/Reject
  -> On Approve: update subscription (tier, starts_at, expires_at), user.tier
  -> Notify user via Telegram
  -> Log referral credit if applicable

#### Daily Publishing (London & NY Open)
Cron (Schedule): 11:30 BDT (London open) & 17:30 BDT (NY open)
  -> API: POST /api/v1/publishing/generate-focus-card
  -> Run analysis for default watchlist (all pairs)
  -> Pick top 3 FOCUS pairs
  -> Generate chart images via self-hosted QuickChart
  -> Compose Focus Card (image + caption)
  -> Post to Telegram Channel (via Bot API sendPhoto)
  -> Post to Facebook Page (via Graph API / Postiz)
  -> Log in publishing_log table


---

## 2. Database Schema (PostgreSQL)

All tables in public schema. Use Supabase (PostgreSQL 15) on mt5vps.

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS & SUBSCRIPTIONS
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id     BIGINT UNIQUE NOT NULL,
    username        TEXT,
    first_name      TEXT,
    last_name       TEXT,
    language_code   TEXT DEFAULT 'en',
    tier            TEXT NOT NULL DEFAULT 'FREE',
    trial_ends_at   TIMESTAMPTZ,
    watchlist       JSONB NOT NULL DEFAULT '[]'::jsonb,
    referral_code   TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8),
    referred_by     UUID REFERENCES users(id),
    referral_credits INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_banned       BOOLEAN NOT NULL DEFAULT false,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_tier ON users(tier);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    starts_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    auto_renew      BOOLEAN NOT NULL DEFAULT false,
    payment_method  TEXT,
    external_id     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'BDT',
    method          TEXT NOT NULL,
    bkash_txn       TEXT,
    nagad_txn       TEXT,
    usdt_tx_hash    TEXT,
    screenshot_url  TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    verified_at     TIMESTAMPTZ,
    verified_by     UUID REFERENCES users(id),
    rejection_reason TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_bkash_txn ON payments(bkash_txn);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- REFERRALS
CREATE TABLE referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    credit_granted  BOOLEAN NOT NULL DEFAULT false,
    credit_weeks    INTEGER NOT NULL DEFAULT 1,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_referrals_unique ON referrals(referrer_id, referred_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ANALYSIS CACHE (Yahoo hardening)
CREATE TABLE analysis_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair            TEXT NOT NULL,
    session         TEXT NOT NULL,
    analysis_date   DATE NOT NULL,
    tier            TEXT NOT NULL,
    result_json     JSONB NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_analysis_cache_unique ON analysis_cache(pair, session, analysis_date, tier);
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

-- PUBLISHING LOG
CREATE TABLE publishing_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session         TEXT NOT NULL,
    published_at    TIMESTAMPTZ NOT NULL,
    focus_pairs     JSONB NOT NULL,
    telegram_msg_id BIGINT,
    fb_post_id      TEXT,
    status          TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publishing_log_session_date ON publishing_log(session, published_at DESC);

-- METRICS (daily aggregates)
CREATE TABLE daily_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date     DATE NOT NULL UNIQUE,
    new_users       INTEGER NOT NULL DEFAULT 0,
    active_users    INTEGER NOT NULL DEFAULT 0,
    trial_starts    INTEGER NOT NULL DEFAULT 0,
    trial_conversions INTEGER NOT NULL DEFAULT 0,
    paid_subscriptions INTEGER NOT NULL DEFAULT 0,
    churned_users   INTEGER NOT NULL DEFAULT 0,
    referral_signups INTEGER NOT NULL DEFAULT 0,
    referral_conversions INTEGER NOT NULL DEFAULT 0,
    cpl_bdt         NUMERIC(10,2),
    revenue_bdt     NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MASTER PAIRS (reference data)
CREATE TABLE master_pairs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          TEXT UNIQUE NOT NULL,
    kind            TEXT NOT NULL,
    group_name      TEXT,
    yahoo_symbol    TEXT NOT NULL,
    decimals        INTEGER NOT NULL DEFAULT 5,
    icon            TEXT,
    sessions        TEXT[],
    base_currency   TEXT,
    quote_currency  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ADMIN AUDIT LOG
CREATE TABLE admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES users(id),
    action          TEXT NOT NULL,
    target_user_id  UUID REFERENCES users(id),
    details         JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
```

### 2.1 Row Level Security (RLS) Policies

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own" ON users FOR ALL USING (telegram_id = current_setting('app.current_telegram_id')::bigint);
CREATE POLICY "users_admin" ON users FOR ALL USING (current_setting('app.is_admin', true) = 'true');
```


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


---

## 4. Frontend -- User Portal (Next.js 14 + App Router)

### 4.1 Structure

```
/frontend
src/app/(auth)/login/page.tsx
src/app/(auth)/callback/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/page.tsx
src/app/(dashboard)/focus/page.tsx
src/app/(dashboard)/watchlist/page.tsx
src/app/(dashboard)/subscription/page.tsx
src/app/(dashboard)/referrals/page.tsx
src/app/(dashboard)/settings/page.tsx
src/components/ui/{Button,Card,Badge,Table,Modal,Toast}.tsx
src/components/focus/{FocusCard,ScoreBreakdown,ChartImage,SessionPicker}.tsx
src/components/subscription/{TierCard,PaymentForm,TrialBanner}.tsx
src/components/layout/{Sidebar,Header,LanguageSwitcher}.tsx
src/lib/{api,auth,i18n,utils}.ts
src/hooks/{useFocus,useWatchlist,useSubscription}.ts
package.json, tsconfig.json, next.config.js, tailwind.config.ts, Dockerfile
```

### 4.2 Key Pages

| Route | Purpose | Tier Access |
|-------|---------|-------------|
| / | Dashboard: today's session, quick focus, trial banner | All |
| /focus | Full focus list with session picker, charts, score breakdown | PRO/ELITE live; FREE delayed |
| /watchlist | Add/remove pairs, tier limit indicator | PRO/ELITE |
| /subscription | Current tier, trial countdown, upgrade buttons | All |
| /referrals | Referral link, earned credits, leaderboard | All |
| /settings | Language (EN/BN), timezone, notifications | All |

### 4.3 Design System (Anti-Template)

Per rules/ecc/web/design-quality.md:
- **Style direction:** Editorial / magazine with intentional hierarchy
- **Typography:** `Inter` (UI) + `Playfair Display` (headlines)
- **Color:** Semantic palette. Dark mode default, light mode polished.
- **Motion:** Framer Motion for transitions, chart reveal, tier upgrade celebration
- **No shadcn/Tailwind defaults visible** -- custom components with opinionated spacing, depth, layering

---

## 5. Admin Portal (Next.js)

### 5.1 Structure

```
/admin
src/app/(auth)/login/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/page.tsx
src/app/(dashboard)/users/page.tsx
src/app/(dashboard)/users/[id]/page.tsx
src/app/(dashboard)/payments/page.tsx
src/app/(dashboard)/payments/[id]/page.tsx
src/app/(dashboard)/subscriptions/page.tsx
src/app/(dashboard)/referrals/page.tsx
src/app/(dashboard)/publishing/page.tsx
src/app/(dashboard)/metrics/page.tsx
src/components/{tables,forms,charts}
src/lib/api.ts
```

### 5.2 Admin Capabilities

| Feature | Description |
|---------|-------------|
| User management | Search by telegram_id, username, tier; ban/unban; manual tier override |
| Payment verification | Queue with screenshot viewer; one-click approve/reject; auto-upgrade |
| Subscription management | View all; extend expiry; cancel; refund |
| Referral tracking | Referral tree view; credit ledger; manual credit adjustment |
| Publishing control | View daily Focus Cards; manual re-generate; re-post |
| Metrics dashboard | Daily/weekly/monthly: CPL, activation, trial->paid, retention, revenue |

---

## 6. Telegram Bot (Telegraf + TypeScript)

### 6.1 Commands

| Command | Description | Tier Gate |
|---------|-------------|-----------|
| /start [ref_CODE] | Onboarding, tier explanation, trial CTA, referral handling | All |
| /focus [session] | Get focus list (asian/london/ny/auto) | FREE: 1/day delayed; PRO/ELITE: live |
| /watchlist | Show current watchlist | PRO/ELITE |
| /watchlist add <PAIR> | Add to watchlist | PRO/ELITE |
| /watchlist remove <PAIR> | Remove from watchlist | PRO/ELITE |
| /subscription | Show tier, trial status, expiry, upgrade buttons | All |
| /pay | Initiate payment -> upload screenshot | FREE (trial expired) |
| /referral | Show referral link, earned credits, claim | All |
| /help | Command list, disclaimer | All |
| /language | Switch EN/BN | All |

### 6.2 Bot Middleware

```typescript
async function tierGate(ctx, next) {
  const user = await getUser(ctx.from.id);
  if (!user) return ctx.reply('Please /start first');
  ctx.state.user = user;
  
  const command = ctx.message?.text?.split(' ')[0];
  const gates = { '/focus': 'FREE', '/watchlist': 'PRO', '/watchlist add': 'PRO', '/pay': 'FREE' };
  const required = gates[command];
  if (required && !hasTierAccess(user.tier, required)) {
    return ctx.reply('This feature requires Pro/Elite. Upgrade to unlock.');
  }
  if (command === '/focus' && user.tier === 'FREE') {
    const lastFocus = await getLastFocusTime(user.id);
    if (lastFocus && Date.now() - lastFocus < 24*3600*1000) {
      return ctx.reply('Free tier: 1 focus per day. Upgrade for unlimited.');
    }
  }
  return next();
}
```

---

## 7. Tech Stack Decisions

| Layer | Choice | Justification |
|-------|--------|---------------|
| Backend Runtime | Node.js 20 + Fastify | High throughput, native TS, low overhead |
| Language | TypeScript (strict) | Type safety for engine, API, DB |
| Database | PostgreSQL 15 (Supabase on mt5vps) | Already running, managed, RLS |
| Cache/Queue | Redis 7 (Docker on mt5vps) | Session, rate limit, BullMQ |
| ORM | Kysely | Type-safe SQL, full control |
| Auth (User) | Telegram Login Widget + JWT | Native Telegram integration |
| Auth (Admin) | Email/password + 2FA (TOTP) | Separate admin identities |
| Chart Generation | Self-hosted QuickChart (Docker) | Public tier caps at 1k/month; unlimited on Contabo |
| Primary Data | Yahoo Finance (unofficial) | Free, covers all 32 symbols |
| Fallback Data | Finnhub Free (60 req/min) | Forex, metals, crypto fallback |
| Gold/Silver/Oil | Spot: XAUUSD=X, XAGUSD=X, WTI=X | Consistent spot pricing |
| Bitcoin | BTC-USD with disclaimer flag | Legal review required (FE Circular 24) |
| Telegram Bot | Telegraf (TypeScript) | Modern, typed, middleware |
| Scheduling | BullMQ + Cron | Reliable, persistent, retryable |
| Frontend | Next.js 14 + Tailwind + Framer Motion | SSR, DX, component sharing |
| Deployment | Docker Compose on Contabo + mt5vps | Existing infra, full control |
| Monitoring | Grafana + Prometheus | Already in stack |
| CI/CD | GitHub Actions -> Docker -> Contabo | Standard, free |

---
SECTIONS## 8. Build Sequence -- 90-Day Plan
### Phase 0: Foundation (Week 1) -- M1: Data Foundation
- Provision PostgreSQL schema (all tables)
- Seed master_pairs with 28 FX + 4 assets
- Deploy self-hosted QuickChart on Contabo (Docker)
- Configure Redis on mt5vps (Docker)
- Set up GitHub repo, CI/CD pipeline
- Set up monitoring (Grafana dashboards)
- **Exit:** All infra running, schema migrated, QuickChart generating test charts, CI/CD green
## 9. Risk Register (Top 10)
| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Yahoo Finance blocks/rate-limits | High | High | Retry/backoff, Finnhub fallback, 5-min cache, MT5 bridge post-launch |
| 2 | Legal/regulatory (FER Act, FE Circular 24) | Medium | Critical | Market Analysis Tool positioning; disclaimers everywhere; Bitcoin gated; no IB links |


---

## 10. Out of Scope (Explicit)

- Trading execution, broker integration, signals, order management
- Native mobile app (Telegram bot + Web App only)
- Languages beyond English + Bengali
- User web dashboard as primary (Telegram-first)
- Paid data feeds (Yahoo + Finnhub free only)
- Prop firm rules, journal integration (ELITE placeholders)
- Multi-region deployment
- Advanced charting (drawing tools, multi-timeframe)
- Social features (chat, community, copy-trading)
- White-label / partner API

---

## 11. File Inventory

See Section 3.1, 4.1, 5.1 for complete directory structures.

---

## 12. Open Questions for Founder (GATE 1 Decisions)

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | Bitcoin in public MVP? | **Exclude until legal sign-off** (ENABLE_CRYPTO=false) |
| 2 | Auto-payment gateway for launch? | **Manual only** (SSLCommerz Phase 2) |
| 3 | Pricing in BDT or USD? | **USD global, BDT display for BD users** |
| 4 | Free tier limit? | **1/day with 30-min delay** |
| 5 | Referral reward? | **1 week Pro per referral** |
| 6 | Admin portal: separate domain? | **Separate admin.sessionfocusradar.com** |
| 7 | Telegram Web App vs native? | **Web App for portal, native for commands** |
| 8 | Launch date commitment? | **Fixed: 2027-02-15** |

---

## 13. Success Metrics (GATE 2 Definition of Done)

| Metric | Target |
|--------|--------|
| API Reliability | 99.9% uptime, p95 < 2s |
| Analysis Accuracy | 100% parity with n8n reference outputs |
| Yahoo Resilience | 0% data loss under 429; < 5% fallback rate |
| Trial to Paid | 10-15% within 30 days |
| Activation (24h) | 40%+ of signups call /focus |
| CPL | < 150 BDT |
| Retention (Month 2) | > 60% of paid users active |
| Daily Publishing | 100% success for 30 consecutive days |
| Security | 0 CRITICAL/HIGH findings |
| Legal | All disclaimers present; Bitcoin gated |

---

## 14. Immediate Next Steps (This Week)

1. Run DB migration on mt5vps Supabase (schema in Section 2)
2. Seed master_pairs with verified Yahoo symbols (spot for metals)
3. Deploy QuickChart on Contabo VPS (Docker Compose)
4. Initialize GitHub repo with backend/frontend/admin folders
5. Set up CI/CD (GitHub Actions -> Docker -> Contabo SSH deploy)
6. Start Phase 1 -- Port analysis engine (highest technical risk)

---

**Blueprint Status:** Complete -- Ready for GATE 1 review and BUILD phase kickoff.

*Document version: 1.0 | Author: CEO-Architect | Date: 2026-11-16*