import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0B1220',
        surface: '#0F1A2E',
        panel: '#111C30',
        accent: {
          DEFAULT: '#3DDC97',
          muted: '#2AA875',
        },
        signal: '#F2B807',
        danger: '#EF5B5B',
        slate: {
          925: '#0D1524',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(61,220,151,0.15), 0 8px 30px rgba(61,220,151,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
