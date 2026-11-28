# TradingBeast — Logo Guidelines (compact)

> One mark everywhere. Write for non-designers: more "do"s than "don't"s.
> Master files live in `frontend/shared/assets/logo/`. Concepts and the
> presentation board live in `docs/brand/` (`presentation-board.png`).

## 1. The logo

- **Idea**: three concentric ring segments — the Asian, London and New York
  sessions — orbit one solid dot: the pair that deserves your focus. It is
  the product's name, *Session Focus Radar*, drawn as a single gesture.
  No chart, no arrow, no bull: nothing a competitor could claim.
- **Construction**: pure geometry on a 256-unit canvas. Three annular
  segments (radii 33–55, 68–90, 103–125; spans 305°/305°/228° with gaps at
  −50°, 120° and 230°) around a centre dot (r 17). Flat shapes only — no
  gradients, strokes or effects are baked into the mark.
- **Versions**:
  - `mark.svg` — primary symbol, colour (emerald rings, bright focus dot)
  - `mark-mono.svg` — one-colour emerald (use whenever colour is limited)
  - `mark-black.svg` / `mark-reversed.svg` — black / white one-colour
  - `mark-small.svg` / `mark-small-reversed.svg` — small-size cut (two
    heavier rings, larger dot) for anything rendered at 32 px or below
  - `lockup-horizontal.svg` — symbol + wordmark, the default for headers
  - `lockup-stacked.svg` — symbol above wordmark, for square spaces
  - `app-icon.svg` — white mark on the emerald rounded square (Telegram,
    PWA, social avatars); PNG set in `png/`, full web set in `web-icons/`
- **Wordmark note**: the lockups set "TradingBeast" as styled text in the
  product font stack (see §5). Before the lockups are used outside the
  product (print, partner material), the wordmark must be converted to
  outlined paths from the final font files (Inter — see §5).

## 2. Clear space

Keep a clear zone on all sides equal to **the diameter of the focus dot**
(the solid centre circle) at the size the logo is shown — about 13% of the
symbol's width. Prefer twice that when the layout allows. Nothing enters
the zone: no type, rules, edges of other graphics, or page trim.

## 3. Minimum size

| Version | Screen | Print |
|---|---|---|
| Horizontal lockup | 120 px wide | 32 mm wide |
| Stacked lockup | 96 px wide | 25 mm wide |
| Symbol (standard) | 32 px (below this, switch to the small cut) | 8 mm |
| Symbol (small cut) | 16 px | 5 mm |
| App icon | 48 px | — |

## 4. Colour

Logo colours (final — these belong to the mark itself):

| Name | HEX | RGB | Use |
|---|---|---|---|
| Beast Emerald | #00664B | 0 · 102 · 75 | Rings; app-icon tile; one-colour version |
| Focus Bright | #00A870 | 0 · 168 · 112 | The focus dot in the colour version only |
| Ink | #101D2C | 16 · 29 · 44 | Wordmark in lockups on light backgrounds |

Full product palette (canvas, surfaces, hero gradient, semantic colours):
see `docs/brand/COLOR-SYSTEM.md` — token scales anchored on Beast Emerald
#00664B, all body-text pairings verified WCAG AA. CMYK / Pantone
conversions are produced when print material is commissioned.

**Approved logo/background pairs**: colour mark on white or the product's
mint canvas · emerald mono on white/mint · white (reversed) on Beast
Emerald, on the deep hero green, or on Ink · black on white. On photos,
use the white or black version on a calm area, or the app-icon tile.

## 5. Typography

- Product type system: **Inter** (single family) — UI 400/500/600,
  display 700/800 at −0.015em tracking, tabular figures for scores and
  prices; full scale in `docs/brand/TYPE-AND-SCALE.md`.
- The lockups and the in-product wordmark assume that system; do not set
  the wordmark in any other typeface, and never retype it in a document
  font as a substitute logo — use the SVG files.
- Licences: Inter is SIL Open Font License 1.1 — logo use and external
  distribution of the lockups are permitted.

## 6. Don'ts

Don't stretch or squash · don't recolour outside §4 · don't rotate (the
gaps' positions are the design) · don't add shadows, outlines, gradients
or effects · don't rearrange or resize the parts of a lockup · don't
separate the dot from the rings or change its colour alone · don't place
the colour mark on busy backgrounds without the app-icon tile · don't
recreate the wordmark by typing it · don't use the retired bar-chart
glyph — it was replaced by this mark.

## 7. System seeds

The rings are the start of a kit of parts: the sweep of the arcs is the
product's loading/progress motion; single arc segments mark the three
sessions in clocks and headers; the focus dot is the bullet/marker
device. Keep radii and the 22-unit ring weight when extending it.

## 8. Contact

Questions about usage: the TradingBeast repo maintainers.
Master files: `frontend/shared/assets/logo/` · rationale and test
evidence: `docs/brand/` (concepts, preview sheet, presentation board).
Trademark clearance has not been performed — run a professional search
before paid acquisition or print at scale.
