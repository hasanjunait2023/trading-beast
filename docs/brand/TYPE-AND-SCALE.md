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
