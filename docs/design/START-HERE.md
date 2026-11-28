# TradingBeast frontend design

Open **TradingBeast-Preview.html** in a browser. It starts on the responsive Web App dashboard. Select **Demo** in the top bar to open the screen index, switch to the Telegram Mini App preview or select a data state. The preview runs offline from a single file. Demo edits are stored in the current browser where browser storage is available. Use **Reset demo changes** in the screen index to restore the example data.

## Screens and workflows

| Area | Screens |
| --- | --- |
| Entry | Welcome, Telegram sign-in, browser one-time-code entry, workspace setup |
| Market analysis | Session overview, Session Focus Radar, instrument detail with 15m / 1H / 4H chart tabs, session clock, watchlist, currency strength and heatmap |
| Session and review | Session plan, risk tools, journal, trade editor, economic calendar, alerts, alert editor, correlations and exposure, Strategy Lab |
| Account | Credits, Radar confirmation, referrals, membership, payment history, payment submission, pending verification, settings, help, More |
| Navigation and QA | Unknown-route recovery, screen index, 10 alternate data/account states and a light/dark theme |

Thirty routes can be opened in either host preview. Sign-in and checkout adapt to the host. TradingBeast uses an emerald and mint palette with a responsive sidebar and data table on desktop, a compact header and stacked cards with bottom navigation on mobile, and labeled Focus, Watch, Avoid and unavailable states.

## Suggested review paths

- **Trading workspace** → Home → Radar → Focus or Watch → Instrument detail → Watchlist.
- **Daily workflow** → Session plan → Risk tools → Journal → Add trade.
- **Credits** → Credits → Open Radar → Run Radar → Confirm demo scan. The sample wallet drops by 10 credits on success. Offline and insufficient-credit scenarios disable confirmation. The Error scenario retains the balance.
- **Account** → Membership → Review plan → Checkout. The Web demo accepts an invented payment reference. The Telegram view displays the Stars integration state.
- **States and theme** → Demo → Preview scenario. Select Empty, Loading, Stale, Partial, Offline, Market closed, Unavailable, Error, Insufficient credits or Session expired. Dark mode is in Settings.

## Design handoff

- **TradingBeast-Preview.html** is the current interactive design review.
- **reference-studies/screens/** contains 30 previously created individual PNG mockups. These show the original screen studies, including two widescreen layouts. The current prototype refines spacing, navigation, typography and labels. The mockups are design references.
- **reference-studies/Screen-Index.md** maps those PNGs page by page. **reference-studies/TradingBeast-Frontend-Design-Handoff.md** records design tokens, API contracts at its historical baseline and release dependencies.

For production, map prototype screens to the existing React/Vite layouts and recheck the repository contracts. Preserve the Radar confirmation boundary, distinguish scores from directional bias, surface freshness near evidence, use signed Telegram identity and branch payment flows by host. Calendar, exposure, strategy research and other expansion screens require their own data contracts. The preview uses sample candles, market data and locally simulated actions. Telegram and backend integration, deployment and device testing are outside this design package.

All routes rendered their expected markup in a local JavaScript check. Demo search, filtering, watchlist, scan balance and failure, plan, journal, risk output, alerts and checkout logic were exercised. Visual browser verification was unavailable in this environment.
