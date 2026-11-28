# TradingBeast — Frontend A-to-Z Plan

Owner directive (Jafrul, 2026-11-28 ~13:45 +06): the frontend as it stands is
not right — rebuild it properly, A to Z, starting from a full plan.

This plan replaces the earlier FRONTEND-COMPLETION-PLAN.md approach (which
patched pages one by one). The A-to-Z program rebuilds the frontend on one
design foundation, surface by surface, with visual verification at every step.

## Standing rules (owner's, unchanged)

- Simple and clean — never over-complex — but with a real app-interface feel.
- Tasteful motion / 3D where it fits (lightweight: framer-motion + CSS 3D;
  no heavy engines).
- NO fake data anywhere: every number, chart and list comes from the real API.
- Product UI in English; communication with the owner in Bengali.
- Flow per phase: build → verify (build green + screenshots) → commit → push.
- Deploy ONLY on the owner's explicit order.

## Audit — what exists today (2026-11-28, honest)

Four apps share one token file but almost nothing else:

| Surface | Pages | State |
|---|---|---|
| Landing | 14 sections | Complete on paper; generic template feel, mock showcase instead of real product visuals, no SEO/meta pass, render-blocking font import |
| User portal | 13 pages | Functional but plain admin-template look; thin shared components; no data-viz language; no onboarding; loading/empty/error states inconsistent per page |
| Admin portal | 12 pages | Functional; same generic look; tables without a system (filters/sort/export ad hoc); charts minimal |
| Mini App | 5 screens | Works, but JS bundle ~372 KB (heavy for in-Telegram), single-file UI kit, least polished of the four despite being the primary user surface |
| Shared | tokens + 104-line component file + global.css | A palette, not a design system: no buttons/cards/tables/forms/charts/skeleton/empty-state primitives shared across apps — every app re-invents them, so the four surfaces don't feel like one product |

Core problems, in order:
1. No real design system → four surfaces, four feels.
2. The primary surface (Mini App) is the weakest and the heaviest.
3. Portal/admin look like a default Tailwind template, not a trading product.
4. Landing sells with mocks, not with the real product.
5. Cross-cutting gaps: inconsistent states (loading/empty/error/offline),
   no accessibility pass, no performance budget, no visual QA habit.

## Program structure

### Z0 — Design foundation (do first; everything else builds on it)
- Design tokens v2: keep the "Neon Dark Tech" identity (navy-black, electric
  blue/violet) but complete it — spacing scale, type scale, elevation,
  semantic colors for market states (session open/closed, buy/sell/neutral,
  tier colors), light-section rules for landing.
- Component library in `frontend/shared/` (real primitives, used by all apps):
  Button, Card, Badge, Input/Select/FormField, Table (sort/filter/pagination),
  Tabs, Modal/Sheet, Toast, Skeleton, EmptyState, ErrorState, Stat/KPI card,
  Sparkline + line/bar chart components (real data only), SessionBadge,
  TierBadge, CreditPill.
- Motion language: page transitions, list stagger, card hover/tilt rules,
  number count-ups, reduced-motion respect (`prefers-reduced-motion`).
- Typography: self-hosted font files (drop the render-blocking Google
  @import), display/body/mono roles.
- Exit gate: a living style-guide page (internal route/storybook-style HTML)
  screenshotted and reviewed; all primitives unit-usable from each app.

### Z1 — Telegram Mini App (primary surface — rebuild first)
- Full UX rebuild on the Z0 kit: Radar (hero flow: session status → run →
  animated results), Watchlist, Credits, Referral, Profile.
- Native Telegram feel: theme params (light/dark), MainButton/BackButton,
  haptics, safe areas, swipe-friendly lists, skeleton-first loading.
- Performance budget: initial JS ≤ 200 KB (code-split per tab, lazy charts),
  first paint < 1.5 s on mid-range Android over 4G.
- Result cards redesigned as trading cards: pair, session, score gauge,
  EMA/RSI/ADR chips, opening-range state — scannable in 2 seconds.
- Exit gate: in-Telegram test (owner's bot) + screenshots of all 5 screens,
  light + dark theme.

### Z2 — User Portal (browser companion)
- Layout rebuild: sidebar + topbar on Z0 kit, command-palette search (⌘K),
  session clock always visible (Asia/London/NY live state).
- Dashboard: real KPI cards (credits, tier, streak), today's focus preview,
  session timeline chart, recent radar runs — all real API aggregates.
- Focus List: the product's core screen — session tabs, score-sorted cards,
  pair detail drawer (indicators, ADR progress, notes), watchlist actions.
- Money flow polish: Plans → checkout → PaymentSuccess confirmation →
  Billing timeline; Referral center with share assets; Settings completed
  (profile, notifications, Telegram link state); Help with real FAQ + support
  route; first-run onboarding checklist for new users.
- States everywhere: skeleton/empty/error/offline per page, consistent.
- Exit gate: screenshot tour of all 13 pages + flow test with a real account.

### Z3 — Admin Panel (business management)
- Overview: business KPIs (MRR-style revenue from real payments, active subs,
  credit economy, user growth) with real charts; no invented series.
- Operations tables on the Z0 Table system: Users, Subscriptions, Payments
  (approve/reject flow with confirm + audit note), Credits (grant/adjust with
  reason), Finance — server-side pagination, filters, CSV export.
- Telegram ops page kept and polished (diagnostics, webhook, menu button).
- Settings: plan/price config, feature flags, bot texts — only what the API
  supports; nothing decorative that doesn't save.
- Exit gate: screenshot tour + approve/reject and credit-grant flow tests
  against the live API (test data only).

### Z4 — Landing (conversion surface)
- Rebuild on Z0: hero with the REAL Mini App in a device frame (actual
  screenshots/recorded UI, not a drawn mock), pain-point narrative,
  how-it-works (3 steps), honest comparison table, sessions explainer,
  pricing (approved credit model only), FAQ, final CTA.
- Motion: scroll reveals, 3D tilt on the device frame, animated session
  clock — all lightweight, reduced-motion safe.
- SEO/meta: title/description/OG image, semantic HTML, performance budget
  (LCP < 2.5 s), analytics-ready.
- Exit gate: full-page screenshots (desktop + mobile), Lighthouse pass.

### Z5 — Cross-cutting hardening (final pass over all four)
- Accessibility: focus states, aria labels, contrast check, keyboard nav.
- Responsive QA matrix: 360/390/768/1280 widths × all surfaces.
- Error/offline handling unified; 404/500 pages per app in Z0 style.
- Bundle budgets enforced per app; font/image optimization.
- Final visual regression screenshot set archived in docs/ for future diffs.

## Order and dependencies

Z0 → Z1 → Z2 → Z3 → Z4 → Z5. Each phase: build → verify (tsc + vite build +
screenshot review) → commit → push to `master`. Deploy only on owner order,
per phase or batched — owner's choice at deploy time.

## Owner decisions (prepared items — not blockers for Z0/Z1)

1. Brand: keep "Neon Dark Tech" identity (plan assumes yes) or a new
   direction? A new direction changes Z0 only.
2. Portal positioning: Mini App is primary; portal stays the full-feature
   browser companion (plan assumes yes).
3. Bengali UI option for portal/mini-app: not in this program unless the
   owner asks — UI stays English per standing rule.
