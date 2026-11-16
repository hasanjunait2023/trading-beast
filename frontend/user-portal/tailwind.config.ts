import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // Neon Dark Tech palette — navy-black base, electric blue, glass surfaces
        navy: {
          950: '#03050d',
          900: '#060918',
          850: '#0a0f24',
          800: '#0c1126',
          700: '#121a33',
          600: '#18213f',
          500: '#1c2748',
        },
        electric: {
          50: '#e8f0ff',
          100: '#c4d6ff',
          200: '#8fb0ff',
          300: '#6b86ff',
          400: '#4f6dff',
          500: '#2f4ae0',
          600: '#1c34b0',
          700: '#0f2270',
        },
        neon: {
          cyan: '#22d3ee',
          violet: '#7c5cff',
          blue: '#4f6dff',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'neon-sm': '0 0 12px rgba(79,109,255,0.25)',
        'neon': '0 0 30px rgba(79,109,255,0.4)',
        'neon-lg': '0 0 60px rgba(79,109,255,0.55)',
        'neon-violet': '0 0 40px rgba(124,92,255,0.45)',
        'glass': '0 8px 32px rgba(0,0,0,0.5)',
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'spin-slow': 'spin 18s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22,1,0.36,1)',
        'scale-in': 'scaleIn 0.35s cubic-bezier(0.22,1,0.36,1)',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', filter: 'blur(24px)' },
          '50%': { opacity: '0.85', filter: 'blur(36px)' },
        },
      },
      backgroundImage: {
        'grid-navy': 'linear-gradient(rgba(79,109,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,109,255,0.06) 1px, transparent 1px)',
        'grad-hero': 'linear-gradient(135deg, #4f6dff 0%, #6b86ff 50%, #7c5cff 100%)',
        'grad-blue': 'linear-gradient(135deg, #4f6dff 0%, #6b86ff 100%)',
        'grad-ring': 'conic-gradient(from 0deg, #4f6dff, #7c5cff, #22d3ee, #4f6dff)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
};

export default config;