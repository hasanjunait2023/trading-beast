# TradingBeast — Frontend + Telegram Mini App + Telegram Config Plan
Written: 2026-11-28 (Asia/Dhaka) · Owner directive: proceed with frontend development,
Telegram Mini App development, and Telegram configuration, planned and advanced by Muse.

## 1. Analysis of the current project (verified from the repo at a308e91)

**Product:** Session Focus Radar / TradingBeast — session-aware (Asian/London/NY)
market-analysis platform for forex traders. 28 FX pairs + Gold/Silver/Oil/Bitcoin,
multi-timeframe scoring (EMA/RSI/ADR/Opening Range). Analysis tool only — not
investment advice, no trade signals/execution (mission charter, 2026-11-16).

**Backend — `backend/` (Express + Prisma/PostgreSQL, TypeScript) — mostly solid**
- Routes: `/api/auth` (Telegram initData login, one-time `/login` code, refresh),
  `/api/analysis` (POST /focus with Idempotency-Key + credit debit, /pairs),
  `/api/user` (me, credits, watchlist, payment, payments, referrals),
  `/api/admin`, `/api/telegram` (webhook, set-webhook, webhook-info).
- Telegram initData verification is done properly: HMAC-SHA256 `WebAppData`,
  timing-safe compare, 5-minute auth_date window, duplicate-param rejection
  (`backend/src/services/telegram-auth.ts`, with tests).
- Credit freemium (docs/CREDIT-FREEMIUM.md, approved 2026-11-28): 10 non-expiring
  credits/day, Radar costs 10, one wallet across Telegram / Mini App / browser,
  lazy accrual, refund on failure, duplicate-trigger protection.
- Telegram bot lives in `backend/src/routes/telegram.ts`: /start /app /login
  /credits /focus /watchlist /tier /referral /pay, inline keyboards, webhook
  secret-token check (timing-safe), referral capture from `/start ref_…`.
- Menu script `backend/scripts/configure-telegram-menu.mjs` (`npm run telegram:menu`)
  sets + verifies the persistent chat menu button → Mini App URL.
- `.env.example` already carries `TELEGRAM_MINI_APP_URL=https://tradingbeast.ecomex.cloud`,
  `TELEGRAM_WEBHOOK_SECRET`, `ADMIN_TELEGRAM_IDS`.

**Frontends — `frontend/` (React 18 + Vite + Tailwind 4)**
- `landing/` — marketing site (Hero/Sessions/Features/Pricing/Docs). Builds standalone.
- `user-portal/` (5173) — Dashboard, Focus, Watchlist, Subscription, Referral,
  Payments, Settings. Desktop sidebar layout. It already loads
  `telegram-web-app.js` and its Login auto-uses `initData` when present — so it
  *functions* inside Telegram, but it is **not a Mini App UX**: no `ready()/expand()`,
  no theme-params, no MainButton/BackButton, no haptics, no `start_param`
  (referral deep-link) handling, no safe-area / mobile bottom-nav design.
- `admin-portal/` (5174) — Dashboard, Users, Payments, Metrics, Analysis.
- Shared design system in `frontend/shared/` (dark navy + electric blue, Space
  Grotesk / Inter / JetBrains Mono).

**Telegram / deployment state**
- `https://tradingbeast.ecomex.cloud` is live (Cloudflare → Caddy, HTTP 200) but
  serves a build last modified 2026-11-16 — the Mini App URL currently points at
  a stale, non-Mini-App frontend.
- BotFather-side items (menu button + main Mini App registration, webhook
  registration with the secret) can only be *executed* against the live bot with
  the real `TELEGRAM_BOT_TOKEN` — owner/provider-gated, prepared below.

