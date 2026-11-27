# Mission Charter

> Written at CHARTER. The sacred source of intent. Every agent reads this first.

- **Project:** Session Focus Radar (Bangladesh Forex Trading Assistant)
- **Chartered:** 2026-11-16
- **CEO run:** /ceo

## Goal
Build a standalone market analysis platform that delivers session-aware trading focus lists (Asian/London/NY) to forex traders globally, with a freemium subscription model (Free/Pro/Elite tiers), a web user portal, an admin portal, and a Telegram bot as the mobile entry point. The platform analyzes 28 forex pairs + 4 assets (Gold, Silver, Oil, Bitcoin) using multi-timeframe technical analysis (EMA alignment, RSI, ADR, Opening Range) to output 3 "FOCUS" pairs per session with scored rationale.

**Audience:** Forex traders worldwide (English + Bengali UI). This is a market analysis tool, not investment advice, not trade signals, not a broker.

## Success criteria (how we know it's done)
- [ ] Telegram bot live and responding to `/focus`, `/start`, and watchlist commands for authorized users
- [ ] Multi-user subscription system with Free/Pro/Elite tiers, 7-day Pro trial, bKash/Nagad payment flow
- [ ] Automated daily Focus Card generation and posting to Facebook Page + Telegram Channel (London & NY open)
- [ ] n8n workflows deployed: core analysis, chart generation, content publishing, user management
- [ ] Marketing funnel operational: FB boost test → winner selection → scale; referral program; YouTuber partnerships
- [ ] 90-day metrics dashboard: CPL, Activation (24h), Trial→Paid (10-15%), Retention tracked weekly
- [ ] Legal disclaimers in place: "analysis tool not investment advice", no guaranteed returns, forex regulatory awareness

## Constraints
- Stack / platform: n8n (self-hosted at n8n.ecomex.cloud), Telegram Bot API, Yahoo Finance (unofficial, free), QuickChart.io for charts
- Deploy target: n8n instance (already running), Hostinger Mail API for transactional emails if needed
- Time / budget: 90-day launch timeline, low-cost (free data sources initially, upgrade to MT5 bridge later)
- Other: Bangladesh forex regulatory constraints — no IB links, no guaranteed returns claims, disclaimers mandatory; Bengali language UI

## Non-goals (explicitly out of scope)
- Building a proprietary trading signal service with entry/exit/TP/SL calls
- Direct broker integration or trade execution
- Mobile app (Telegram bot is the interface)
- Paid data feeds in MVP (Yahoo Finance only; MT5 bridge post-launch)
- Multi-language beyond Bengali/English
- Web dashboard (Telegram-only for v1)

## Stakeholder decisions
- 2026-11-16 — Target market confirmed: Bangladeshi forex traders (21-45 age)
- 2026-11-16 — Pricing tiers: Free / Pro (৳500-800/mo) / Elite (৳1200+/mo) with 7-day Pro trial
- 2026-11-16 — Payment: bKash/Nagad manual verification first, auto gateway + USDT later
- 2026-11-16 — Marketing: FB/IG boost primary, organic boosters (students, referral, YouTubers, FB groups)
- 2026-11-16 — n8n workflow JSON already exists — deploy and iterate, don't rebuild from scratch