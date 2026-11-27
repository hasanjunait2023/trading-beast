with open('.claude/team/BLUEPRINT.md', 'a', encoding='utf-8') as f:
    f.write("""

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
""")
print("Part 4 written")
