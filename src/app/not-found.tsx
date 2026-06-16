import Link from 'next/link';
import Header from '@/components/landing/Header';

export const metadata = { title: 'Stránka nenalezena' };

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-paper px-6" id="main">
        <div className="mx-auto max-w-md text-center">
          <p className="text-[80px] font-bold leading-none tracking-tight text-brass/20">404</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-tight text-ink">Stránka nenalezena</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
            Stránka, kterou hledáte, neexistuje nebo byla přesunuta.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-brass px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2"
            >
              Domovská stránka
            </Link>
            <Link
              href="/odhad-ceny"
              className="rounded-full border border-line px-6 py-3 text-[14px] font-medium text-ink/70 transition-colors hover:border-ink/20 hover:text-ink"
            >
              Odhad ceny
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
