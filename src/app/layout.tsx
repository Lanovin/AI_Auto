import type { Metadata } from 'next';
import { Hanken_Grotesk, Inter, Spline_Sans_Mono } from 'next/font/google';
import './legacy.css';
import './globals.css';

// ── Cargent typography ─────────────────────────────────────────────
// Body i display — jeden čistý grotesk; nadpisy nesou těžší řezy
// (700/800), look po vzoru data-driven platforem typu brego.io.
const hanken = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-hanken',
  display: 'swap',
});

// Numerics / code — tabular monospace with strong digit contrast.
const splineMono = Spline_Sans_Mono({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500'],
  variable: '--font-spline-mono',
  display: 'swap',
});

// ── Legacy AutoAI font (kept for existing tool pages) ──────────────
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Cargent — AI oceňovací agent pro ojeté vozy',
    template: '%s | Cargent',
  },
  description:
    'Cargent projde živé inzeráty, výbavu a ověřenou historii vozu a vrátí tržní ocenění s intervalem spolehlivosti — ne jen tip od oka.',
  icons: {
    icon: '/logo_cargent.png',
    apple: '/logo_cargent.png',
  },
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="cs" data-scroll-behavior="smooth">
      <body
        className={[
          hanken.variable,
          splineMono.variable,
          inter.variable,
          'min-h-screen bg-paper text-ink antialiased',
          'font-body',
        ].join(' ')}
      >
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-paper focus:outline-none"
          href="#main"
        >
          Přeskočit na hlavní obsah
        </a>
        {children}
      </body>
    </html>
  );
}
