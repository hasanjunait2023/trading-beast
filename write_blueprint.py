# Write BLUEPRINT.md in Python script
with open('.claude/team/BLUEPRINT.md', 'w', encoding='utf-8') as f:
    f.write("""# Session Focus Radar - Buildable Blueprint

> **Project:** Session Focus Radar (Global Market Analysis Tool)  
> **Chartered:** 2026-11-16  
> **Pivot (2026-11-16):** Standalone software project, NOT n8n workflows. Global audience (English + Bengali UI).  
> **Target:** Production-ready in 90 days  
> **Blueprint version:** 1.0 (GATE 1 approved)

---

## 1. System Architecture

### 1.1 Component Diagram

```
SESSION FOCUS RADAR
+------------------+     +------------------+     +--------------------------+
|   Telegram Bot   |     |   Frontend       |     |      Admin Portal        |
|   (Node.js)      |<----|   (Next.js)      |<----|      (Next.js)           |
|                  |     |   User Portal    |     |      /admin              |
+--------+---------+     +--------+---------+     +------------+-------------+
         |                       |                          |
         +-----------------------+--------------------------+
                                 |
                       +---------v---------+
                       |   REST API        |
                       |   (Fastify/Node)  |
                       +---------+---------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
+--------v--------+    +--------v--------+    +---------v---------+
|  PostgreSQL     |    |  Redis Cache    |    |  Self-Hosted      |
|  (Supabase on   |    |  (Session,      |    |  QuickChart       |
|   mt5vps)       |    |   Rate Limit)   |    |  (Docker on       |
+-----------------+    +-----------------+    |   Contabo VPS)    |
                                             +-------------------+
                                 |
                       +---------v---------+
                       |  External APIs    |
                       |  * Yahoo Finance  |
                       |  * Finnhub        |
                       +-------------------+
```

### 1.2 Data Flow -- Key User Interactions

#### /start (Onboarding)
User -> Telegram Bot -> API: POST /api/v1/users/onboard
  -> Check existing user (telegram_id)
  -> If new: create user (tier=FREE, trial_ends_at=NULL, referral_code=GEN)
  -> If referred: update referrals table, grant trial credit
  -> Return welcome message with tier explanation, trial CTA, referral link
  -> Sync to PostgreSQL

#### /focus (Core Analysis Request)
User -> Telegram Bot -> API: GET /api/v1/focus?session=auto&tier={user.tier}
  -> Validate subscription (check tier, trial_ends_at, subscription status)
  -> Gate features by tier:
     - FREE: 1 session summary/day, 3 pairs, 30-min delay
     - PRO: All pairs, live /focus, custom watchlist, session alerts
     - ELITE: Prop firm rules, journal integration, custom alerts
  -> Fetch user watchlist (or default 28 FX + 4 assets for PRO/ELITE)
  -> Check analysis_cache (pair, session, date) -- return cached if < 5 min old
  -> If cache miss: run analysis engine (parameterized by watchlist)
  -> Store result in analysis_cache
  -> Generate charts for FOCUS pairs (async, self-hosted QuickChart)
  -> Return formatted text + chart URLs
  -> Telegram bot sends text + photos

#### Watchlist Change (/watchlist add EUR/USD)
User -> Telegram Bot -> API: PATCH /api/v1/users/me/watchlist
  -> Validate pair exists in master list (28 FX + 4 assets)
  -> Enforce tier limits: FREE=3, PRO=20, ELITE=unlimited
  -> Update users.watchlist (JSONB array)
  -> Return confirmation

#### Payment Submission (bKash/Nagad)
User -> Telegram Bot -> /pay command -> Upload screenshot
  -> Bot forwards to admin channel + creates payment record (status=PENDING)
  -> Admin Portal: Payment verification queue
  -> Admin reviews screenshot, clicks Approve/Reject
  -> On Approve: update subscription (tier, starts_at, expires_at), user.tier
  -> Notify user via Telegram
  -> Log referral credit if applicable

#### Daily Publishing (London & NY Open)
Cron (Schedule): 11:30 BDT (London open) & 17:30 BDT (NY open)
  -> API: POST /api/v1/publishing/generate-focus-card
  -> Run analysis for default watchlist (all pairs)
  -> Pick top 3 FOCUS pairs
  -> Generate chart images via self-hosted QuickChart
  -> Compose Focus Card (image + caption)
  -> Post to Telegram Channel (via Bot API sendPhoto)
  -> Post to Facebook Page (via Graph API / Postiz)
  -> Log in publishing_log table
""")
print("Part 1 written")
