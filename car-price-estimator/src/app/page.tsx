import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Services from '@/components/landing/Services';
import HowItWorks from '@/components/landing/HowItWorks';
import Engine from '@/components/landing/Engine';
import B2B from '@/components/landing/B2B';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

/**
 * Cargent landing — composition root.
 *
 * Flow (top → bottom):
 *   Header (sticky)
 *   Hero        — pitch + live Instrument valuation showcase
 *   Services    — 4 tools side-by-side, direct routing to each
 *   HowItWorks  — 4-step process
 *   Engine      — accuracy metrics + comparables table
 *   B2B         — API for partners (ink-dark section)
 *   CTA         — final ask
 *   Footer
 *
 * Removed from earlier iteration: Ticker (decorative noise) and Segments
 * (abstract audience cards) — replaced by the concrete Services grid so
 * visitors reach tools in one click instead of scrolling through marketing.
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Engine />
        <B2B />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
