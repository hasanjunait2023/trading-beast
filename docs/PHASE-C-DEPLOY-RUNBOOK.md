# Phase C — Deploy Runbook (PREPARED 2026-11-28, NOT executed)

Owner approval required before running any step here. Prepared by Muse after a
read-only inspection of the live VPS + domains on 2026-11-28 ~02:35 +06.

## 0. Live state found (verified, read-only)

- **VPS** `/opt/session-focus-radar` runs the OLD `main` branch (last commit
  `0e2e57a` "Add landing page…"), containers up 11 days, all healthy:
  `sfr-backend` :3000, `sfr-user-frontend` :5173, `sfr-admin-frontend` :5174,
  `sfr-landing` :5175, `sfr-postgres`, `sfr-quickchart` :3400.
- **Caddy** (`/opt/hybrid/Caddyfile`): `tradingbeast.ecomex.cloud` → :5175
  (landing), `admin.` → :5174, `api.` → :3000. **No vhost for :5173** — the
  user portal is running but publicly unreachable.
- `https://api.tradingbeast.ecomex.cloud/health` → OK (old backend; the new
  `/api/telegram/config` correctly 404s there — Phase B is not deployed).
- The apex serves ONLY the landing SPA — `/api/*` on the apex returns landing
  HTML, so frontends must call `https://api.tradingbeast.ecomex.cloud/api`
  (build-time `VITE_API_URL`), not a relative `/api`.
- **GitHub branches:** `main` = old production line with a **GitHub Actions
  deploy workflow that auto-deploys to the VPS on every push to `main`**.
  `master` = new line (credits, Telegram security, Mini App, Phases A/B/D) —
  never deployed.
- **Bot (public info):** `@tradingbeastbyjunaitbot` —
  https://t.me/tradingbeastbyjunaitbot
- **VPS `.env` already has:** DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME, FRONTEND_URL=https://tradingbeast.ecomex.cloud,
  ADMIN_FRONTEND_URL, payment numbers, API keys.
  **Missing (new code needs them):** `TELEGRAM_WEBHOOK_SECRET`,
  `TELEGRAM_MINI_APP_URL`, `ADMIN_TELEGRAM_IDS`.
  (`docker-compose.prod.yml` on master already passes all three to the backend.)

## 1. Decisions needed from Jafrul before deploy

1. **Mini App domain. ✅ DECIDED (Jafrul, 2026-11-28): `app.tradingbeast.ecomex.cloud`**
   (new DNS A → 72.62.228.196 + Caddy vhost → :5176, landing stays at apex).
   `TELEGRAM_MINI_APP_URL=https://app.tradingbeast.ecomex.cloud`.
2. **Branch/deploy trigger. ✅ DECIDED (Jafrul, 2026-11-28): (a) merge = auto-deploy.**
   Merging `master` → `main` fires the GitHub Actions deploy. Preconditions
   before that merge (Muse, in progress): the workflow on the merged tree
   must be production-safe (prod compose file, all services incl.
   mini-frontend, migrations reviewed) — the workflow inherited from main
   builds with the DEV compose and only 3 services, which is NOT safe to fire
   as-is; and the Actions SSH secret must be verified present.
3. **JWT rotation. ✅ DECIDED (Jafrul, 2026-11-28): ROTATE at deploy time.**
   Execute on the VPS only, in the same window as the env-key additions and
   BEFORE the merge fires the deploy (the new backend must start with the new
   secret; the value is generated on the VPS and never leaves it):
   ```bash
   cd /opt/session-focus-radar
   NEWJWT=$(openssl rand -base64 48)
   python3 - "$NEWJWT" <<'EOF'
   import sys
   p='.env'; s=open(p).read().splitlines()
   s=[('JWT_SECRET='+sys.argv[1]) if line.startswith('JWT_SECRET=') else line for line in s]
   open(p,'w').write('\n'.join(s)+'\n')
   EOF
   unset NEWJWT
   ```
   Effect: every existing session is invalidated; users re-login via Telegram.