**Gaps this plan closes**
1. No dedicated Mini App frontend (the #1 gap).
2. No backend diagnostics/config surface for Telegram (menu button get/set,
   bot info, public config) — today only a one-off script + webhook endpoints.
3. CORS allowlist does not include the Mini App origin from
   `TELEGRAM_MINI_APP_URL`.
4. User-portal has no Telegram UX affordances when opened inside Telegram.

## 2. Plan

### Phase A — Telegram Mini App (`frontend/mini-app/`, NEW) — THIS ROUND
- Vite + React + TS, reusing the shared design tokens and the user-portal API
  contracts (same `/api` endpoints, same JWT flow). Port 5175 (already in the
  backend CORS default list).
- Telegram WebApp integration (`src/telegram.ts`): `ready()`, `expand()`,
  theme-params → CSS variables, color scheme, safe-area insets, haptic helpers,
  MainButton / BackButton hooks, `initDataUnsafe.start_param` referral capture
  (`ref_<code>`).
- Auto-login: if `initData` exists → POST `/api/auth/telegram` automatically
  (with start_param referral for new users); if opened in a plain browser →
  clear fallback screen telling the user to open it from the bot (plus /login
  code path link guidance). No manual login form inside Telegram.
- Mobile-first screens (bottom tab bar, Telegram-native feel):
  - **Radar** — session selector (Asian/London/NY, auto-detect current session
    by UTC), credits balance, Run Radar (also wired to Telegram MainButton),
    Focus/Watch/Avoid cards with score, bias, live price, RSI/ER detail gated
    by tier exactly as the bot formats it.
  - **Watchlist** — view + toggle pairs from `/api/analysis/pairs`, save via
    PATCH `/api/user/watchlist`.
  - **Credits** — balance, daily grant, radar cost, tier status
    (`/api/user/credits`, `/api/user/me`).
  - **Referral** — code, `https://t.me/<bot>?start=ref_<code>` link, Telegram
    share + copy, referral count/list.
  - **Profile** — user, tier, language, disclaimer, open-in-browser note.
- Disclaimer on Radar + Profile ("analysis tool only, not investment advice").

### Phase B — Telegram configuration (backend) — THIS ROUND
- `GET /api/telegram/config` (public, no secrets): `{ botUsername,
  miniAppUrl, miniAppConfigured, webhookPath }` so frontends/landing never
  hardcode the bot name or app URL.
- `GET /api/telegram/diagnostics` (admin): combined `getMe` +
  `getWebhookInfo` + `getChatMenuButton` + config presence (token/secret/mini
  app URL set-or-not, never values) — one call to verify the whole setup.
- `POST /api/telegram/set-menu-button` (admin): server-side equivalent of the
  configure script (validates HTTPS, calls `setChatMenuButton`, verifies with
  `getChatMenuButton`).
- CORS: add `TELEGRAM_MINI_APP_URL` origin to the allowlist automatically.
- Tests for the new endpoints' guard rails (503 when unconfigured, 403/401
  for non-admin, HTTPS validation) following the existing vitest patterns.

### Phase C — Owner/provider steps (prepared, NOT executed without Jafrul)
1. Put real values in production env: `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET`,
   `TELEGRAM_MINI_APP_URL=https://tradingbeast.ecomex.cloud`,
   `ADMIN_TELEGRAM_IDS`, strong `JWT_SECRET` (rotate per CREDIT-FREEMIUM.md).
2. Deploy the Mini App build at `tradingbeast.ecomex.cloud` (replacing the
   stale 2026-11-16 build) and the backend; run Prisma generate/migrations.
3. Run `npm run telegram:menu` (or the new admin endpoint) + re-register the
   webhook with the secret token; verify with `/api/telegram/diagnostics`.
4. BotFather: set the Main Mini App (short name + URL) and menu button text —
   manual BotFather steps, checklist in the runbook section of this plan's
   follow-up doc.

### Phase D — Portal polish (next round, after A/B verified)
- User-portal: detect Telegram WebApp, hide browser chrome, expand viewport,
  pass `start_param` referral through login.
- Landing: use `/api/telegram/config` for the bot CTA links; update pricing
  copy to the approved credit model (10/day free; Pro/Elite credit grants are
  "proposed, not yet activated" — do not market them as live).
- Admin-portal: Telegram diagnostics panel consuming Phase B endpoints.

## 3. Verification standard (every round)
- Backend: `npm run build` + `npm test` green.
- Each frontend: `npm run build` green.
- Mini App additionally checked for: no-login-form inside Telegram, MainButton
  wiring, start_param referral, theme variables applied.
- No deploy and no live-bot changes without Jafrul's confirmation
  (preview-before-deploy rule).
