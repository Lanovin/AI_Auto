# Cargent — ocenění ojetých vozů z reálných inzerátů

Next.js 15 aplikace pro odhad tržní ceny ojetého auta. Claude s web search
prohledá inzertní portály, server z nalezených inzerátů spočítá vážený medián
(korekce na nájezd, stáří, převodovku; vyřazení odlehlých) a vrátí cenu
s pásmem, výkupní cenou a odkazy na zdroje.

## Jak to funguje

1. Uživatel zadá auto na `/odhad-ceny` (přihlášený účet, platí se tokeny).
2. `POST /api/price-estimator` odečte tokeny, spustí `runScan()` (Claude Sonnet 5,
   expertní tier Opus 5) a z pole `comparables` spočítá cenu (`src/lib/valuation.ts`).
3. Při chybě skenu se tokeny automaticky vrátí (refund přes service-role klíč).
4. Výsledek se uloží do historie účtu a do sdílené cache (Neon).

## Spuštění

```bash
npm install
cp .env.example .env.local   # doplňte klíče
npm run dev
```

Databáze: spusťte SQL z `supabase/migrations/` (v pořadí) v Supabase SQL editoru
a `neon/migrations/` v Neon Console.

## Klíčové soubory

| Cesta | Co dělá |
|---|---|
| `src/lib/run-scan.ts` | Prompty, volání Claude (streaming, pause_turn), sanitizace |
| `src/lib/valuation.ts` | Serverový výpočet ceny z inzerátů |
| `src/app/api/price-estimator/route.ts` | Účtování tokenů → sken → refund při selhání |
| `src/lib/tokens.ts` | Ceník akcí v tokenech, popis úrovní ocenění |
| `src/lib/stripe/config.ts` | Balíčky tokenů a předplatné |
| `src/app/api/stripe/webhook/route.ts` | Připsání tokenů po platbě (idempotentní) |
| `src/components/estimator/` | Formulář ocenění a výsledek |
| `src/components/landing/` | Úvodní stránka |
| `src/lib/content/registry.ts` | Editovatelné texty (admin CMS `/admin`) |

Legacy nástroje pro autobazary (popisky, monitoring, skaut, firemní profil)
běží jako HTML v iframe (`*.html`, `shared.js`) přes `/legacy/*`.

## Nastavení služeb

Kompletní checklist pro ostrý provoz (účty, klíče, migrace, Stripe webhook,
DNS, kontrola po nasazení) je v **[DEPLOY.md](DEPLOY.md)**. Stručně:

- **Supabase** — spustit `supabase/migrations/*.sql` v pořadí, včetně
  `0010_harden_security.sql` (bez něj si uživatel může přes veřejný klíč sám
  přičíst tokeny). Google přihlášení: Authentication → Providers → Google;
  do Redirect URLs přidat `https://<doména>/auth/callback`.
- **Neon** — spustit `neon/migrations/*.sql` (cache skenů, cenové statistiky).
- **Stripe** — vytvořit produkty (viz `.env.example`), webhook na
  `/api/stripe/webhook` s událostmi `checkout.session.completed`,
  `checkout.session.async_payment_succeeded`, `invoice.payment_succeeded`,
  `customer.subscription.updated/deleted`.
- **Kontaktní formulář** — Resend API klíč v `RESEND_API_KEY` + ověřená doména.
- **Admin** — `ADMIN_PASSWORD` min. 10 znaků; v produkci se slabým heslem je
  administrace vypnutá.
