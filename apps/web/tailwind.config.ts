import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e14',
        card: '#131826',
        edge: '#1f2738',
        ink: '#e6e9f0',
        sub: '#8b93a7',
        accent: '#4f8cff',
        good: '#3ddc84',
        bad: '#ff5252',
        warn: '#ffb020',
        'good-dim': '#10231a',
        'bad-dim': '#2a1216',
        'warn-dim': '#2a2107',
        well: '#0e1320',
      },
      keyframes: {
        pulsebad: {
          '50%': { backgroundColor: '#3a161c' },
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
