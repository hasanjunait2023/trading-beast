# TradingBeast backend roadmap (revised by product owner)
## Non-negotiable: existing Radar is the core product
Preserve original Radar algorithm, calculations, input data treatment, session rules, thresholds, ranking, FOCUS/WATCH/AVOID and existing output JSON. No replacement, refactor or new data pipeline for the core without explicit owner approval. Frontend is maintained elsewhere.
Canonical baseline: current master backend/src/services/analysis-engine.ts (Git blob 7b72dbd615c1dd31ab5b2ee7b99716fb198f363a), backend/src/services/analysis.ts (Git blob 540c773578600cd4360518be51f8d1d00154bb0d). These two files were restored byte-for-byte on this development branch. Original JSON workflow remains the conceptual reference; this record does not assert parity with an unreviewed source JSON.
Infrastructure may wrap the existing Radar for auth, credits, idempotency and recovery, but must not mutate its response data or change selection/scoring/session logic. Test compatibility before merging. 
## Independent extension roadmap
1. Credit reliability, DB migration, integration tests (outside core).
2. Independent market data provider/cache for new features only. Never route the core Radar through it without approval.
3. Independent market clock, session overlap and opening-range insights (no credit charge for clock); distinct from Radar session rules.
4. Currency power, momentum and divergence dashboard, with separate APIs.
5. Correlation, exposure and risk calculators.
6. Economic calendar and alerts.
7. Journal and performance analytics.
8. Strategy lab and backtesting (no changes to core Radar).
9. AI explanations and trading copilot, grounded in existing results and standalone feature data.
10. Billing and entitlements, shared wallet and Telegram integration.
## Integration constraints
Existing POST /api/analysis/focus successful response envelope and payload stay intact. New modules use separate routes and schemas. No automatic change to Radar ranking or inputs. Existing B02/B03 docs are historical implementation records; their previous core integration was reverted. The independent session endpoint remains available on the branch. New modules must be tested independently.
## Release gate
Build, Prisma validation, migration strategy, PostgreSQL integration tests, snapshot regression comparison against canonical Radar using identical fixture data and time. Do not merge unverified changes. Never assert historical JSON parity until original workflow is available and compared.
