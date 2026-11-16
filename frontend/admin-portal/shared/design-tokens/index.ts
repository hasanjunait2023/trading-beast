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

export const tierColors = {
  FREE: { text: '#8896bd', bg: 'rgba(136,150,189,0.12)', border: 'rgba(136,150,189,0.2)' },
  PRO: { text: '#6b86ff', bg: 'rgba(107,134,255,0.12)', border: 'rgba(107,134,255,0.25)' },
  ELITE: { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' },
} as const;