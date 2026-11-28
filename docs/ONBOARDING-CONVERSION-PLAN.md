# TradingBeast — Onboarding + Conversion chapter plan

Status: backend implemented on `feat/backend-onboarding` (2026-11-28). Frontend
teams build against the API contract in §7 in parallel.
Owner decisions behind this chapter (Jafrul, 2026-11-28 ~18:52 +06):

- The owner's Telegram user id is the SaaS admin identity. It is configured
  **only** in the VPS environment variable `ADMIN_TELEGRAM_IDS` — never in the
  repo, never in code, never in this document.
- A customer who opens the app with Telegram is configured automatically; the
  onboarding then asks for **email + phone** and has them **create a password**.
- First-time users receive a **100-credit welcome grant**, prefilled and usable
  immediately (one Radar run costs 10, so the grant funds 10 runs).
- The Radar is the product's core value; the onboarding and the premium
  surfaces exist to get the user to their first successful Radar run fast and
  to convert satisfied free users to the premium packages (revenue).
- Users must be able to view **TradingView charts inside the app** via
  TradingView's free embeddable widgets.

---

## 1. Identity model (before this chapter)

- Every account is created exactly once, in `registerUser`
  (`backend/src/services/users.ts`). Both entry paths funnel through it:
  - Telegram Mini App / initData login — `POST /api/auth/telegram`
  - Telegram bot `/start` / `/login` — the bot registers the user, then issues
    a one-time browser code redeemed at `POST /api/auth/code`
- Login issues a JWT bound to a revocable server-side `AuthSession`
  (30 days, logout / logout-all supported).
- Admin gating is `requireAdmin`: the request's `telegramId` must appear in
  the `ADMIN_TELEGRAM_IDS` env var (comma-separated), read per-request from
  the environment only. Verified in code 2026-11-28; the owner's id lives on
  the VPS in `.env` and nowhere else.

## 2. What this chapter adds

### 2.1 Password identity (additive, optional-but-onboarded)

`User` gains (migration `20261128070000_onboarding_profile`, all nullable,
fully additive — existing rows and the Telegram-only flow are untouched):

| Column | Type | Notes |
| --- | --- | --- |
| `email` | `TEXT`, unique, nullable | Stored lower-cased/trimmed. Unique index `User_email_key`. |
| `phone` | `TEXT`, nullable | Stored in E.164 (`+8801…` etc.). |
| `passwordHash` | `TEXT`, nullable | bcrypt hash (cost 12, `bcryptjs` — pure JS, no native build step in the Alpine Docker image). Plaintext is never stored, logged, or returned. |
| `profileCompletedAt` | `TIMESTAMP(3)`, nullable | Set once when onboarding profile is completed. |

Rules:

- Telegram remains the primary identity and the account-recovery root: a user
  who forgets the password re-enters via Telegram and sets a new one through
  profile completion (re-completion is allowed; it overwrites email/phone/
  password after the same validations, and an email owned by *another*
  account still conflicts with 409).
- `POST /api/auth/password-login` lets a profile-completed user sign in to the
  browser portal with email + password and returns the **same** JWT +
  AuthSession shape as the other logins.
- No user enumeration: unknown email, missing password, and wrong password
  all return the identical `401 { success:false, error:"Invalid email or password" }`,
  and a bcrypt compare runs against a dummy hash when the account does not
  exist so response timing does not leak account existence.

### 2.2 Onboarding flow (UX contract for the frontends)

1. **Open with Telegram** → initData auth (existing). The account, wallet and
   referral code are created automatically; the welcome grant (§2.3) is
   already in the wallet. No form, no friction.
2. Every auth response and `GET /api/user/me` now carry
   `profileCompleted: boolean`. While it is `false`, the apps show the
   onboarding (skippable once per session in the UI, but it keeps returning
   until done — the backend flag is the single source of truth).
3. **Step 1 — Contact:** email + phone. Validated server-side
   (`POST /api/user/profile/complete`): email format, phone in international
   format (BD numbers accepted as `01XXXXXXXXX` or `8801XXXXXXXXX` and
   normalised to `+8801XXXXXXXXX`).
