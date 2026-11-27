# TradingBeast — Frontend Completion Plan (pre-deploy)

Owner directive (Jafrul, 2026-11-28): complete ALL frontend chapters before any
deploy. Style rules:

- **Simple, not complex** — clean layouts, but with a real **app-interface feel**.
- Perfect UI/UX, consistent across all four surfaces.
- **3D animation / motion graphics where they fit** — tasteful, lightweight
  (framer-motion + CSS 3D transforms; no heavy 3D engines).
- Every page must be backed by a real API. No fake data, no fabricated
  testimonials or prices. Pricing follows the approved credit model
  (docs/CREDIT-FREEMIUM.md): Free = 10 credits/day, never expire; Radar run =
  10 credits; Pro/Elite **coming soon** (planned +300/+900 credits, labelled
  planned). Analysis tool only — not investment advice; disclaimers stay.

Surfaces: landing (apex), user portal, admin portal, Telegram Mini App.

## F1 — Landing completion

Existing: Hero, TrustLogos, ValueProps, Features, Sessions, Docs, Pricing,
Footer. Add:

1. **PainPoints** — the trader's real problems the product answers: watching
   28+ pairs across 3 sessions, analysis paralysis at session open, noisy paid
   signal groups, scattered tools (charts + spreadsheets + chat). Honest,
   product-true copy.
2. **Comparison** — TradingBeast vs manual chart-watching vs paid signal
   groups vs generic indicator bots: session-aware focus list, credit-based
   pricing, works inside Telegram, no signals/advice claims, transparent
   scoring (EMA/RSI/ADR/opening range). Feature matrix with honest
   checks/dashes.
3. **AppShowcase** — the Mini App shown as a phone-style mock built from real
   UI elements (Radar list, credits chip), with 3D tilt/parallax on scroll.
4. **FAQ** — credits, sessions, Telegram login, payments (bKash/Nagad/Binance
   manual verification), disclaimer questions.
5. **FinalCTA** — Open in Telegram (config-driven, Phase D service).

Motion: scroll-reveal (framer-motion whileInView), soft 3D tilt on showcase,
gradient depth — restrained.

## F2 — User portal completion (the app UI, every user's own workspace)

Existing: Dashboard, Focus, Watchlist, Subscription, Payments, Referral,
Settings, Login. Add:

1. **Plans (/plans)** — in-app pricing: Free vs Pro/Elite (coming soon),
   credit model explainer (earn/spend, never expire), current plan badge,
   CTA to Subscription/Payments.
2. **Billing (/billing)** — payment history from `GET /user/payments`:
   status timeline (pending → verified/rejected), method, amount, plan,
   transaction id; receipt-style detail; empty state guiding to Payments.
3. **Payment confirmation (/payment/success)** — after a payment submission:
   confirmation screen with submitted details, "what happens next" steps
   (admin verification → tier/credits update), link to Billing to track.
   Payments page navigates here on success.
4. **Help (/help)** — FAQ (credits, sessions, watchlist, payments,
   referrals), contact via the Telegram bot, risk disclaimer.
5. **NotFound (404)** — friendly app-style 404 with nav back.
6. Polish: page transitions (framer-motion), skeleton loaders on data pages,
   consistent empty states. Browser + in-Telegram layouts both respected.

## F3 — Admin portal: business management suite

Existing: Dashboard, Users, Payments, Metrics, Analysis, Telegram, Login.
Add (all from existing admin APIs — users, payments, metrics, telegram):

1. **Finance (/finance)** — revenue overview: total/verified revenue from
   metrics + payments data, revenue by method/plan, pending-verification
   value, recharts trend where data supports it; honest empty states.
2. **Subscriptions (/subscriptions)** — tier distribution (Free/Pro/Elite),
   user counts per tier, recent tier changes surface via users list,
   quick links to Users for tier changes.
3. **Credits (/credits)** — credit economy: the live model (10/day grant,
   10/Radar run, referral bonuses per CREDIT-FREEMIUM), planned tier grants
   labelled planned, how the ledger works; links to Users.
4. **Settings (/settings)** — business configuration status: Telegram config
   (bot, webhook, Mini App URL) from the Phase B endpoints, environment
   readiness checklist (read-only; changes happen via .env/deploy),
   payment-method notes from CREDIT-FREEMIUM.
5. Nav grouped: Overview (Dashboard, Metrics) · Business (Users,
   Subscriptions, Payments, Finance, Credits) · Operations (Analysis,
   Telegram, Settings).

## F4 — Mini App polish

- Page transitions between tabs (framer-motion), skeleton loaders for Radar/
  Watchlist/Credits, polished empty states, subtle 3D depth on cards
  (gradient + shadow), MainButton states unchanged. No new fake features.

## F5 — Verify & ship (no deploy)

- All four production builds green; backend untouched.
- Commit + push to GitHub `master` per phase (default flow).
- Deploy stays owner-gated: merge master→main only on Jafrul's explicit order
  (docs/PHASE-C-DEPLOY-RUNBOOK.md).

## Non-goals

- No backend changes, no new payment gateways, no fabricated content.
- No three.js/WebGL — motion stays light so the apps stay fast on phones.
