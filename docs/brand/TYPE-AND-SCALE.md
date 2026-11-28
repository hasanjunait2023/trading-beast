# TradingBeast Type & Scale

Fonts: `frontend/shared/fonts.css` + `frontend/shared/fonts/`.
Scale tokens: `frontend/shared/theme.css`.

## 1. Font decision — Inter, one family

**Verdict: replace Sora (display) + Manrope (UI) with Inter for both
roles.** Display = Inter 700/800 with `-0.015em` tracking (heading rule
+ `.tb-font-display` in theme.css); UI = Inter 400–700.

### Evidence (measured from the actual woff2 files, fontTools)

| Family / weight | Avg advance width | X-height | Character |
|---|---|---|---|
| Sora 700 (old display) | **0.664 em** | 0.534 | geometric, wide, techy-playful |
| Manrope 400 (old UI) | 0.575 em | 0.540 | humanist, rounded |
| **Inter 400 / 700** | **0.609 / 0.632 em** | 0.546 | neutral grotesque, screen-native |
| Plus Jakarta Sans 400 / 700 | 0.604 / 0.622 em | 0.536 / 0.544 | geometric-humanist, rounded |

Why Inter won:

1. **Width is the "too big" problem.** At the same point size a Sora
   headline occupies ~9% more horizontal space than Inter and ~15%
   more than the old UI font — heroes wrapped earlier and read
   oversized. Inter's narrower advance + tight display tracking is a
   structural zoom-out, before any size changes.
2. **Data legibility.** Inter is drawn for UI at small sizes, ships
   true tabular figures (`tnum`, used by `.tnum` for scores, prices,
   credits) and stays neutral next to dense numbers — the reference
   trait of professional fintech (Linear/Stripe-class products).
3. **One voice.** Sora-display + Manrope-body were two rounded
   personalities competing; a single family with weight/tracking
   contrast is calmer and more premium.
4. Plus Jakarta Sans measured well on width but keeps the rounded,
   friendly character the owner is asking to move away from.

### Payload

| | Before | After |
|---|---|---|
| Files | 9 woff2 (Sora ×4 + Manrope ×5) | 5 woff2 (Inter 400/500/600/700/800) |
| Total | 129.9 KB | **121.1 KB** |
| Delivery | CSS `@font-face`, `font-display: swap` | unchanged |
| Mini-app entry JS impact | 0 (CSS-only) | 0 (CSS-only) |

Browsers only fetch weights a page uses. Landing preloads Inter 700
(hero) + Inter 400 (body); all other apps rely on swap.

Usage rules: headings are Inter via `--font-display` automatically;
never set letter-spacing on body text; display tracking comes from
the theme, not per-component classes; numerals in data contexts
always use `.tnum`.

## 2. Zoom-out — type scale

Tailwind top-end steps tightened via `@theme` in theme.css (every
app inherits; body sizes untouched):

| Utility | Before | After | Δ |
|---|---|---|---|
| text-xl | 20px | 19px | −5% |
| text-2xl | 24px | 22px | −8% |
| text-3xl | 30px | 26px | −13% |
| text-4xl | 36px | 30px | −17% |
| text-5xl | 48px | 40px | −17% |
| text-base / sm | 16 / 14px | unchanged | reading sizes protected |

Display sizes hardcoded in shared components:

| Element | Before | After |
|---|---|---|
| SessionHero session name | 40px | 34px |
| SessionClock hero title | 34 / 40px (sm) | 30 / 34px |
| SessionClock local time | 40px | 34px |
| PairHero pair code | 38px | 32px |
| PairHero price | 32px | 28px |
| PairHero score | 42px | 36px |
| PairRow score (markets / default) | 30 / 26px | 26 / 23px |
| PageHeader title | 28px | 24px |

## 3. Zoom-out — space, radii, elevation

| Token / element | Before | After |
|---|---|---|
| `--radius-hero` | 28px | 24px |
| `--radius-card-xl` | 20px | 18px |
| `--radius-row` | 18px | 16px |
| `--radius-input` | 16px | 14px |
| `--radius-xl` / `--radius-lg` | 24 / 16px | 20 / 14px |
| `--shadow-hero` | 0 18px 36px | 0 14px 28px |
| SessionHero padding | p-6 (24px) | p-5 (20px) |
| SessionClock hero padding | p-5 / sm:p-6 | p-5 |
| RankTable (reference) cell padding | px-5 py-4 | px-4 py-3 |
| SessionClock live-session card radius | 18px | 16px |

Guardrails held: body text ≥ 14px everywhere (base 16px unchanged);
mini-app touch targets unchanged (nav rows, pills and buttons keep
their heights — only display type, hero padding and radii shrank);
the reference composition (gradient hero, mint chip, flag rows,
score-right layout) is recognisably identical, just denser.

## 4. What was NOT changed

- App page files: no size edits. Their `text-[Npx]` values ride the
  same design language; a page-level pass can follow the same table
  if the owner wants a further step.
- Dark-variant scale: radii/shadows mirror the light steps; its type
  rides the same `@theme` scale.

## 5. Density round 2 — owner: "still too big"

Round 1 (§2–§3) cut ~10–17% and shipped; the owner reviewed the live
rebrand and asked for the whole interface to go visibly smaller again.
Round 2 takes another ~12–18% off the display/component scale through
the same levers — `@theme` tokens + shared components first (every app
inherits), then the biggest app-level offenders. It is a scale
refinement, not a redesign: same composition, same colours, same copy.

### 5.1 Type scale (`@theme`, all apps inherit)