4. **Step 2 — Password:** create a password (≥ 8 characters). Explained in UI
   as "for signing in from any browser, even without Telegram".
5. **Step 3 — First Radar:** the flow lands on the Radar with the 100-credit
   balance visible; the first run is one tap (10 credits). This is the
   activation moment the whole chapter is built around.
6. On success the API returns the completed profile and
   `profileCompleted: true`; the onboarding never shows again.

### 2.3 Welcome grant — 100 credits, once, idempotent

- Constant `WELCOME_CREDITS = 100` (`backend/src/services/credits.ts`).
- Granted inside the same serializable transaction that creates the user in
  `registerUser`, i.e. at the single account-creation point — both auth paths
  get it, and the "existing user" branch of `registerUser` never re-grants.
- Ledger: `CreditEntry { kind: "WELCOME_GRANT", reference: "welcome", delta: 100 }`.
  `CreditEntry` has `@@unique([userId, reference])`, so even a retried
  transaction cannot double-post; the wallet balance and the ledger sum stay
  reconciled (the credit-audit invariant).
- Composition with the existing freemium mechanics (docs/CREDIT-FREEMIUM.md):
  a new user's opening balance is **100 welcome + 10 first daily grant = 110**;
  the 10/day non-expiring daily grant continues unchanged afterwards, and a
  Radar run still costs 10.
- **Existing users are not retro-granted** (owner: "jara prothom login korbe"
  — first-login users). Accounts created before this migration keep exactly
  their current balance/ledger.

### 2.4 TradingView charts inside the app (frontend chapter, backend notes)

- Integration is TradingView's **free embeddable widgets** (Advanced Real-Time
  Chart widget / widgetembed) loaded client-side in the Pair Detail screens —
  no backend endpoint, no API key, no licence cost, and no market data passes
  through our servers.
- Symbol mapping is the only contract: our pair codes map to TradingView
  symbols as `FX:EURUSD`-style ids (strip the `/`; Gold → `TVC:GOLD`,
  Silver → `TVC:SILVER`, Oil → `TVC:USOIL`, Bitcoin → `BITSTAMP:BTCUSD`).
  The frontend keeps this map next to the instruments catalog it already
  consumes from `GET /api/analysis/instruments`.
- The widget is a *viewing* surface only. Scores, bias and evidence remain
  ours (Radar result), and the chart area must keep the freshness timestamp
  of the Radar result next to it — a live chart must never make a stale scan
  look live. If the widget fails to load (offline, blocked), the honest
  unavailable state from the reference-match chapter remains the fallback.

### 2.5 Premium conversion surfaces (product/UX, backend already supports)

Revenue target: convert free users to the premium packages. Existing backend
support this chapter relies on (no new endpoints needed):

- **Balance & cost visibility:** `GET /api/user/credits` returns
  `{ balance, dailyGrant: 10, radarCost: 10 }` — the apps show balance next to
  every Run Radar action, and the run confirmation sheet already states the
  server cost + resulting balance before any spend.
- **The paywall moment is honest:** when balance < 10, `reserveRadar` fails
  with `InsufficientCredits` and nothing is debited. That moment — not a
  timer, not a nag screen — is where the apps present the premium packages:
  "You're out of credits. Pro refills monthly + unlocks …" with the payment
  flow below.
- **Payments (existing):** `POST /api/user/payment` (bKash / Nagad / USDT,
  manual verification), `GET /api/user/payments`, membership screens already
  built. Pro/Elite monthly credit top-ups (300 / 900) stay *planned, not
  activated* per CREDIT-FREEMIUM.md until prices are validated.
- **Referral loop (existing):** each credited referral = 7 days free Pro for
  BOTH sides (verified in bot code) — the cheapest conversion channel; the
  onboarding completion screen links to the referral code.
- **Free-tier value proof before the ask:** the 100-credit welcome grant is
  sized for ~10 Radar runs — enough sessions for the user to see the Radar be
  right before any paywall appears. Conversion copy must never promise
  signals or profits; the product is preparation/analysis only.

## 3. Security pass (this chapter's surface)

