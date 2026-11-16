with open('.claude/team/BLUEPRINT.md', 'a', encoding='utf-8') as f:
    f.write("""

---

## 2. Database Schema (PostgreSQL)

All tables in public schema. Use Supabase (PostgreSQL 15) on mt5vps.

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";

-- USERS & SUBSCRIPTIONS
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id     BIGINT UNIQUE NOT NULL,
    username        TEXT,
    first_name      TEXT,
    last_name       TEXT,
    language_code   TEXT DEFAULT 'en',
    tier            TEXT NOT NULL DEFAULT 'FREE',
    trial_ends_at   TIMESTAMPTZ,
    watchlist       JSONB NOT NULL DEFAULT '[]'::jsonb,
    referral_code   TEXT UNIQUE NOT NULL DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 8),
    referred_by     UUID REFERENCES users(id),
    referral_credits INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    is_banned       BOOLEAN NOT NULL DEFAULT false,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);
CREATE INDEX idx_users_tier ON users(tier);

CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE',
    starts_at       TIMESTAMPTZ NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    auto_renew      BOOLEAN NOT NULL DEFAULT false,
    payment_method  TEXT,
    external_id     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount          NUMERIC(12,2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'BDT',
    method          TEXT NOT NULL,
    bkash_txn       TEXT,
    nagad_txn       TEXT,
    usdt_tx_hash    TEXT,
    screenshot_url  TEXT,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    verified_at     TIMESTAMPTZ,
    verified_by     UUID REFERENCES users(id),
    rejection_reason TEXT,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_bkash_txn ON payments(bkash_txn);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- REFERRALS
CREATE TABLE referrals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    credit_granted  BOOLEAN NOT NULL DEFAULT false,
    credit_weeks    INTEGER NOT NULL DEFAULT 1,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_referrals_unique ON referrals(referrer_id, referred_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- ANALYSIS CACHE (Yahoo hardening)
CREATE TABLE analysis_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair            TEXT NOT NULL,
    session         TEXT NOT NULL,
    analysis_date   DATE NOT NULL,
    tier            TEXT NOT NULL,
    result_json     JSONB NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_analysis_cache_unique ON analysis_cache(pair, session, analysis_date, tier);
CREATE INDEX idx_analysis_cache_expires ON analysis_cache(expires_at);

-- PUBLISHING LOG
CREATE TABLE publishing_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session         TEXT NOT NULL,
    published_at    TIMESTAMPTZ NOT NULL,
    focus_pairs     JSONB NOT NULL,
    telegram_msg_id BIGINT,
    fb_post_id      TEXT,
    status          TEXT NOT NULL DEFAULT 'SUCCESS',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_publishing_log_session_date ON publishing_log(session, published_at DESC);

-- METRICS (daily aggregates)
CREATE TABLE daily_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date     DATE NOT NULL UNIQUE,
    new_users       INTEGER NOT NULL DEFAULT 0,
    active_users    INTEGER NOT NULL DEFAULT 0,
    trial_starts    INTEGER NOT NULL DEFAULT 0,
    trial_conversions INTEGER NOT NULL DEFAULT 0,
    paid_subscriptions INTEGER NOT NULL DEFAULT 0,
    churned_users   INTEGER NOT NULL DEFAULT 0,
    referral_signups INTEGER NOT NULL DEFAULT 0,
    referral_conversions INTEGER NOT NULL DEFAULT 0,
    cpl_bdt         NUMERIC(10,2),
    revenue_bdt     NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MASTER PAIRS (reference data)
CREATE TABLE master_pairs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol          TEXT UNIQUE NOT NULL,
    kind            TEXT NOT NULL,
    group_name      TEXT,
    yahoo_symbol    TEXT NOT NULL,
    decimals        INTEGER NOT NULL DEFAULT 5,
    icon            TEXT,
    sessions        TEXT[],
    base_currency   TEXT,
    quote_currency  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0
);

-- ADMIN AUDIT LOG
CREATE TABLE admin_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id        UUID NOT NULL REFERENCES users(id),
    action          TEXT NOT NULL,
    target_user_id  UUID REFERENCES users(id),
    details         JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
```

### 2.1 Row Level Security (RLS) Policies

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY \"users_own\" ON users FOR ALL USING (telegram_id = current_setting('app.current_telegram_id')::bigint);
CREATE POLICY \"users_admin\" ON users FOR ALL USING (current_setting('app.is_admin', true) = 'true');
```
""")
print("Part 2 written")
