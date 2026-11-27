# TradingBeast operations
## Deployment
Take a protected offsite backup first. Run migrations with a dedicated deploy job, never automatically baseline a populated database. Inspect existing production schema against migration history. Use HTTPS, restricted DB networking, strong secrets, configured frontend origins and exact trusted proxy topology. Rotate previously shared credentials. /health is liveness; /ready checks DB access and critical tables.
## Backup
Use PostgreSQL 16 client tools, standard libpq PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSFILE and protected BACKUP_DIR. Run bash backend/scripts/backup-db.sh via external scheduler daily. Keep encrypted offsite copies; set retention based on policy. Do not pass passwords on CLI. Restore to a separate disposable DB with pg_restore --exit-on-error --no-owner --no-acl; verify migrations, user counts, ledger consistency and smoke tests. Never restore over live DB without approved recovery plan. Scheduler and production rehearsal are not configured from this branch.
## Monitoring
Collect structured JSON HTTP logs, request ID, status and duration. GET /api/admin/operations provides queue and expired-run counts; GET /api/admin/credits/reconciliation checks balances. Alert on failed deliveries, persistent expired runs, 5xx, readiness failures, DB storage and backup age. No external monitoring service configured.
## Auth
30-day fixed lifetime tracked sessions; refresh does not extend expiry. Legacy JWTs require re-login. Logout and logout-all revoke DB sessions. InitData verification still uses signed payload and 5-minute age; single-use replay protection pending. Expired sessions/codes cleaned after one day.
## Delivery
Radar completion and delivery enqueue are atomic; leased queue retries up to eight times, respects Telegram retry-after. At-least-once delivery: a network failure after Telegram accepts a message may cause duplicate display, not duplicate credit deduction. Failed jobs require operator investigation; /login and other bot commands remain synchronous. Queue retention/manual replay policy pending.
## Billing
Paid acceptance remains disabled by default. No active payment provider or final price catalogue. Do not enable legacy approval for launch.