4. **ADMIN_TELEGRAM_IDS. ✅ CONFIRMED (Jafrul, 2026-11-28)** — his numeric
   Telegram ID was located in the live DB (his own User row, @junaitfx) and
   confirmed by him. The value itself is entered into the VPS `.env` only at
   deploy time — it is deliberately not written in this repo.

## 2. Pre-deploy checklist (safe, no live changes)

- [ ] Commit Phases A+B+D work on `master` (currently uncommitted) and push.
- [ ] Full local verify: backend `npm run build && npm test` (26/26),
      mini-app / user-portal / admin-portal / landing `npm run build` — all
      green as of 2026-11-28 02:27 +06.
- [ ] VPS: DB backup — `docker exec sfr-postgres pg_dump -U postgres
      session_focus_radar | gzip > /opt/backups/tb-pre-phase-c-$(date +%F).sql.gz`
- [ ] VPS `.env`: append the three missing keys (values never in chat/git):
      `TELEGRAM_WEBHOOK_SECRET` (generate on VPS: `openssl rand -hex 32`),
      `TELEGRAM_MINI_APP_URL=https://app.tradingbeast.ecomex.cloud`,
      `ADMIN_TELEGRAM_IDS=<Jafrul's numeric Telegram ID>`.
      Also update FRONTEND_URL to include the app origin for CORS if the
      portal will be used from it — backend now auto-adds the
      TELEGRAM_MINI_APP_URL origin, so this is optional.
- [ ] Cloudflare DNS: A record `app.tradingbeast` → 72.62.228.196 (same style
      as the apex record). Muse can create it via the connected Cloudflare
      token at deploy time, with Jafrul's go-ahead.
- [ ] Prisma: schema changes between main and master (CreditWallet,
      CreditEntry, LoginCode models) — run `npx prisma migrate deploy`
      (or `db push` if no migration files exist — CHECK FIRST on the VPS
      checkout; the credit doc says migrations must be reviewed, not blind).

## 3. Merge-safety prep (done by Muse, 2026-11-28) + pre-merge manual steps

**Hazards found in a bare merge (all now handled):**
- The merge is a fast-forward (main's tip is master's ancestor) — BUT
  master's tree lacks `.github/workflows/deploy.yml` (the merge would delete
  the very workflow meant to fire) and lacks landing's Dockerfile; master's
  `docker-compose.yml` is the DEV compose while main's same-named file is the
  production one; and main **tracks `.env` in git**, so a VPS `git pull`
  would delete the live `.env`.
- **Fixes now on master:** production `deploy.yml` added (uses
  `docker-compose.prod.yml`, builds backend + user/admin/mini/landing,
  preserves/restores `.env` around the pull, health-check gate);
  `docker-compose.prod.yml` gained `landing` + `mini-frontend` (7 services);
  `frontend/landing/Dockerfile.prod` + `nginx.conf` ported from main with
  VITE_* build args.
