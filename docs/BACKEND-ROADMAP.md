# TradingBeast Backend Engineering
Frontend is maintained separately; do not modify frontend directories. Keep existing API response envelopes compatible. Work in modular Express/TypeScript/Prisma/PostgreSQL; no microservice split until measured need.
## Phases
B01 durable credit lifecycle, authenticated API, migration and DB integration tests.
B02 normalized candle provider interface, bounded concurrent fetches, shared snapshot store, closed-candle validation, provenance and freshness. Commercial feed license gate.
B03 timezone-aware Tokyo/London/New York sessions and opening-range tests incl DST/weekends.
B04 currency power, momentum, missing-data coverage and correlation.
B05 versioned explainable radar score; walk-forward validation against baselines, realistic costs, no profit claims.
B06 correlation and exposure; B07 risk tools; B08 economic calendar; B09 alerts; B10 strategy/replay/backtesting; B11 journal; B12 AI explanations grounded in snapshots.
## B01 API contract
POST /api/analysis/focus bearer token, optional Idempotency-Key (client should generate and reuse on retry), body {session?,watchlist?}. Existing response envelope retained. 402 insufficient credits, 409 running/duplicate or conflicting key, 503 expired run. Successful replay returns stored response without debit. GET /api/user/credits unchanged. No new frontend code. A different key is a new charge.
RadarRun and debit created atomically, successful result stored, failure refund and status update atomic. Recovery checks expired runs at startup and every minute, 5-minute deadline, max 100 per pass. Database migration required before deployment. Existing ledger debits predating RadarRun are not retroactively recovered. Deadline is not cancellation of upstream requests; future worker should use fencing/abort signals. No retention policy yet.
## Release gate
Build and Prisma validate/generate, reviewed migration (existing databases require baseline strategy), real Postgres integration tests: parallel spends, same-key retries, mismatched payload, process termination, recovery race, refund exactly once, authorization, stale/empty data. Do not deploy until verified. Full API OpenAPI contract and frontend integration tests remain pending.
