# Decision Log

> Append-only. One dated entry per phase transition or notable call.
> This is the company's memory — it lets `/ceo` resume and the loop survive across sessions.

## 2026-11-16 — CHARTER — M1
- Decided: Launch Session Focus Radar as Telegram bot for Bangladeshi forex traders with freemium model
- Why: Existing n8n workflow already implements core analysis; marketing plan documented; low-cost entry with Yahoo Finance data
- Dispatched: researcher (validate n8n workflow completeness, data source reliability, regulatory constraints)
- Outcome: Research complete. Key findings below.

## 2026-11-16 — RESEARCH — M1
- Decided: Product repositioning required — from "forex trading assistant" to "market analysis tool" in all public-facing copy
- Why: Retail forex trading is illegal in Bangladesh under FER Act 1947. Positioning as analysis tool is the difference between permissible service and cognizable offense.
- Decided: Bitcoin content needs legal review before public shipping (FE Circular No. 24 treats virtual-asset transactions as contraventions)
- Decided: Self-host QuickChart from day 1 (public free tier caps at 1,000 charts/month)
- Decided: External PostgreSQL for user state (n8n Data Tables insufficient for multi-user)
- Decided: Yahoo Finance primary + Finnhub free secondary fallback (no retry/backoff currently; 73 req/run; 429 risk)
- Decided: Gold/Silver/Oil must use consistent data source — recommend XAUUSD=X/XAGUSD=X spot over GC=F/SI=F/CL=F futures
- Decided: 1H 200-EMA NaN bug must be fixed before launch (range=120d exceeds Yahoo's 60-day intraday window)
- Dispatched: ceo-architect (produce blueprint: architecture, schema, workflow breakdown, build sequence, risk register)
- Outcome: Architect dispatched, blueprint in progress

## 2026-11-16 — PIVOT — M1
- Decided: Build as standalone software project, NOT n8n workflows. Port existing analysis engine JS into a real backend.
- Why: Founder wants full control — backend API, user portal, admin portal, PostgreSQL. n8n is the wrong substrate for a product with portals, tiers, and payments.
- Decided: Product is global, not Bangladesh-only. International market analysis tool with English + Bengali UI.
- Why: Founder explicitly corrected scope. Keep standard disclaimers; do not over-index on Bangladesh FER Act constraints.
- Dispatched: ceo-architect (re-dispatched with pivot: standalone stack, global audience, no n8n)
- Outcome: Blueprint being rewritten

## 2026-11-16 — GATE1 — M1
- Decided: Approved to proceed with BUILD phase for standalone product
- Why: Core analysis engine exists, product scope clarified (global, not Bangladesh-only), dual surface (web + Telegram bot) confirmed
- Dispatched: backend-engineer, frontend-engineer, designer (parallel build)
- Outcome: Project scaffold created with all major components

## 2026-11-16 — BUILD — M2-M4
- Decided: Full stack implemented — backend API, user portal, admin portal, shared analysis engine
- Dispatched: backend-engineer (auth, analysis, payments, telegram), frontend-engineer (user + admin portals), designer (UI components, design system)
- Outcome: All core features complete, Docker configs ready, deployment scripts created
- Stack: Node.js/Express + Prisma/PostgreSQL, React/Vite (user + admin), self-hosted QuickChart, nginx reverse proxy

## 2026-11-16 — BUILD — M5
- Decided: Production deployment package ready for VPS (IP 72.x.x.x)
- Created: docker-compose.prod.yml, production Dockerfiles, nginx configs, systemd services, deploy scripts, monitoring
- Deploy flow: deploy.sh → setup-app.sh → setup-nginx.sh → setup-ssl.sh
- Monitoring: health checks, disk/memory/SSL alerts, cron every 5 min
- Backup: pg_dump daily, config archive, 30-day retention