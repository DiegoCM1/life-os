import type { Config } from 'tailwindcss';
import { palette, fonts, glow } from './src/design/tokens';

// Colors, fonts, and glow shadows all derive from src/design/tokens.ts — the
// single source of truth. Don't hardcode hex here; edit tokens.ts instead.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...palette },
      fontFamily: {
        mono: fonts.mono.split(',').map((f) => f.trim()),
        sans: fonts.sans.split(',').map((f) => f.trim()),
      },
      boxShadow: {
        glow: glow(palette.accent),
        'glow-accent': glow(palette.accent),
        'glow-good': glow(palette.good),
        'glow-bad': glow(palette.bad),
        'glow-warn': glow(palette.warn),
        'glow-tregua': glow(palette.tregua),
      },
      keyframes: {
        pulsebad: {
          // Flash brighter than the resting bad-dim background so the pulse reads.
          '50%': { backgroundColor: '#3a1620' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        pulsebad: 'pulsebad 1.2s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
