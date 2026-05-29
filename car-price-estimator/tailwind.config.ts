import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 legacy config. Coexists with the @theme block in globals.css —
 * BUT when both are present, this config wins for utility class generation.
 * That's why all Cargent tokens that should generate `bg-*`/`text-*` utilities
 * live here. The @theme block still produces CSS variables (referenced from
 * inline styles like `var(--color-paper)`), so it remains useful.
 */
const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/data/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Cargent palette ─────────────────────────────────────────
        paper: {
          DEFAULT: '#F6F4EE', // warm cream — page background
          2: '#EFEDE4',       // step darker — alternating sections
        },
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#14171C', // primary text, dark CTA background
          soft: '#3B4047',    // secondary text, hover state for ink CTA
        },
        dim: '#676C74',
        faint: '#9CA1A8',
        brass: {
          DEFAULT: '#B0791D', // gold accent — price, italic headlines, links
          2: '#946315',       // hover for brass CTA (B2B section)
        },
        emerald: {
          DEFAULT: '#1C6B57', // verified, positive deltas, status dots
        },
        line: {
          DEFAULT: 'rgba(20, 23, 28, 0.10)',
          2: 'rgba(20, 23, 28, 0.16)',
        },

        // ── Legacy AutoAI brand palette (existing tool pages) ──────
        brand: {
          50:  '#E6F1FB',
          100: '#B5D4F4',
          200: '#85B7EB',
          400: '#378ADD',
          600: '#185FA5',
          800: '#0C447C',
          900: '#042C53',
        },
      },
      fontFamily: {
        // Cargent typography (CSS vars set by next/font in layout.tsx)
        display: ['var(--font-fraunces)', 'Georgia', '"Times New Roman"', 'serif'],
        body:    ['var(--font-hanken)',   'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono:    ['var(--font-spline-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        // Legacy
        sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(24,95,165,0.04)',
        cargent: '0 30px 70px -34px rgba(20, 23, 28, 0.30)',
        'cargent-2': '0 18px 40px -22px rgba(20, 23, 28, 0.22)',
        'cargent-card': '0 1px 0 rgba(20, 23, 28, 0.04), 0 18px 44px -28px rgba(20, 23, 28, 0.20)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
};

export default config;
