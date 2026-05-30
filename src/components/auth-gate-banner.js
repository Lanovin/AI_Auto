'use client';

import Link from 'next/link';
import { useClientAuthState } from '@/lib/client-auth';

export default function AuthGateBanner({ accessLevel }) {
  const { ready, role } = useClientAuthState();

  if (!ready) return null;

  const hasAccess =
    accessLevel === 'authenticated'
      ? role === 'person' || role === 'dealer'
      : role === 'dealer';

  if (hasAccess) return null;

  const isDealer = accessLevel === 'dealer';

  return (
    <div className="sticky bottom-0 z-40 border-t border-brand-100 bg-white/97 shadow-[0_-4px_24px_rgba(24,95,165,0.10)] backdrop-blur">
      <div className="mx-auto flex max-w-300 items-center justify-between gap-4 px-6 py-4 md:px-12">
        <p className="text-[14px] text-neutral-600">
          {isDealer
            ? 'Pro spuštění tohoto modulu se přihlaste jako autobazar.'
            : 'Formulář je připravený — pro odeslání se přihlaste.'}
        </p>
        <Link
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-800"
          href={isDealer ? '/profil?mode=dealer' : '/profil'}
        >
          {isDealer ? 'Přihlásit se jako autobazar' : 'Přihlásit se'}
        </Link>
      </div>
    </div>
  );
}