- **Rate limiting:** the global `/api/auth` limiter (30 req / 15 min / IP)
  already covers all auth routes. `POST /api/auth/password-login` adds a
  stricter per-route limiter: **10 attempts / 15 min per (IP + email)**,
  returning `429 { success:false, error:"Too many requests" }`.
- **Passwords:** bcrypt cost 12; minimum 8 characters (zod); the hash is
  never selected into any API response (`GET /api/user/profile` returns
  `hasPassword: boolean` only); passwords and hashes are never logged
  (request logger records method/path/status/duration only).
- **Data minimisation:** email/phone are returned only on the owner's own
  authenticated endpoints (`/api/user/profile`, `/api/user/me` does not expose
  them beyond the completion flag). No other user's email/phone is reachable:
  profile endpoints are scoped to `req.user.id` from the verified session.
- **Email uniqueness** is enforced by the DB unique index as well as the
  service check; a race surfaces as the same `409 EMAIL_TAKEN`.
- **Sessions:** password login creates a normal revocable `AuthSession`;
  logout / logout-all revoke it exactly like Telegram logins.
- **Admin:** `ADMIN_TELEGRAM_IDS` stays env-only on the VPS; nothing in this
  chapter reads, stores, or returns it.
- **JWT:** unchanged — HS256, secret ≥ 32 chars enforced at boot, `jti` bound
  to the server session.

## 4. API contract (§7 summary — the frontends build against this)

All responses use the house envelope `{ success: true, data: … }` /
`{ success: false, error: "…" }`.

### `GET /api/user/profile` (auth required)

```json
{ "success": true, "data": {
  "email": "user@example.com",          // string | null
  "phone": "+8801712345678",            // string | null (E.164)
  "profileCompleted": true,             // boolean — THE onboarding flag
  "profileCompletedAt": "2026-11-28T…Z",// string | null (ISO)
  "hasPassword": true                   // boolean — hash never exposed
} }
```

### `POST /api/user/profile/complete` (auth required)

Request: `{ "email": "user@example.com", "phone": "+8801712345678", "password": "≥8 chars" }`
(`phone` also accepts `01712345678` / `8801712345678` and is stored as E.164.)

- `200` → same shape as `GET /api/user/profile`, with `profileCompleted: true`.
- `400 { success:false, error:"Invalid profile data", details:[…zod issues] }`
  for bad email format, bad phone, or password < 8 chars.
- `409 { success:false, error:"EMAIL_TAKEN" }` when the email belongs to a
  different account.

### `POST /api/auth/password-login` (public, rate-limited)

Request: `{ "email": "user@example.com", "password": "…" }`

- `200` → identical shape to `POST /api/auth/code` success:
  `{ success:true, data:{ token, user:{ id, telegramId, username, firstName,
  tier, referralCode, watchlist, languageCode, profileCompleted } } }`
- `400 { success:false, error:"Invalid payload" }` for malformed input.
- `401 { success:false, error:"Invalid email or password" }` — the ONLY
  credential-failure response (unknown email, no password set, wrong password).
- `429 { success:false, error:"Too many requests" }` past 10 attempts /
  15 min per IP+email (the global auth limiter also applies).

### Changed existing responses

- `POST /api/auth/telegram`, `POST /api/auth/code`, and `GET /api/user/me`
  user objects gain `profileCompleted: boolean` (additive; no field removed
  or renamed).
- New-user wallets open at **110** (100 welcome + 10 daily) instead of 10.

## 5. Tests

- Unit (`profile.test.ts`, `passwords.test.ts`): email/phone validation and
  BD normalisation, bcrypt hash/verify round-trip, wrong-password rejection.
- Integration (gated `RUN_DB_INTEGRATION=1`, same pattern as the existing
  credit suites — `onboarding.integration.test.ts`): new user balance is
  100 + daily grant with exactly one `WELCOME_GRANT` ledger entry; re-login /
  repeat `registerUser` does not double-grant; daily accrual still works on
  top; profile completion persists + sets the flag; email conflict raises the
  409 path; password login succeeds with the right password and fails
  generically otherwise.
- The pre-existing gated expectation in `credits.integration.test.ts`
  (post-register balance) is updated from 10 → welcome + daily.
