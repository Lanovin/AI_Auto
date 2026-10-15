import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Engine from '@/components/landing/Engine';
import Ticker from '@/components/landing/Ticker';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Engine />
        <Ticker />
      </main>
      <Footer />
    </>
  );
}
