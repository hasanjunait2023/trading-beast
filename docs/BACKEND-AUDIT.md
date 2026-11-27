# Backend audit — 2026-11-28
Scope: static source review of backend, Prisma schema, credits, registration, auth, admin, Telegram, Docker and deployment; no frontend changes. Core Radar files locked byte-for-byte against master (analysis-engine.ts 7b72dbd615c1dd31ab5b2ee7b99716fb198f363a; analysis.ts 540c773578600cd4360518be51f8d1d00154bb0d). Original source JSON parity not verified.
## Remediation committed
- Express 4 async handler errors routed to safe error middleware, invalid JSON/size/conflicts mapped to HTTP responses.
- Shared Prisma client across non-core modules; legacy Radar retains its own client by design.
- Atomic bot/Mini App registration with one account, wallet, initial ledger grant and referral; serializable retry on conflicts. Existing users accrue lazily as before.
- Atomic admin tier changes replace old temp-id behavior; paid tier requires future expiry. Manual payment approval disabled by default until verified plan catalog exists (ENABLE_LEGACY_PAYMENT_APPROVAL opt-in is legacy only; do not enable without approved controls).
- Docker build from repository root with shared package, pnpm lock, OpenSSL, non-root runtime and secret exclusions. Compose readiness uses Node fetch; explicit CORS and proxy configuration, graceful shutdown.
- Initial migration and DB integrity constraints, entitlement/expiry indexes, PostgreSQL integration tests and GitHub Actions verification.
- Telegram callback restricted to own private chat, message API HTTP/JSON success checked and timeout added. Some message formatting and delivery retry/outbox remain.
## Database rollout
New empty PostgreSQL: run prisma migrate deploy, not db push. Migration is handwritten and must pass CI plus schema comparison. EXISTING DB: back up and inventory tables/indexes/constraints and schema migration history; generate reviewed incremental migration or baseline only after exact schema parity. Never blindly apply initial migration or mark applied to a mismatching DB. Run restore rehearsal. Current live DB not inspected. App does not auto-run migration. Configure DATABASE_URL, JWT_SECRET, FRONTEND_URL, ADMIN_FRONTEND_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_MINI_APP_URL and ADMIN_TELEGRAM_IDS as secrets/environment; set TRUST_PROXY_HOPS only after verified proxy topology.
## Outstanding release blockers
1. CI build/migration/integration results, actual production migration plan and backup/restore validation.
2. Original n8n JSON regression fixtures and exact output comparisons; hash protects two files but not transitive dependencies or external provider changes.
3. JWT lifecycle/revocation, initData replay policy, login code cleanup/rate limit, dedicated webhook rate limit and durable Telegram update/outbox handling. Successful Radar calculation can still be billed if bot delivery fails; stored result allows replay but automatic retry not yet guaranteed.
4. Paid plans/price catalog, currency-specific revenue aggregation, verified payment events, provider-specific transaction keys, subscription renewals, refund/entitlement audit trail. Admin metrics still use legacy user.tier and mix currency amounts; not authoritative.
5. User watchlist validation and canonical casing, bounded pagination for remaining lists, current subscription display consistency, API/OpenAPI integration with separately maintained frontend.
6. Credit ledger reconciliation/reporting and retention; older debits without RadarRun cannot be automatically recovered. Five-minute request expiry does not cancel upstream computation. No production load test yet.
7. Independent market data cache remains in-memory; no core integration; licensed feed, persistence, currency engine and other modules are future work. Legacy Radar's provider availability/freshness semantics remain protected.
8. Deployment: verify Coolify access, routing/HTTPS, exact proxy hops, secrets rotation, webhook, bot menu, DB migration and end-to-end tests. No live deployment performed.
## CI release gate
GitHub Actions checks core file hashes, frozen dependencies, Prisma validate/generate/migrate, TypeScript build, Vitest incl real Postgres integration, Docker build. Do not merge until checks reviewed; workflow not a guarantee of production readiness. No secrets in repo.
