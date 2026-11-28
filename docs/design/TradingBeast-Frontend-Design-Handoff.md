# TradingBeast Frontend Design Handoff

28 November 2026 · Responsive web portal and Telegram Mini App  
UI language: English. Product name: **TradingBeast**. The primary product workflow is **Session Focus Radar**. Repo baseline: [master @ 24537bc](https://github.com/hasanjunait2023/trading-beast/commit/24537bcf0abd533238afb820a27fd38ce1b30f59).

This handoff covers the authenticated trading workspace, entry and account flows. The repo's existing admin and marketing-site workstreams remain in its A-to-Z plan. TradingView is a charting integration and external destination within the original TradingBeast design. The supplied attachment is a visual reference. No standalone API specification was attached, so the checked-in routes and types below are the basis for implementation. Images are layout studies, with illustrative visual values. Product screens show verified API results or meaningful empty/unavailable states. Use this document for exact behavior where it differs from the images. Normalize generated navigation, logo variations, status-bar chrome, extra CTA copy and any sample financial values to the repo's brand assets and the contracts here. The screen previews are shown as individual images in the design delivery.

## 1. Scope and release decisions

| Phase | Deliver | Dependencies |
|---|---|---|
| Z0 Foundation | Shared theme, app shell, primitive library, semantic states, internal style guide | Preserve repo's Neon Dark Tech theme as the dark variant. Apply the new reference-led emerald/mint system as the proposed default light theme. Keep theme preference and host integration. |
| Z1 Mini App | Radar-first home, watchlist, credits, referrals, profile/settings. Add read-only session clock and explicit run confirmation using shared views. | Signed initData, existing Telegram API route, API-backed pricing in credits. Day-one Mini App navigation keeps its existing five destinations (Radar, Watchlist, Credits, Referral, Profile) until the full daily workflow is released. |
| Z2 Responsive web | Login, home, markets, pair evidence, watchlist, credits, clock, membership, billing, payment history, referrals, settings, support, onboarding and 404. | Shared page layouts and route aliases. Chart panel renders a state or external link until candle API and display rights are available. |
| Expansion A | Plan, risk tools, currency strength and heatmap | API contracts, market/contract metadata and persistence. |
| Expansion B | Journal and editor, Calendar, Alerts, full five-tab daily workflow | Owner-scoped data APIs, event provider, Telegram notification preferences and delivery. |
| Expansion C | Correlations and exposure, Strategy Lab | Synchronized instrument history and exposure inputs. Strategy rules, 3m data and research validation before enabling strategy functions. |

One responsive product and shared domain logic. Keep `frontend/mini-app` and `frontend/user-portal` as thin host entry points initially and share primitives through `frontend/shared`. A browser user does not require the Telegram JavaScript bridge. The signed Telegram identity and browser login code identify the same account through the current backend.

## 2. Design system and responsive behavior

| Token or pattern | Implementation |
|---|---|
| Light | Canvas `#F5FAF8`, surface `#FFFFFF`, text `#101D2C`, muted text `#4C625D`, border `#D7E5DF`, mint accent surface `#E5F5EF`, primary action `#00664B`, hero `#054333` → `#007959`. Use dark navy for standard copy, white on emerald. |
| Dark | Reuse repo dark-theme tokens for canvas, surfaces and indigo highlights; pair overlays/statuses use semantic tokens with accessible contrast on both themes. Respect Telegram theme/system defaults, then an explicit product preference when available. |
| Type | Prefer existing self-hosted font assets after checking availability. Approximate 28–32 px page title, 18–20 px group titles, 14–16 px body, minimum 12 px captions, tabular numerals for quotes/credits. |
| Geometry | 4/8/12/16/24/32 spacing, 16px cards, 12px inputs, 44px minimum tap target, quiet borders. Small badges have accompanying text. |
| Market semantics | Focus dark teal, Watch ochre, Avoid muted burgundy, Unavailable slate. Separate rank from directional bias. Label Bullish/Bearish/Neutral with text and optional arrow. Score renders as points out of 100 and market data timestamp appears near evidence. Where the underlying API only exposes a score and indicator flags, use those flags without invented point totals. Use the checked-in TradingBeast brand mark across all screens. |
| Small viewports | At 360–639 px use 16 px leading/trailing gutters, single-column cards, sticky lower nav and bottom sheets for short secondary choices. Focus sheets move CTA above keyboard. Use safe-area inset in the available space and test phone/webview. Horizontal scroll is limited to chart or deliberately labeled market tables. |
| Tablet | At 640–1023 px use 24 px gutters and a compact nav rail or bottom nav based on host. Pair evidence moves below chart at narrow widths. |
| Desktop | At 1024 px and up use ~224 px left sidebar and sticky top bar, flexible main grid and optional 300–340 px contextual rail. Radar result becomes a table; chart has a wider canvas; form content stays readable around 640 px. At 1280+ keep session and wallet in top bar. |
| Motion | 120–200ms transitions, modest hover depth for selected surfaces, explicit focus-visible styles, honor reduced motion. Price/score updates use static text or restrained highlight. |
| Common components | AppShell, Sidebar, BottomNav, PageHeader, Button, FormField, Tabs, Modal/Sheet, Toast, StatusPill, CreditPill, SessionBadge, PairRow, RankTable, ScoreEvidence, DataFreshness, ChartPanel, Skeleton and Empty/Error/Unavailable states. |

Expanded small-screen navigation: Home / Markets / Plan / Journal / More. During early releases, only show enabled destinations. More groups Watchlist, Session Clock, Calendar, Alerts, Risk Tools, Settings, Membership, Referrals and Help as they become available. Use active state plus label. For desktop use equivalent destinations and optional keyboard-accessible search; search only permitted links/catalog entries, with no paid action on Enter when browsing.

## 3. Individual screens

Numbers correspond to the individual design studies. Desktop studies 28 and 29 show how Markets and Pair Detail adapt to widescreen. Route slugs below are target routes. Keep existing shares, web URLs and Telegram actions working through aliases or through existing entry mapping. UI actions only appear when their dependencies ship.

| Design | Route or state | Layout and primary behavior | Data and notable edge cases |
|---|---|---|---|
| 01 Sign in | `/login` | Telegram host auto-connects once; browser shows Open Telegram bot, `/login` instruction, one-time-code input and Sign in. | Signed `initData` or a one-time 64-hex code. Browser-specific 01B study is the implementation reference. Expired code sends the user back to the bot for a fresh one. |
| 02 Setup | `/app/setup` | Choose timezone, preferred sessions, starter symbols, opt-in; Finish setup opens Home. Skippable, with a return path via Settings. | Save only supported fields. Watchlist persisted with existing route. Local presentation timezone only with clear device scope until a server preference exists. Alerts default off. |
| 03 Home | `/app` | Session, next transition, credit pill, last available shortlist, Open Radar; later link to plan and events. | Read clock and balance without a paid run. Without a previously returned result show No scan yet. Avoid live language on old results. Desktop may add recent runs once a history endpoint exists. |
| 04 Markets | `/app/markets` | Session selector, search, scope, result filters, pair list/table and distinct Run Radar action. Preserve filters on Back. | Filters inspect stored results; session change doesn't trigger a paid run. Catalog allows lookup without ranking unreturned symbols. Unranked differs from Unavailable. |
| 05 Pair Detail | `/app/markets/:symbol` | Symbol, score, bias, session; 15m/1H/4H chart controls when available; OR, ADR, ATR, EMA, RSI, evidence; optional watchlist and plan. | Evidence from selected result. No standalone live API yet. Chart/score contribution numbers in art are layout placeholders. Show explicit fallback for reload/deep links. |
| 06 Session Clock | `/app/sessions` | Active windows, overlap, next open, viewport timeline and timezone. | Render backend epoch seconds with selected IANA zone. Clock OR end is a time boundary. Actual candle progress needs verified counts. Standard FX week policy is not a holiday calendar. |
| 07 Currency Strength | `/app/markets/strength` | Timeframe tabs, eight signed bars, coverage, heatmap view with keyboard-accessible cells. | Needs currency strength API. Pair-level `win*` values are not equivalent to currency-level strength. Show timeframe unavailable if coverage falls below configured limit. |
| 08 Watchlist | `/app/watchlist` | View, add, remove, reorder; editing uses accessible up/down controls alongside drag if needed. | From `/user/me` and instrument catalog. Save via full array update, serialize writes, restore prior list on failure. Only annotate with scores/sparklines if evidence exists. |
| 09 Plan | `/app/plan` | Session and draft status, shortlist and pinned evidence, checklist, invalidation, risk notes, Save plan. | Owner-scoped plan API. Keep draft on validation error or conflict. Snapshot linkage records source time. Unavailable event feed displays Unknown. |
| 10 Risk Tools | `/app/tools` | Position Size, Pip, R:R, Margin and Recovery tabs; inputs and named output units. | Release after calculator semantics and contract metadata are verified. For missing conversion/lot/tick metadata, render unavailable; no generic lot defaults. |
| 11 Journal | `/app/journal` | Date range, trade rows, closed count and R summary, Add Trade. | Owner-scoped API, pagination, real entries only. Undefined initial risk gives unavailable R; open and closed trades remain distinguishable. |
| 12 Calendar | `/app/calendar` | Day/week, currency, impact, grouped time rows, actual/forecast/previous. | Needs provider/API. Pending release shows em dash. Keep provider time, revision timestamp and timezone. |
| 13 Alerts | `/app/alerts` | Telegram delivery status, rule toggles, quiet hours, Create Alert sheet. | Telegram worker presence alone does not supply a user rules API. Only show successful save after server confirmation. |
| 14 More | `/app/more` | Account header and working grouped links. | Local navigation plus account state. Respect rollout/host rules. |
| 15 Settings / Profile | `/app/settings` | Profile, locale/timezone, settings dependencies, session sign-out. | Current profile is read-only beyond exposed mutations. Existing logout/logout-all routes. No second linking action if already connected. |
| 16 Membership | `/app/membership` | Current tier, subscription status/renewal, available offerings, payment link. | Profile is source of current entitlement. Use approved catalog/prices. Preserve `/plans` and `/subscription` entries and intent even if rendered by same component. |
| 17 Help | `/app/help` | Searchable FAQs for score, data age, account, credits and support. | Static vetted content and configured support link. No unconfigured support destinations. |
| 18 Trade Editor | `/app/journal/new`, edit variant `/app/journal/:id/edit` | Symbol, side, time, quantity/unit, prices, fees, initial risk, notes and Save. | Need journal mutations. Field errors adjacent to controls; potential data loss protection on exit; preserve decimal precision. |
| 19 Correlations & Exposure | `/app/markets/correlations` | Period/timeframe, matrix, sample count, currency exposure and long/short context. | Proposed correlation and exposure APIs. Matrix uses synchronized closed returns. Potential overlap signaled only from known exposures. |
| 20 Strategy Lab | `/app/lab` | Cheese / Set / TPF profiles, method status, replay and AI brief once gated. | Owner-approved rule definitions, versioned research and data prerequisites. 3m enablement separate from 15m scanning. |
| 21 Credits | `/app/credits` | Balance, daily grant, scan price, next UTC grant, optional Open Radar. | Read balance/grant/cost from API. Do not add transaction history, purchase or transfer until explicitly supported. |
| 22 Run Radar | `/app/markets/run` or equivalent sheet | Show cost and remaining balance, selected session, scope, explicit Confirm. Use working/success/error states. | Paid POST only on confirmation. Read-only navigation is free. Preserve request key/body on ambiguous retry. |
| 23 Payment History | `/app/membership/payments` | Rows with date, method, amount/currency and verification status. | Paginated read API. Format minor units based on currency. Hide sensitive references by default. |
| 24 Payment Submission | `/app/membership/checkout` | Configured plan/order summary, supported provider, reference field and review. | Existing web manual submission can return pending. Respect offer and payment-channel availability. Telegram digital purchase flow requires Stars integration. |
| 25 Payment Submitted | `/app/membership/payment-submitted` | Pending verification, history and membership links. | Confirm result from server response or history. Direct entry must never imply approval. Map old `/payment/success` to current state. |
| 26 Referrals | `/app/referrals` | Personal code, share/copy, referral status list and fallback for unsupported share. | Profile code plus paginated referrals. Use configured bot/domain link and display only approved reward terms. |
| 27 Page Not Found | catchall | Clear error and Back to Home. | Authenticated Home or browser login. Avoid returning user to an invalid route. |
| 28 Desktop Markets | same as 04 | Left rail, center radar table, right clock/watchlist, visible run action. | Share data and filters with 04. Keyboard navigation and responsive table. |
| 29 Desktop Pair Detail | same as 05 | Chart workspace plus score evidence rail and Open in TradingView. | Share state and routes with 05. Honor validated provider symbol mapping and verified data provenance. |

404 and unknown Telegram deep links have separate handling. Do not expose a paid confirmation via untrusted deep-link fields. Auth links use an allowlisted internal return destination. Existing aliases include `/dashboard`, `/focus`, `/watchlist`, `/settings`, `/help`, `/plans`, `/subscription`, `/referral`, `/payments`, `/billing` and `/payment/success`. Reconcile each path's existing semantics in its page before wiring redirects.

## 4. Existing API contract at the pinned code baseline

Source: [analysis routes](https://github.com/hasanjunait2023/trading-beast/blob/24537bcf0abd533238afb820a27fd38ce1b30f59/backend/src/routes/analysis.ts), [user routes](https://github.com/hasanjunait2023/trading-beast/blob/24537bcf0abd533238afb820a27fd38ce1b30f59/backend/src/routes/user.ts), [auth routes](https://github.com/hasanjunait2023/trading-beast/blob/24537bcf0abd533238afb820a27fd38ce1b30f59/backend/src/routes/auth.ts). Status in this handoff means route found in source. Runtime or production availability requires staging verification.

| Endpoint | Shape and UI behavior |
|---|---|
| POST `/api/auth/telegram` | `{initData,referralCode?}` → token and account. Pass the raw Telegram-signed payload on supported hosts. |
| POST `/api/auth/code` | `{code}` → token and account. Telegram bot `/login` issues a one-time code valid for five minutes. |
| POST `/api/auth/refresh`, `/logout`, `/logout-all` under auth | Standard auth lifecycle. Single refresh in flight where supported. If session cannot refresh, clear account-scoped state and return to login. |
| GET `/api/user/me` | Profile, effective tier, watchlist, subscription, recent payments and referral info. |
| GET `/api/user/credits` | `{balance,dailyGrant,radarCost}`; implementation uses 10 daily and 10 per scan at baseline. UTC accrual on read; browser must not compute spendable balance from local time. |
| GET `/api/analysis/sessions` | `{asOf,fxWeekOpen,selected,active,overlap,sessions,calendarPolicy}`. Session rows include `zone, sessionStartTs, sessionEndTs, orEndTs, nextStartTs, orDone, active`. Seconds → milliseconds at boundary. |
| GET `/api/analysis/pairs` | Authenticated raw symbol label catalog. Use a single normalization strategy consistent with backend watchlist validation. Preserve code/display distinction. Validate coverage before using the intended 32-symbol universe as a UI denominator. |
| POST `/api/analysis/focus` | Body `{session?,watchlist?}`, header `Idempotency-Key`. Returns `FocusResult` with timestamp, result lists and quality fields. Omitted watchlist can inherit saved list. Treat explicit empty input and omitted input according to pinned service tests. |
| GET `/api/analysis/focus/:session` | Currently HTTP 405. Do not use as a read or auto-fallback to a paid POST. Current session result can live in account-scoped in-memory state. Persisted history/read endpoint is a future addition. |
| PATCH `/api/user/watchlist` | `{watchlist:string[]}` normalized on server. Validate and show server-returned list. |
| GET `/api/user/payments`, `/referrals` | Paginated lists with `meta.page` and `meta.limit`. Handle repeat requests and empty last page. |
| POST `/api/user/payment` | Integer minor-unit amount, currency, approved method, transaction ID, optional HTTPS screenshot URL per server API. UI amount comes from approved offer. Current create returns pending. |
| Errors | Existing response envelope is generally `{success,data,error?,details?,meta?}`. Normalize errors centrally. Use header X-Request-Id where available; no raw credentials, auth payloads or sensitive payment refs in logs. |

### Radar view model

`FocusResult` carries `session,timestamp,scope,focus,watch,avoid,warnings,marketClosed,closedAssets,skippedCount,orReady`. Use list membership for status. Pair evidence supplies `pair,kind,name,dec,score,bias,stale,d4,d1,d15,rsi,atr15,adrPct,pdh,pdl,orHigh,orLow,orHave,orConfirmed,orLive,obstacle,roomATR,ts4,ts1,ts15` and penalty flags. Parse raw epoch timestamp units consistently. Map BUY/SELL to Bullish/Bearish analytical bias. UI must distinguish scan timestamp, candle timestamp, missing data and market closure. Avoid showing breakdown point values absent from payload. Stale quotes should show age when known. Do not convert the numeric score to an implied success rate.

The session clock uses IANA zones. The analysis service has a separate explicit-session start mapping based on Dhaka clock hours. Treat score and opening-range timing as analysis evidence, avoid inferring it from the clock, and reconcile the backend before promising consistent session boundaries.

### Paid action and persistence

1. Before confirming, show server cost and balance. Pending state disables repeat activation and keeps inputs fixed for the active run. Generate one request UUID per accepted intent.
2. For an ambiguous timeout/network loss, reuse the same key and canonical payload only on explicit recovery. Server can replay successes for the same key; 409 can mean already submitted or mismatched input. Surface the appropriate state and refresh balance. Do not launch a fresh run automatically. Do not promise a refund until the server response or reconciled balance confirms it.
3. Handle 402 through credits explanation; handle 429 with wait/retry; handle 503 with unavailable state and retained last scan if available. Refresh balance after scan completion/failure. Never infer spendable credits from animation.
4. Store successful result in memory keyed by account, session and scope; clear on logout/identity change. A route visit, search, filter, back navigation or direct link never spends credits. If API history ships, key evidence by snapshot/run ID and link through it.

## 5. Proposed contracts to unblock later screens

Use the current `/api` client envelope, with an explicit versioning decision before introducing an additional prefix. These paths are proposed and need backend owner agreement. Test/demo fixtures must be isolated from product data.

| Proposed capability | Minimum response |
|---|---|
| Latest result / history | Owner-scoped completed run ID, session, scope, as-of, result/pagination and quality. Read-only and zero credits. |
| Pair details and candles | Validated instrument ID, timeframe, sorted unique UTC candle opens and decimal OHLC, closed flag, as-of/source, price precision, timezone/quality. Pair evidence endpoint links the run ID and engine version. |
| Currency strength | Session/timeframe, signed values per currency, eligible/observed coverage, timestamp, methodology version. |
| Plan and preferences | Owner identity from auth, user timezone, pinned run IDs, checklist, draft status and optimistic-concurrency version. |
| Journal and exposure | Trade inputs, discipline tags, P&L/currency/risk provenance, owner-scoped pagination, explicit partial data. Exposure reports source and known coverage. |
| Position size and tools | Instrument contract, account currency, effective conversion timestamp, broker step/min/max, costs and validated rounding. Return explicit unavailable reasons. |
| Calendar and alerts | Licensed event ID and revision, zone/time, impact and values; opt-in rule status, scope, next evaluation, quiet hours and delivery feedback. |
| Billing catalog and Stars | Server-owned approved offers and amounts, request status, verified settlement and effective entitlement. Web/manual and Telegram-host capabilities modeled independently. |
| Replay and strategy research | Versioned strategy and precise rules, licensed dataset coverage, replay cut-off, assumptions and metric definitions. |

### Chart integration

Use TradingView Lightweight Charts for a custom native chart using project-supplied authorized OHLC. Lazy-load chart code. Clean up observers and chart instances on unmount. Provide accessible current OHLC and indicator summaries outside the canvas. When local candles are unavailable, existing scan evidence can still render alongside a validated `Open in TradingView` link. Build a symbol mapping table from known venue-qualified instruments, including an explicit WTI instrument decision. Omit the link where venue/symbol is unknown. The screenshot's chart layouts are composition references. Only render timeframes and overlays supported by actual data. Carry attribution per [Lightweight Charts docs](https://tradingview.github.io/lightweight-charts/docs). Do not use 15m data to simulate 3m. TradingView display of an external symbol may differ from the scan source; label each.

### Host integration

Use a thin injected Telegram adapter for signed initData, safe/content-safe insets, back button, host theme and viewport changes. Use browser-native navigation/default layout outside Telegram. Register and remove adapter listeners on mount/unmount. Standardize recoverable auth with a compact call to action. All state associated with the logged-in identity is cleared on logout. For digital goods in Mini App, follow [Telegram Stars](https://core.telegram.org/bots/payments-stars). Bridge reference: [Telegram Mini Apps](https://core.telegram.org/bots/webapps).

## 6. Agent execution order and acceptance

1. Fetch the current branch and record SHA. Inspect `frontend/shared`, both frontend entry points, the existing client/auth/Telegram adapter, current payment flow, and pinned backend tests. Diff against this handoff. Preserve compatible route aliases and navigation. Run baseline build and lint in each frontend with its own lockfile.
2. Build shared theme and representative internal style page. Verify light and dark, loading, unavailable, empty, disconnected, validation failure and keyboard interactions. Confirm contrast and target sizes. Use host settings driven by reliable data or local capability.
3. Ship the Mini App core surfaces first and connect the credit-backed Radar flow. Define a shared `RadarResult` adapter and unit-test field normalization, statuses and timestamp units. Verify browser and Telegram login on staging.
4. Build responsive web routes and reproduce real-state screenshots at 360, 390, 768 and 1280px. Validate deep links, direct reload and preserved routes. The widened layouts in 28/29 apply to all web screens using section-level layout rules in §2.
5. Add proposal-only capabilities behind real route availability and release flags, in dependency order. Ensure production routing and navigation reflect available capabilities. Run clean builds before every phase commit; follow repository push policy and obtain explicit deployment authorization per repository plan.

| Acceptance case | Expected |
|---|---|
| Opening Home, Markets or Session Clock | Zero paid POSTs. An empty result prompts informed confirmation. |
| Double press, cross-tab requests and ambiguous network failure | One logical intent per key; no automatic second debit; consistent wallet after reconciliation. |
| Scan with partial data / market closure | Clearly labeled stale, unranked, unavailable, provisional and closed states as appropriate. |
| Opening-range clock vs actual candles | Clock boundary does not imply candle coverage or confirmation. |
| Pair detail route refresh without an accessible run | Shows recovery info and available external-chart action. No fabricated points or candles. |
| Code/tokens, account switch, offline | Expired or invalid auth recoverable; data cleared on switch; no paid actions while offline. |
| Payment and tier | Server-approved entitlement only. Pending, rejected and approved states distinct. |
| Mobile, Telegram and desktop | Keyboard focus, screen-reader labels, screen resize, back behavior, safe area, scroll preservation and no hidden CTA. Capture standard-size screenshots from the functional app. |
| Performance | Lazy chart/analysis screens, measure Mini App initial JS against repo target ≤200 KB with measurement format explicitly logged, test mid-range Android over 4G. No blocking font import. |
| Production data | No generated example prices, results, charts, payment credentials, journals or market histories in the runtime interface. |

### Prompt for the implementation agent

> Implement TradingBeast's responsive user workspace using this handoff and the committed A-to-Z plan. First verify HEAD and actual frontend/API contracts. Implement shared UI primitives within the existing repository, then the Mini App core and responsive web core. Use the page screenshots for layout and the handoff for behavior. Reuse the real authenticated API, preserve route compatibility and treat Radar confirmation as an idempotent credit-spending mutation. Add chart, journal, plans, calendar and other screens only when their relevant data contracts are available or show an honest unavailable view where the route is needed. Verify every released page in light and dark theme, on phone/Telegram and desktop, and deliver build results and screenshots. Follow the repository's deployment rules.
