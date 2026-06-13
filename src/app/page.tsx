import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import TrustStrip from '@/components/landing/TrustStrip';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Engine from '@/components/landing/Engine';
import Ticker from '@/components/landing/Ticker';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustStrip />
        <Features />
        <HowItWorks />
        <Engine />
        <Ticker />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
