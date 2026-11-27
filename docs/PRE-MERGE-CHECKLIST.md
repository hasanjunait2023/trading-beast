# Pre-merge release checklist
## Implemented in this pass
- Read-only admin wallet/ledger reconciliation (bounded results, exact integer strings).
- Effective subscription selection and admin filters/counts based on active subscription windows; revenue grouped by currency, mixed total null.
- Canonical saved watchlist validation, max 32, deduplicate, permit clearing. Existing invalid persisted lists not silently migrated; direct Radar request semantics unchanged.
- Bounded payment input. Legacy approval remains disabled by default; no payment provider activated.
- Tests for reconciliation, subscription selection and watchlist.
## Merge gate
Latest commit CI must pass, PR conflict status reviewed, protected Radar hashes match master, no frontend changes. Check API consumer handling of nullable mixed-currency revenue total and new byCurrency field.
## Deployment gate (separate)
Inspect existing production database migration history; backup and rehearse restoration, plan incremental changes if tables already exist; run reconciliation read-only. Verify secrets rotation, DNS/HTTPS, proxy settings, bot webhook/menu, smoke tests and load test. Initial migration is only safe for empty database. Do not blindly baseline.
## Still outstanding
Verified billing catalog/Stars, payment lifecycle/audit, session revocation and initData replay controls, Telegram durable delivery, per-user limits and pagination for all history endpoints, database backup automation, logging/monitoring, data retention policy and independent trading modules. Original workflow JSON fixture comparison not performed. No production DB access or deployment verification. No automatic balance repair.
