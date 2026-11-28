# TradingBeast Unslop Audit & Polish Pass

Method: [unslop](https://heydamir.design/unslop) by Damir Sokolovsky
(CC BY 4.0) — audit against `references/signs.md`, nine passes in order
(spacing → color → icons → copy → type → layout → details → visuals →
motion), checklist at the end. Mode: **polish** — the brand chapter
(Session Rings identity, Inter, colour tokens, zoom-out) already did
the heavy lifting; this pass fixes what the audit actually found and
changes nothing structural. Token values were not touched; page files
were only moved *onto* tokens where the mapping is exact.

## Direction

- **Product.** Session Focus Radar — session-by-session FX focus
  scores with evidence, for retail traders in Telegram and on the web.
- **Character.** Exact, calm, instrument-grade.
- **World.** The trading desk at session open — printed session
  clocks, ranked lists, one green accent.
- **Moments.** The emerald session hero with its ranked Focus list;
  the score itself, set in tabular figures.
- **Signature.** The Session Rings mark and the live-session dot.

## Findings

### 1. Spacing

| # | Finding | Disposition |
|---|---|---|
| S1 | Step-connector offsets `mt-[22px]` (Checkout) vs `mt-[17px]` (PaymentSubmitted) look inconsistent | **Won't fix — verified intentional.** Each exactly centres its 3px connector on its step circle (44px and 36px circles respectively; residual ≤1.5px). Odd values that centre something stay, per the method. |
| S2 | Fractional type sizes (`text-[12.5px]`, `13.5px`, `14.5px`) scattered in Plan/Journal pages | **Won't fix.** Optical sizes inside dense data cards; forcing them onto the scale would change the reference-matched layouts for no visible gain. Noted for a future type chapter. |
| S3 | General spacing rhythm | **Clean.** Post-brand-chapter surfaces are token/4px-driven; sibling cards share padding; nav rows uniform. No off-grid margin/padding values found outside S1/S2 classes of values. |

### 2. Color

| # | Finding | Disposition |
|---|---|---|
| C1 | Hero chip colours hardcoded `bg-[#d9f5e6] text-[#04503a]` in Journal (mini + portal) and PairDetail (portal), although exact tokens exist | **Fixed.** → `bg-[var(--color-hero-chip-bg)] text-[var(--color-hero-chip-text)]` (3 files). |
| C2 | Hero eyebrow colour hardcoded `text-[#a9ecc9]` in Plan (mini + portal) and Help (portal); SessionClockView already used the token for the identical role | **Fixed.** → `text-[var(--color-hero-text-soft)]` (3 files). |
| C3 | Admin chart palette (`admin-portal/src/lib/Charts.tsx`) contained a violet `#7c5cff` and an off-system cyan `#0e7490`; the other four entries duplicated token hexes | **Fixed.** Palette is now the semantic tokens themselves: accent, info, warning, avoid, danger, text-muted — same hues where they were already right, violet/cyan replaced by the system's info blue and avoid rose. |
| C4 | Landing hero text hexes (`#c9f2e2`, `#d7efe6`, `#a9d8c6`, `#054333` on the emerald panel) have no exact token equivalents | **Won't fix.** Inventing near-miss mappings would drift the colour; flagged for the system stream if landing hero tokens are wanted. |
| C5 | Journal/Credits inline SVG illustrations use `#35d99a` / `#43e39a` | **Won't fix.** Artwork, exempt per COLOR-SYSTEM §6; `#35d99a` is the `--color-hero-highlight` value, so the illustration is on-palette. |
| C6 | Telegram share button gradient (`#2aabee → #1d7fc2`, Alerts) | **Won't fix.** Telegram's own brand colour on a Telegram action; correct usage. |
| C7 | Dark theme `--grad-hero` is a blue→violet gradient (`#4f6dff → #7c5cff`) in theme.css | **Won't fix — out of scope, flagged.** Token values belong to the brand-system stream; this is the one remaining hue-gradient in the system and it should be replaced with the dark emerald hero gradient there. Nothing in the light theme references it. |
| C8 | Browser-frame dots in landing AppShowcase (`#e5b4b8` etc.) | **Won't fix.** Deliberate pastel window chrome echoing the status hues; decorative, not UI colour. |

### 3. Icons

| # | Finding | Disposition |
|---|---|---|
| I1 | No close icon exists in the shared set, so a `✕` text glyph served as the close/remove icon in 8 places (mini Home, Plan, Watchlist; portal Markets, Plan, WatchlistPage, PaymentHistory, PaymentSubmitted steps) — inconsistent size/weight everywhere | **Fixed.** Added `XIcon` to `shared/components/icons.tsx` (same 24-grid, stroke-2 construction as the set) and replaced every glyph at the size of its sibling icons (13–16px). |
| I2 | `✓` text glyph in portal Membership feature list and admin Settings check rows | **Fixed.** → `CheckIcon` (and `XIcon` for the failing state in Settings), token colours preserved. |
| I3 | PaymentSubmitted rejected state drew a text `!` in the status circle while its siblings render `CheckIcon`/`ClockIcon` at 36px | **Fixed.** → `XIcon size={36}`, matching the product's existing rejected = ✕ convention (PaymentHistory). |
| I4 | Admin shell (`Layout.tsx`) uses lucide-react while admin pages use the shared icon set | **Won't fix.** Two near-identical 2px-stroke sets; the shell is internally consistent, and several nav glyphs (LayoutDashboard, BarChart3, Activity, Menu, Sun) have no shared-set equivalents. Unifying is a refactor, not polish. Landing is uniformly lucide — consistent within itself. |

### 4. Copy

| # | Finding | Disposition |
|---|---|---|
| P1 | Mini-app referral share message ended `…when you join with my link!` — the only exclamation mark in interface-initiated copy (the portal's share text has none) | **Fixed.** Exclamation removed. |
| P2 | Help hero headline `Trade FX with Discretion and Clarity` in title case; every other headline in the product is sentence case | **Fixed.** → `Trade FX with discretion and clarity`. |
| P3 | SessionClock hero eyebrow `SESSION CLOCK` sits directly above the H1 `Session Clock` — the only hero eyebrow that adds no information (Plan's names the session, Help's is a positioning line) | **Fixed.** Eyebrow removed; hero composition (gradient, title, subhead, artwork) unchanged. |
| P4 | Placeholders reviewed (`Search help articles…`, `Search the pair catalog…`, phone/code hints) | **Won't fix.** Each names its scope or format; shortening them to bare `Search` would lose information on screens that carry several inputs. |
| P5 | Membership `Most popular` badge renders uppercase via class | **Won't fix.** Owner-directed conversion element from the onboarding chapter; a single quiet badge on the recommended plan. |
| P6 | Greeting headlines, hype words, unverified claims | **None found.** No `Welcome back`-style headlines, no supercharge/seamless/unlock/magic/revolutionize anywhere, no invented social proof. Landing copy states only verifiable product facts. |

### 5. Type

| # | Finding | Disposition |
|---|---|---|
| T1 | Portal Plan next-session card label `NEXT SESSION` — hardcoded caps at 11px with `tracking-[0.14em]` | **Fixed.** → `Next session`, tracking removed. |
| T2 | Uppercase tracked eyebrows as a system (9 landing sections, Plan/Help heroes) and uppercase status labels (PairHero, RankTable) | **Won't fix.** A consistent, reference-specified system: the RankTable comment records the design study (28) prescribing uppercase status pills, and status text is data, not chrome. Recasing the whole system is a design-chapter decision for the owner, not a polish fix. The two genuine defects inside the pattern (C2's hardcoded colour, P3's duplicated eyebrow) were fixed. |
| T3 | `font-extrabold` (800) used widely for headings/figures | **Won't fix.** Deliberate brand decision documented in TYPE-AND-SCALE.md (Inter 700/800 display voice); hierarchy still comes from size and colour. |
| T4 | Portal Tools used Tailwind `tabular-nums` (4×) while the whole product uses the `.tnum` utility | **Fixed.** → `tnum` (same tabular figures, plus the theme's font-feature settings). |

### 6. Layout

| # | Finding | Disposition |
|---|---|---|
| L1 | Compositions | **No changes.** Landing hero is an asymmetric split over a real product view; app shells fill the viewport with real proportions; section order untouched, per polish mode. |

### 7. Details

| # | Finding | Disposition |
|---|---|---|
| D1 | `shared/components/legacy.tsx` — pre-Z0 kit containing a blue→violet gradient `GradientButton` with a coloured glow shadow, a glass `GlassCard` and a `NeonRing` — still re-exported from the shared barrel | **Fixed by removal.** Verified zero consumers: no app page, the styleguide, landing or admin imports `NeonRing`, `GlassCard`, `GradientButton` or the legacy `StatCard` (portal Credits has its own local `StatCard`). File deleted and barrel re-export removed; the worst slop artefacts in the repo no longer ship. |
| D2 | Focus states | **Clean.** A global `:focus-visible` ring lives in theme.css; Button carries disabled/press states. |
| D3 | PairFlags soft shadows | **Clean.** Small, neutral, on flag artwork — depth, not glow. |

### 8. Visuals

| # | Finding | Disposition |
|---|---|---|
| V1 | Decorative filler (blobs, orbs, glowing grids) | **None in the apps.** Landing hero and showcase use the product's own real screens — the moment is the ranked radar itself, per the direction. No generated imagery added: app screens do not need it. |

### 9. Motion

| # | Finding | Disposition |
|---|---|---|
| M1 | `transition-all` on the shared `Button` | **Fixed.** → named properties (`color, background-color, border-color, box-shadow, opacity, transform`), duration unchanged. |
| M2 | `transition-all` on progress fills (mini Onboarding, mini Plan, portal Plan, admin Charts bar) | **Fixed.** → `transition-[width]` with existing durations. |
| M3 | Portal PairDetail OR-bands toggle animated its knob via `left` | **Fixed.** Knob now rides `translate-x-[20px]` with `transition-transform`; geometry identical (44px track, 20px knob, 2px inset). |
| M4 | `transition-all` on portal Setup session toggle buttons | **Fixed.** → named properties (`color, background-color, box-shadow, transform`). |
| M5 | Landing Hero and FinalCTA primary buttons lifted on hover (`hover:-translate-y-0.5`) | **Fixed.** Hover lift removed; the existing press response (`tb-press` / transform transition) stays. |
| M6 | Looping motion | **Clean.** No `animate-pulse`/`animate-ping` anywhere; the single `animate-spin` is a loading spinner, and the skeleton shimmer is loading feedback with reduced-motion handling in theme.css. Entrances use the shared `tb-*` tokens. |

## Checklist (unslop)

- [x] Direction written; every pass follows it
- [x] Spacing on the 4px scale; equal things equal sizes (S1/S2 documented exceptions)
- [x] Icons, labels and numbers in aligned columns (unchanged layouts)
- [x] One tinted neutral ramp, three text roles, one accent (brand token system, untouched values)
- [x] No hue gradients, gradient text, glows, coloured shadows or blobs in shipped UI (legacy kit deleted; C7 flagged to the system stream)
- [x] No emoji in the interface (verified by scan; ✕/✓ glyphs replaced with icons)
- [x] One icon set per app at consistent sizes/stroke (I4 documented)
- [x] Type per the brand system; no new uppercase tracked labels (T1 fixed; T2/T3 documented brand decisions)
- [x] No exclamation marks, no greeting headlines, no unverified claims (P1 fixed)
- [x] Numbers in one format with tabular figures (T4 fixed)
- [x] Nested radii — unchanged, token-driven
- [x] Table row states distinct — unchanged, token-driven
- [x] Buttons share the control radius — unchanged
- [x] Hero carries a real product visual (landing) / the ranked radar (apps)
- [x] First screen composed as a whole — unchanged
- [x] No looping or bouncy motion; named transitions only (M1–M5 fixed)
- [x] Template check: swap the name and the screens still could not fit another product — session heroes, session clock, ranked Focus/Watch/Avoid with evidence are this product's own nouns
