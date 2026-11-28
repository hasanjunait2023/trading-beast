# TradingBeast Colour System

One palette, token-driven. Source of truth: `frontend/shared/theme.css`.
Components must reference tokens (`var(--color-…)`, Tailwind arbitrary
values like `bg-[var(--color-accent)]`) — never raw hex. The only
exceptions are **artwork** (see §6).

## 1. Emerald primary scale

Anchored on the brand primary `#00664B` (= 600). Use 600 for primary
actions/links, 700 for hover, 100–300 for tints and fills, 900/950 for
hero depths.

| Step | Hex | Typical use |
|---|---|---|
| 50 | `#eefaf4` | faintest tint |
| 100 | `#d7f2e3` | chips, soft fills |
| 200 | `#b0e4cb` | borders on tint |
| 300 | `#7dd3ac` | decorative accents |
| 400 | `#35b57f` | icons on dark |
| 500 | `#0e9464` | gradient mid-steps, markers |
| 600 | `#00664B` | **primary** — buttons, links, accent |
| 700 | `#00553e` | primary hover |
| 800 | `#04452f` | deep accents |
| 900 | `#043d2d` | hero gradient base |
| 950 | `#033326` | hero deepest stop |

Token: `--color-primary-50 … --color-primary-950`.

## 2. Mint surface scale

| Token | Hex | Use |
|---|---|---|
| `--color-mint-50` | `#fcfffd` | canvas top |
| `--color-mint-100` | `#f5faf8` | app canvas (`--color-bg`) |
| `--color-mint-200` | `#eef8f3` | mint panel |
| `--color-mint-300` | `#e5f5ef` | elevated surface / soft accent |
| `--color-mint-400` | `#d7e5df` | border on mint |

Surfaces: canvas `#f5faf8` → panel `#eef8f3` → card `#ffffff`.
Heroes invert to the emerald scale (900 → 700 → hero-500 `#00875f`).

## 3. Emerald-tinted neutrals

All greys carry the emerald hue — no blue-greys in the light theme.
(This chapter fixed `--color-text`: `#101d2c` navy → `#10201b`.)

| Token | Hex | Maps to |
|---|---|---|
| `--color-neutral-950` | `#10201b` | `--color-text` |
| `--color-neutral-700` | `#33473f` | strong secondary text |
| `--color-neutral-600` | `#4c625d` | `--color-text-muted` |
| `--color-neutral-500` | `#59766e` | `--color-text-faint` |
| `--color-neutral-300` | `#b9d2c7` | `--color-border-strong` |
| `--color-neutral-200` | `#d7e5df` | `--color-border` |
| `--color-neutral-100` | `#e5f0eb` | faint fills |

## 4. Semantic colours (always text + bg pairs)

| Meaning | Text | Bg | Rule |
|---|---|---|---|
| Focus | `#06543c` | `#cdeee0` | rank status — emerald |
| Watch | `#7a5a00` | `#fbefc0` | rank status — amber |
| Avoid | `#7a2438` | `#f6dee3` | rank status — muted rose |
| Unavailable | `#4a5a66` | `#e8edf0` | no data — slate |
| Success | `#0b7a43` | `#dcf5e7` | feedback |
| Warning | `#92600a` | `#fdf0cd` | feedback |
| Danger | `#b4232f` | `#fde3e5` | destructive / errors |
| Info | `#175cd3` | `#e0ebfd` | feedback |
| Bullish | `#0b7a43` | — | directional bias (≠ rank) |
| Bearish | `#c22633` | — | directional bias (≠ rank) |

Avoid is deliberately **not** slate: Unavailable already owns slate,
and collapsing two different meanings ("ranked, stay away" vs "no
data") into one colour would make the radar unreadable. Avoid instead
sits in the danger hue family at lower chroma, so the system reads as
one palette while the statuses stay distinct.

Session state reuses the same hues: live = success green,
upcoming = warning amber, closed = unavailable slate.

## 5. Contrast verification (WCAG AA, computed)

Every pairing used for body text passes AA (≥ 4.5:1). Measured with
the WCAG relative-luminance formula:

| Pairing | Ratio |
|---|---|
| text `#10201b` on canvas / white | 16.0 / 16.9 |
| text-muted `#4c625d` on white / canvas | 6.5 / 6.2 |
| text-faint `#59766e` on white | 5.0 |
| white on primary `#00664b` / hover `#00553e` | 7.0 / 8.9 |
| link `#00664b` on mint panel | 6.5 |
| Focus text on Focus bg | 7.2 |
| Watch text on Watch bg | 5.5 |
| Avoid text on Avoid bg | 7.7 |
| Unavailable text on bg | 6.0 |
| success / warning / danger / info on white | 5.4 / 5.4 / 6.5 / 6.0 |
| bullish / bearish on white | 5.4 / 5.8 |
| white on primary-action gradient (worst stop) | 4.55 |
| white on session-hero gradient (worst stop) | 4.53 |
| hero chip text `#04503a` on chip bg `#d9f5e6` | 8.2 |
| hero soft text `#a9ecc9` on hero 900 / 700 stops | 9.1 / 4.8 |

Gradient rule: **white text must hold ≥ 4.5:1 at the brightest stop**,
not just on average. This chapter darkened two gradients that failed
it — primary-action end `#00a870` (3.07) → `#00875c`, session-hero
end `#00a36f` (3.25) → `#00875f`. Hero soft text is a bold label that
sits over the dark left stops plus a darkening overlay (≥ 4.8:1 in
position); it must never be placed on the bright right stop.

Dark variant (`[data-theme="dark"]`, Neon Dark Tech) keeps the same
token names and semantics on navy surfaces; its measured pairings:
text 16.0, muted 6.4, faint 5.7, accent-text on accent 4.7,
focus 9.7, watch 11.5, avoid 8.0, success 10.7, danger 6.8, white on
primary-action gradient 4.9–6.0 (deepened this chapter from 4.2–4.4).

## 6. Artwork exemption

National-flag artwork (`PairFlags`), hero illustrations
(`SessionHeroArt`, `MarketsHeroArt`, `RadarArt`) and the PairHero
decorative strokes carry intrinsic colours (flag reds/blues, glow
highlights) that are not UI chrome. They are exempt from the token
rule but must never be reused as text/background colours.

## 7. Known drift (documented, not yet migrated)

- `frontend/shared/design-tokens/index.ts` still exports a legacy
  Neon-only `palette`/`fonts` object. Runtime code imports only its
  **types**; the palette export is unused. Migrate or delete it in a
  follow-up so theme.css stays the single source.
- `frontend/shared/global.css` is the pre-Z0 legacy stylesheet; no app
  imports it (apps import `theme.css`). Same follow-up.
- App page files still contain isolated hardcoded hexes (mostly in
  hero art and one-off illustrations); shared components are clean as
  of this chapter.
