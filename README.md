# Session Focus Radar

A market analysis platform for forex traders — session-aware trading focus lists (Asian/London/NY) with freemium subscriptions, web portals, and Telegram bot integration.

## Architecture

```
session-focus-radar/
├── backend/                 # Node.js/Express API + PostgreSQL + Prisma
│   ├── src/
│   │   ├── index.ts         # Express server entry
│   │   ├── routes/          # API routes (analysis, auth, user, admin, telegram)
│   │   ├── services/        # Business logic (analysis engine, Yahoo Finance)
│   │   └── middleware/      # Auth, error handling
│   └── prisma/schema.prisma # Database schema
├── frontend/
│   ├── user-portal/         # React/Vite user dashboard (port 5173)
│   └── admin-portal/        # React/Vite admin dashboard (port 5174)
├── shared/
│   └── analysis-engine.ts   # Core analysis logic (ported from n8n)
├── telegram-bot/            # Telegram bot webhook handler
└── docker-compose.yml       # Full stack orchestration
```

## Features

- **Analysis Engine**: 28 forex pairs + 4 assets (Gold, Silver, Oil, Bitcoin), multi-timeframe (EMA, RSI, ADR, Opening Range), scored focus/watch/avoid lists
- **User Portal**: Dashboard, focus lists, watchlist management, subscription, referrals, payments
- **Admin Portal**: User management, payment verification, metrics/analytics, analysis trigger
- **Telegram Bot**: `/focus`, `/watchlist`, `/tier`, `/referral`, `/pay` commands with inline keyboards
- **Freemium Tiers**: Free (3 pairs, delayed) / Pro ($9.99/mo, full access) / Elite ($29.99/mo, API + custom alerts)
- **Payments**: bKash/Nagad (manual verification) + USDT TRC20 (auto-verified)
- **Referral System**: 7 days free Pro per successful referral

## Quick Start

### Prerequisites
- Node.js 22+
- PostgreSQL 16+
- Docker (optional, for full stack)

### Local Development

1. **Clone and install**
```bash
# Backend
cd backend && npm install

# User portal
cd ../frontend/user-portal && npm install

# Admin portal
cd ../admin-portal && npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your values (DATABASE_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN, etc.)
```

3. **Setup database**
```bash
cd backend
npx prisma generate
npx prisma db push
```

4. **Start services**
```bash
# Terminal 1: Backend (port 3000)
cd backend && npm run dev

# Terminal 2: User portal (port 5173)
cd frontend/user-portal && npm run dev

# Terminal 3: Admin portal (port 5174)
cd frontend/admin-portal && npm run dev
```

### Docker (Full Stack)
```bash
docker-compose up -d --build
# Backend: http://localhost:3000
# User portal: http://localhost:5173
# Admin portal: http://localhost:5174
# QuickChart: http://localhost:3400
# PostgreSQL: localhost:5432
```

## API Endpoints

### Auth
- `POST /api/auth/telegram` — Telegram login/registration
- `POST /api/auth/refresh` — Refresh JWT token

### Analysis
- `POST /api/analysis/focus` — Get focus list for session (auth required)
- `GET /api/analysis/focus/:session` — Get cached focus list
- `GET /api/analysis/pairs` — List available trading pairs

### User
- `GET /api/user/me` — Current user profile
- `PATCH /api/user/watchlist` — Update watchlist
- `POST /api/user/payment` — Submit payment for verification
- `GET /api/user/payments` — Payment history
- `GET /api/user/referrals` — Referral stats

### Admin (ELITE tier required)
- `GET /api/admin/users` — Paginated user list
- `PATCH /api/admin/users/:id/tier` — Update user tier
- `GET /api/admin/payments/pending` — Pending payments
- `POST /api/admin/payments/verify` — Approve/reject payment
- `GET /api/admin/metrics` — Platform metrics
- `POST /api/admin/analysis/trigger` — Generate daily analysis

### Telegram
- `POST /api/telegram/webhook` — Bot webhook endpoint
- `POST /api/telegram/set-webhook` — Configure webhook URL

## Analysis Engine

The core analysis logic lives in `shared/analysis-engine.ts` — pure TypeScript, no n8n dependencies.

**Scoring Components:**
- Trend alignment (4H/1H/15m EMA) — 35 pts
- Trend cleanliness (ER, EMA order) — 20 pts
- Activity/volatility — 10 pts
- Session relevance — 5 pts
- Opening Range breakout — 15 pts
- Room to target (PDH/PDL, ADR) — 15 pts
- Penalties (overextended, divergence, late entry) — up to -21 pts

**Output:** Top 3 FOCUS pairs (score ≥ 65, full alignment, OR confirmed), up to 2 WATCH, up to 3 AVOID.

## Telegram Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + onboarding |
| `/focus` | Current session focus list |
| `/watchlist` | View/update watchlist |
| `/tier` | Subscription status |
| `/referral` | Referral code & stats |
| `/pay` | Payment options |

## Database Schema

Key models: `User`, `Subscription`, `Payment`, `Referral`, `AnalysisCache`, `FocusResult`

## Deployment

1. Set production environment variables
2. Run `npx prisma migrate deploy` on target database
3. Build frontend: `npm run build` in each portal
4. Deploy backend with PM2/systemd or container orchestration
5. Configure Telegram webhook: `POST /api/telegram/set-webhook` with your domain
6. Set up QuickChart self-hosted for chart generation

## Disclaimer

⚠️ **This is a market analysis tool only.** Not investment advice. Not trade signals. Trading involves substantial risk of loss. Past performance does not guarantee future results.