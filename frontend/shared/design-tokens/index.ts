// Shared design tokens — single source of truth for landing, user portal, admin portal.
// Reference direction: "Neon Dark Tech" — navy-black base, electric blue + violet ring glow,
// floating device mockups, gradient-blue buttons, white content sections with blue highlights.

export const palette = {
  bg: '#060918',
  bgDeep: '#03050d',
  bgNavy: '#0a0f24',
  surface: '#0c1126',
  surfaceElevated: '#121a33',
  surfaceHover: '#18213f',
  border: '#1c2748',
  borderStrong: '#283358',

  text: '#e8edfb',
  textMuted: '#8896bd',
  textFaint: '#556080',

  blue: '#4f6dff',
  blueDeep: '#2f4ae0',
  blueBright: '#6b86ff',
  violet: '#7c5cff',
  cyan: '#22d3ee',

  blueGradStart: '#4f6dff',
  blueGradEnd: '#7c5cff',

  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  buy: '#22c55e',
  sell: '#ef4444',
  neutral: '#556080',
} as const;

export const fonts = {
  display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
  body: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
} as const;

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '18px',
  xl: '26px',
  full: '9999px',
} as const;

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,0.4)',
  md: '0 8px 24px rgba(0,0,0,0.5)',
  lg: '0 20px 50px rgba(0,0,0,0.6)',
  glow: '0 0 40px rgba(79,109,255,0.35)',
  glowViolet: '0 0 40px rgba(124,92,255,0.4)',
} as const;

export const motion = {
  fast: '140ms cubic-bezier(0.22, 1, 0.36, 1)',
  normal: '260ms cubic-bezier(0.22, 1, 0.36, 1)',
  slow: '480ms cubic-bezier(0.22, 1, 0.36, 1)',
  spring: '400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const gridBg =
  'linear-gradient(rgba(79,109,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(79,109,255,0.05) 1px, transparent 1px)';

export const vignette =
  'radial-gradient(120% 80% at 50% 0%, transparent 35%, rgba(3,5,13,0.8) 100%)';

export const gradientBlue =
  'linear-gradient(135deg, #4f6dff 0%, #6b86ff 50%, #7c5cff 100%)';

export const gradientBlueButton =
  'linear-gradient(135deg, #4f6dff 0%, #6b86ff 100%)';

export const ringGlow =
  'conic-gradient(from 0deg, rgba(79,109,255,0.9), rgba(124,92,255,0.7), rgba(34,211,238,0.5), rgba(79,109,255,0.9))';

// ---------------------------------------------------------------------------
// Z0 additions (design handoff §2): LIGHT theme is the product default
// (emerald/mint); `palette` above remains the DARK "Neon Dark Tech" variant.
// CSS consumers should prefer the custom properties in ../theme.css; these
// constants mirror them for JS/TS use (charts, inline styles, tests).
// ---------------------------------------------------------------------------

export const lightPalette = {
  bg: '#f5faf8',
  surface: '#ffffff',
  surfaceElevated: '#e5f5ef',
  surfaceHover: '#eef7f3',
  border: '#d7e5df',
  borderStrong: '#b9d2c7',

  text: '#101d2c',
  textMuted: '#4c625d',
  textFaint: '#7d938c',

  accent: '#00664b',
  accentHover: '#00553e',
  accentText: '#ffffff',
  accentSoft: '#e5f5ef',

  success: '#0b7a43',
  warning: '#92600a',
  danger: '#b4232f',
  info: '#175cd3',

  heroGradStart: '#054333',
  heroGradEnd: '#007959',
} as const;

export const gradientHeroLight =
  'linear-gradient(135deg, #054333 0%, #007959 100%)';

/** Market status (rank) semantics — text label always accompanies color. */
export const statusColors = {
  light: {
    focus: { bg: '#cdeee0', text: '#06543c' },
    watch: { bg: '#fbefc0', text: '#7a5a00' },
    avoid: { bg: '#f6dee3', text: '#7a2438' },
    unavailable: { bg: '#e8edf0', text: '#4a5a66' },
  },
  dark: {
    focus: { bg: 'rgba(16,185,129,0.16)', text: '#34d399' },
    watch: { bg: 'rgba(245,197,66,0.15)', text: '#f5c542' },
    avoid: { bg: 'rgba(190,80,100,0.18)', text: '#f08ca0' },
    unavailable: { bg: 'rgba(136,150,189,0.16)', text: '#9aa8c7' },
  },
} as const;

/** Directional bias semantics — kept separate from rank/status. */
export const biasColors = {
  light: { bullish: '#0b7a43', bearish: '#c22633', neutral: '#4c625d' },
  dark: { bullish: '#34d399', bearish: '#f87171', neutral: '#8896bd' },
} as const;

export type MarketStatus = 'focus' | 'watch' | 'avoid' | 'unavailable';
export type Bias = 'bullish' | 'bearish' | 'neutral';

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
} as const;

export const typeScale = {
  pageTitle: '30px',
  groupTitle: '19px',
  body: '15px',
  caption: '12px',
} as const;

export const tierColors = {
  FREE: { text: '#8896bd', bg: 'rgba(136,150,189,0.12)', border: 'rgba(136,150,189,0.2)' },
  PRO: { text: '#6b86ff', bg: 'rgba(107,134,255,0.12)', border: 'rgba(107,134,255,0.25)' },
  ELITE: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
} as const;