- **Schema (UPDATED after the b01 merge, PR #2 → master `600fdb2`):** master
  now HAS `prisma/migrations/` (3 migrations: initial, auth_sessions,
  telegram_delivery) from the backend/b01-reliability branch. BUT the live DB
  has **no migration history** and an older schema, and the b01 team's own
  gate (docs/PRE-MERGE-CHECKLIST.md) says: *"Initial migration is only safe
  for an empty database. Do not blindly baseline."* So do NOT run
  `migrate deploy` blindly and do NOT baseline blindly. Use the diff-first
  procedure below: generate the incremental SQL from the LIVE database to
  the merged schema, review it by hand (expected: create CreditWallet,
  CreditEntry, LoginCode, AuthSession, RadarRun, TelegramDelivery + new
  indexes; **no drops, no destructive alters** — abort if any appear), apply
  it, and only then record the 3 migrations as applied.
- **JWT (b01 hardening):** the merged backend refuses to boot with a weak or
  example JWT secret (<32 chars). The §1.3 rotation (fresh strong secret,
  generated on the VPS) must happen BEFORE the new backend first starts.
  Note the new tracked-session system invalidates legacy JWTs anyway —
  all users re-login via Telegram after this deploy.
- **Env additions at deploy time:** the 3 keys from §2 PLUS
  `TRUST_PROXY_HOPS=1` (single Caddy hop, so IP rate limits see real IPs).

**Pre-merge manual steps on the VPS (run minutes before merging):**
```bash
cd /opt/session-focus-radar
cp .env /root/tb-env-preserve.env            # extra safety beyond the workflow
# 1) DB backup first (§2; backend/scripts/backup-db.sh also exists on master)
# 2) Incremental schema diff from the LIVE db to the merged schema — review it:
git fetch origin master
mkdir -p /tmp/tb-schema && git show origin/master:backend/prisma/schema.prisma > /tmp/tb-schema/schema.prisma
set -a; . ./.env; set +a
cd /tmp/tb-schema && npx --yes prisma@5.18.0 migrate diff \
  --from-url "$DATABASE_URL" --to-schema-datamodel schema.prisma \
  --script > /tmp/tb-schema/incremental.sql
less /tmp/tb-schema/incremental.sql          # MUST be additive-only; abort on drops
# 3) Apply the reviewed SQL, then record migration history:
psql "$DATABASE_URL" -f /tmp/tb-schema/incremental.sql
cd /opt/session-focus-radar   # (after the merge pull, or use the fetched tree)
for m in 20261128000000_initial 20261128010000_auth_sessions 20261128020000_telegram_delivery; do
  npx --yes prisma@5.18.0 migrate resolve --applied "$m" --schema=backend/prisma/schema.prisma
done
# 4) append the new env keys (§2 + TRUST_PROXY_HOPS=1) and rotate JWT (§1.3),
#    then merge master→main on GitHub
```
Also verify in GitHub repo Settings → Secrets → Actions that `VPS_SSH_KEY`
still exists before merging (the workflow cannot deploy without it).

## 3b. Deploy steps (manual fallback, on the VPS)

```bash
cd /opt/session-focus-radar
git fetch origin
git checkout master        # or merge into main first if route (a) was chosen
docker compose -f docker-compose.prod.yml build backend mini-frontend user-frontend admin-frontend
docker exec sfr-backend npx prisma migrate deploy   # after reviewing migrations
docker compose -f docker-compose.prod.yml up -d backend mini-frontend user-frontend admin-frontend
docker compose -f docker-compose.prod.yml ps        # all healthy
curl https://api.tradingbeast.ecomex.cloud/health
curl https://api.tradingbeast.ecomex.cloud/api/telegram/config   # must be JSON now
```
Notes:
- `docker-compose.prod.yml` on master has no `landing` service (the VPS main
  line added one) — keep the running `sfr-landing` container untouched; do NOT
  run a blanket `up -d` that could orphan/remove it. Target services by name
  as above.
- Mini App container: `sfr-mini-frontend` on :5176 (added in this prep, with
  `frontend/mini-app/Dockerfile.prod` + `nginx.conf`).
- Caddy: add the app vhost by editing `/opt/hybrid/Caddyfile` **in place**
  (append `>>` or truncate-write the same inode — NEVER `sed -i`; see
  AGENTS.md) and reload; upstream must be `10.0.2.1:5176`:
  ```
  app.tradingbeast.ecomex.cloud {
   encode zstd gzip
   reverse_proxy 10.0.2.1:5176 {
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-Proto {scheme}
   }
  }
  ```

## 4. Telegram configuration (after backend is live)

1. **Webhook (with secret):** admin-portal → Telegram page → Webhook card, set
   `https://api.tradingbeast.ecomex.cloud/api/telegram/webhook`
   (or `POST /api/telegram/set-webhook` as an admin user). The backend sends
   `TELEGRAM_WEBHOOK_SECRET` as the secret_token; the webhook handler rejects
   calls without it.
2. **Menu button:** `cd backend && npm run telegram:menu` with the prod env,
   OR admin-portal → Telegram page → "Set & verify menu button"
   (URL = the Mini App URL, text "Open App").
3. **Diagnostics:** admin-portal → Telegram page → Run diagnostics — bot,
   webhook (no last_error_message, pending count ~0) and menu button must all
   show correctly.
4. **BotFather checklist (manual, Jafrul):**
   - /mybots → @tradingbeastbyjunaitbot → Bot Settings → Menu Button: confirm
     it opens the Mini App URL (step 2 sets it via API; BotFather is the
     cross-check).
   - Main Mini App: /newapp (or Bot Settings → Configure Mini App, naming
     varies by BotFather version) → title "TradingBeast", description,
     photo 640×360, Web App URL = Mini App URL, short name (used in
     t.me/tradingbeastbyjunaitbot/<shortname> links).
   - Optional: /setdescription, /setabouttext, /setuserpic with the standard
     disclaimer ("market analysis tool, not investment advice").

## 5. Post-deploy verification (all must pass)

- [ ] `GET https://api.tradingbeast.ecomex.cloud/health` → ok
- [ ] `GET …/api/telegram/config` → JSON with botUsername
      `tradingbeastbyjunaitbot`, miniAppConfigured true
- [ ] https://app.tradingbeast.ecomex.cloud loads the Mini App (not landing)
- [ ] In Telegram: /start shows the Open App button; opening it auto-logs in
      (no login form), credits show 10/day wallet, Run Radar works or shows a
      correct insufficient-credits/market-closed message
- [ ] Bot commands still answer: /credits, /focus, /watchlist
- [ ] Admin portal → Telegram page diagnostics all green
- [ ] Landing CTAs open https://t.me/tradingbeastbyjunaitbot
- [ ] Backend logs clean for 15 minutes (`docker logs sfr-backend --tail 100`)

## 6. Rollback

```bash
cd /opt/session-focus-radar
git checkout main            # previous production line
docker compose -f docker-compose.prod.yml up -d --build backend user-frontend admin-frontend
# remove the app Caddy vhost + reload if it was added; sfr-mini-frontend can be stopped:
docker stop sfr-mini-frontend
# DB: restore only if a migration broke something (backup in §2)
```
Old containers/images stay on the VPS until pruned — do not `docker image
prune` until the new deploy is verified.

## 7. DEPLOY OUTCOME (2026-11-28 ~04:35 +06, Jafrul's explicit order)

DEPLOYED AND VERIFIED LIVE:
- Pre-steps done: DB backup (/opt/backups/tb-pre-deploy-2026-11-28.sql.gz),
  .env keys added (webhook secret, mini app URL, admin IDs, TRUST_PROXY_HOPS=1),
  JWT rotated on the VPS.
- Schema: incremental diff reviewed additive-only (6 new tables), applied;
  3 migrations resolved as applied — `prisma migrate status` reports
  "Database schema is up to date!".
- main = merge commit of master (unrelated histories; tree = master).
  GitHub main a85095c / master 32f6ed8 (docker build fix).
- Workflow run 1 failed at `git pull` (locally-edited tracked .env) — fixed
  by restoring .env from the preserved copy after a manual pull.
  Workflow run 2 pulled + built all 5 images, then stalled before `up -d`;
  the final `up -d` + health gate were completed manually (runbook §3b).
  FOLLOW-UP: simplify deploy.yml (drop the `compose run migrate` step —
  migrations are applied per this runbook — and investigate the stall)
  before relying on unattended deploys.
- Live: backend healthy (/health, /ready), /api/telegram/config correct,
  app.tradingbeast.ecomex.cloud serving the Mini App (Caddy vhost added,
  Let's Encrypt cert issued), webhook set WITH secret (unsigned POST → 403),
  chat menu button = Open App → app URL, admin 200, apex 200, zero 5xx in logs.
- OPEN GAPS: (1) user portal (:5173) still has no public Caddy vhost —
  FRONTEND_URL points at the apex, which serves the landing; give the portal
  its own subdomain (owner pick). (2) BotFather "Main Mini App" profile
  (short name/photo) is a manual owner step; the chat menu button is already
  set via API.