| Utility | Round 1 | Round 2 | Δ |
|---|---|---|---|
| text-xl | 19px | 18px | −5% |
| text-2xl | 22px | 20px | −9% |
| text-3xl | 26px | 23px | −12% |
| text-4xl | 30px | 26px | −13% |
| text-5xl | 40px | 34px | −15% |
| text-base / sm | 16 / 14px | unchanged | reading sizes protected |

Note on text-2xl: round 1 already landed it on 22px, the nominal
round-2 target — it still takes a step to 20px so the scale keeps its
rhythm (at 22px it would sit 1px under the new text-3xl and the steps
would collapse into each other).

### 5.2 Display components (shared)

| Element | Round 1 | Round 2 |
|---|---|---|
| SessionHero session name | 34px | 29px |
| SessionHero "{Session} Session" label | 18px | 17px |
| PairHero score | 36px | 30px |
| PairHero pair code | 32px | 27px |
| PairHero price | 28px | 24px |
| PairHero "/100" suffix | 17px | 15px |
| SessionClock hero title | 30 / 34px (sm) | 26 / 29px |
| SessionClock local time | 34px | 29px |
| PairRow score — markets | 26px | 22px |
| PairRow score — home | 23px | 20px |
| PairRow pair code — markets / home | 21 / 19px | 18 / 17px |
| PageHeader title | 24px | 21px |
| RankTable (reference) score | rides text-2xl | 22 → 20px via token |
| SessionClock opening-range score | 23px | 20px |
| SessionClock session-row name | 16.5px | 15.5px |

### 5.3 Space, radii, rows

| Token / element | Round 1 | Round 2 |
|---|---|---|
| `--radius-card-xl` | 18px | 16px |
| `--radius-row` | 16px | 14px |
| `--radius-lg` | 14px | 12px |
| `--radius-hero` | 24px | 24px (signature — held) |
| Hero / card padding (SessionHero, PairHero, SessionClock cards, Modal, Sheet) | p-5 (20px) | p-4 (16px) |
| Shared Card padding | p-4 (16px) | 14px |
| PairRow padding — home / default | py-3 (12px) | py-2 (8px) |
| PairRow padding — markets | py-3.5 (14px) | py-2.5 (10px) |
| RankTable cell padding (both variants) | px-4 py-3 | px-3.5 py-2 |
| RankTable (reference) status pill | h-10, min-w 112px, 13px | h-9, min-w 100px, 12px |
| SessionClock session rows | py-3.5, 48px icon tiles | py-2.5, 40px tiles |
| SessionClock quarter blocks | h-9 (36px) | h-8 (32px) |
| Section gaps (SessionClock stack, hero meta rows) | space-y-4 / mt-4 | space-y-3.5 / mt-3 |

### 5.4 Chips, pills, controls, nav

| Element | Round 1 | Round 2 |
|---|---|---|
| Status pills (StatusPill, PairRow, SessionHero chip) | 11–12px text, px-3 py-1 | 10.5–11px text, px-2.5 py-[3px] (≈ −20% padding) |
| PairHero bias pill | px-3.5 py-1.5, 14px | px-3 py-1, 13px |
| SessionClock state pill | px-3.5 py-1.5, 13px | px-3 py-1, 12px |
| Button md / lg height | 44 / 48px | 40 / 44px |
| Input / Select height | 44px | 40px |
| Tabs | px-4, 14px | px-3.5, 13.5px (height held at 40px) |
| Sidebar / admin nav rows | 44px, 15px | 40px, 14px |
| AppShell top bar | 56px | 50px |
| BottomNav (mini-app) | 60px bar, 24px icons, 11px labels | 54px bar, 20px icons, 10.5px labels |
| CreditPill | 36px, 14px | 34px, 13px |

### 5.5 App-level pass

| App | Change |
|---|---|
| Mini-app | Hero cards p-5 → p-4 (8 pages); Home root gap space-y-5 → 4; Home CTA buttons 64px → 56px, text 18 → 17px, icons 26 → 22; freshness strip tightened |
| User portal | Hero/panel cards p-6 → p-5 (9 pages; Membership sm:p-7 → p-6) |
| Landing | Section padding py-20/24 → py-16/20 (8 sections); hero py-14/20 → py-12/16, headline lg 3.4rem → 3rem (token steps shrink it further); nav bar 68 → 60px, links 44 → 40px; FinalCTA py-16/20 → py-12/16, radius 28 → 24px |
| Admin | `.tb-table` cell padding 10px → 7.5px vertical (−25%), font 14 → 13.5px; nav rows match Sidebar step |

### 5.6 Guardrails held

- Body text floor: nothing meaningful below 13.5px; 10.5–11px exists
  only on pills/labels. Base 16px and sm 14px untouched.
- Mini-app touch targets: bottom-nav items 54px, PairRow buttons are
  content-height ≥ 44px, PairHero watchlist button held at 40×40px,
  Home CTAs 56px — all ≥ 40px tall. Web buttons/inputs land exactly
  on the 40px step (44 → 40).
- Scores and prices keep `.tnum` tabular figures and stay the largest
  element in their rows — the hierarchy is unchanged, only scaled.
- No colour, copy, logo or data changes. The reference composition
  (gradient hero card, flag pairs, pills, ranked rows) is identical,
  just denser.

### 5.7 Verification

- All five builds green (mini-app, user-portal, admin-portal, landing,
  styleguide) incl. the CSS guard on every dist; built mini-app CSS
  spot-checked: `--text-4xl: 1.625rem`, `--radius-row: 14px` present.
- Tests: mini-app 47/47, user-portal 21/21.
- Mini-app entry JS: 180.87 KB ≤ 200 KB budget (class-only changes;
  no JS weight added).
