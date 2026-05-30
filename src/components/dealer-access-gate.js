'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { APP_SESSION_EVENT, getAppSession } from '@/lib/app-session';

export default function DealerAccessGate({ children, requiredRole = 'dealer' }) {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('guest');

  useEffect(() => {
    function syncSession() {
      setRole(getAppSession().role);
      setReady(true);
    }

    syncSession();
    window.addEventListener(APP_SESSION_EVENT, syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener(APP_SESSION_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  if (!ready) {
    return (
      <div className="notice-card">
        <strong>Načítám stav B2B přístupu</strong>
        <p>Ověřuji lokální přihlášení a roli uživatele v této relaci.</p>
      </div>
    );
  }

  const hasAccess = requiredRole === 'authenticated' ? role === 'person' || role === 'dealer' : role === 'dealer';

  if (hasAccess) {
    return children;
  }

  return (
    <div className="payment-card">
      <span className="payment-badge">{requiredRole === 'dealer' ? 'Firemní modul' : 'Přihlášení vyžadováno'}</span>
      <strong>{requiredRole === 'dealer' ? 'Tento modul je dostupný pro autobazary.' : 'Přihlaste se pro přístup k tomuto modulu.'}</strong>
      <p>
        {requiredRole === 'dealer'
          ? 'Monitoring a popisky jsou součástí firemního přístupu. Ocenění auta je dostupné bez přihlášení, skaut nabídek po zvolení libovolné role.'
          : 'Skaut nabídek se otevře po výběru role v profilu. Stačí si zvolit soukromý účet nebo autobazar.'}
      </p>
      <div className="cta-row">
        <Link className="menu-card-button" data-tone="dealer" href={requiredRole === 'dealer' ? '/profil?mode=dealer' : '/profil'}>
          {requiredRole === 'dealer' ? 'Přihlásit autobazar' : 'Přejít do profilu'}
        </Link>
        <Link className="hero-secondary" href="/odhad-ceny">
          Pokračovat na ocenění
        </Link>
      </div>
    </div>
  );
}