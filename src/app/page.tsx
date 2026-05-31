import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import TrustStrip from '@/components/landing/TrustStrip';
import Segments from '@/components/landing/Segments';
import HowItWorks from '@/components/landing/HowItWorks';
import Engine from '@/components/landing/Engine';
import Testimonials from '@/components/landing/Testimonials';
import B2B from '@/components/landing/B2B';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

/**
 * Cargent homepage — po UX/UI refaktoru.
 *
 * Informační architektura (shora dolů):
 *
 *   Header       — sticky navigace
 *   Hero         — problém uživatele, jedno dominantní CTA, demo výsledek
 *   TrustStrip   — 4 rychlé důkazní body (hned pod heroem, před přehybem)
 *   Segments     — B2C vs B2B oddělené cesty; přehled nástrojů sekundárně
 *   HowItWorks   — 3 kroky, žádný jargon
 *   Engine       — "Proč věřit naší ceně?" s konkrétními čísly
 *   Testimonials — sociální důkaz, reálné výsledky
 *   B2B          — API a firemní řešení (sekundární sekce)
 *   CTA          — jedno jasné finální sdělení
 *   Footer
 *
 * Klíčové UX změny oproti předchozí verzi:
 *   ✓ Hero: problém-first místo technologie-first
 *   ✓ TrustStrip: důvěra před přehybem (bylo až v Engine sekci)
 *   ✓ Segments: jasné B2C / B2B cesty místo 4 rovnocenných nástrojů
 *   ✓ HowItWorks: 3 kroky místo 4, nulový jargon
 *   ✓ Engine: lidský framing místo akademických metrik
 *   ✓ Testimonials: nová sekce se sociálním důkazem
 *   ✓ CTA: odstraněn duplicitní obsah, jedno jasné sdělení
 *   ✓ Services sekce: nahrazena Segments (přímější, segmentovaná)
 */
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Segments />
        <HowItWorks />
        <Engine />
        <Testimonials />
        <B2B />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
