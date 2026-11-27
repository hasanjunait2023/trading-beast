
with open(".claude/team/BLUEPRINT.md", "a", encoding="utf-8") as f:
    f.write("""
---
## 8. Build Sequence -- 90-Day Plan
### Phase 0: Foundation (Week 1) -- M1: Data Foundation
- Provision PostgreSQL schema (all tables)
- Seed master_pairs with 28 FX + 4 assets
- Deploy self-hosted QuickChart on Contabo (Docker)
- Configure Redis on mt5vps (Docker)
- Set up GitHub repo, CI/CD pipeline
- Set up monitoring (Grafana dashboards)
- **Exit:** All infra running, schema migrated, QuickChart generating test charts, CI/CD green
## 9. Risk Register (Top 10)
| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| 1 | Yahoo Finance blocks/rate-limits | High | High | Retry/backoff, Finnhub fallback, 5-min cache, MT5 bridge post-launch |
| 2 | Legal/regulatory (FER Act, FE Circular 24) | Medium | Critical | Market Analysis Tool positioning; disclaimers everywhere; Bitcoin gated; no IB links |
""")
print("Done")
