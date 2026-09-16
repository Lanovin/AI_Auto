# Cargent — checklist pro ostrý provoz

Tenhle soubor je „co musím udělat já“, aby služba běžela naostro. Kód je
připravený; zbytek jsou účty, klíče a klikání v administracích třetích stran.
Pořadí je záměrné — každý krok dodá hodnotu pro ten další.

Legenda: **[povinné]** bez toho web v produkci nefunguje nebo je nebezpečný ·
**[doporučené]** bez toho jede, ale hůř · **[volitelné]**.

---

## 1. Supabase (přihlášení, účty, tokeny) — [povinné]

1. Založ projekt na <https://supabase.com> (region EU — Frankfurt).
2. **Project Settings → API** zkopíruj:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `Service role key` (secret!) → `SUPABASE_SERVICE_ROLE_KEY`
3. **SQL Editor** → spusť soubory ze `supabase/migrations/` **v tomto pořadí**:
   `0001_init` → `0002_tokens` → `0001_stripe_integration` → `0003_user_data`
   → `0004_admin_cms` → `0005_token_pricing` → `0006` → `0007_stripe_idempotency`
   → `0008_zero_starting_tokens` → `0009` → **`0010_harden_security`**.
   Skripty jsou idempotentní, opakované spuštění nevadí.
   > `0010` je bezpečnostní záplata. Bez ní si kdokoliv s veřejným klíčem
   > může přes REST API sám přičíst tokeny nebo číst zůstatky ostatních.
4. **Authentication → URL Configuration**:
   - `Site URL` = `https://<tvoje-doména>`
   - `Redirect URLs` přidej `https://<tvoje-doména>/auth/callback`
     a `http://localhost:3000/auth/callback`.
5. **Authentication → Providers → Email**: nech zapnuté „Confirm email“.
6. **[doporučené] Authentication → Email Templates**: u šablon *Confirm signup*
   a *Reset password* změň odkaz na
   `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
   (u resetu `type=recovery&next=/nove-heslo`). Pak funguje potvrzení
   i z jiného prohlížeče/telefonu. S výchozí šablonou funguje jen ve stejném
   prohlížeči, kde se uživatel registroval (jinak se musí přihlásit ručně).
7. **[doporučené] Authentication → SMTP**: vlastní SMTP (Resend umí i SMTP).
   Vestavěný Supabase mail má limit ~3 e-maily/hod a chodí do spamu.
8. **[doporučené] Google přihlášení**: Google Cloud Console → OAuth Client
   (Web) → Authorized redirect URI `https://<projekt>.supabase.co/auth/v1/callback`.
   Client ID + Secret vlož do Supabase → Providers → Google.

## 2. Neon (cache skenů, cenové statistiky) — [doporučené, prakticky povinné]

1. Založ projekt na <https://neon.tech> (EU region).
2. Zkopíruj **pooled** connection string → `DATABASE_URL`.
3. SQL Editor → spusť `neon/migrations/0000_market_scans.sql`, pak `0001_price_stats.sql`.

Bez Neonu web jede, ale každé ocenění platí plnou cenu AI (žádná cache
stejného auta na 7 dní) a do logu padají chyby připojení.

## 3. Anthropic (AI) — [povinné]

1. <https://console.anthropic.com> → API Keys → nový klíč → `ANTHROPIC_API_KEY`.
2. **Billing**: nastav kreditní kartu a **Usage limit** (měsíční strop), ať
   případné zneužití neprodraží víc než limit.
3. Orientační náklad na jedno ocenění: rychlé/standardní jednotky Kč,
   detailní desítky Kč, expertní (Opus) do ~40 Kč. Ceny v tokenech jsou
   nastavené tak, aby to pokryly; kontroluj měsíčně v Console → Usage.

## 4. Stripe (platby) — [povinné pro prodej tokenů]

1. Aktivuj účet (IČO, bankovní účet, ověření totožnosti). Do té doby jede
   jen **testovací režim** (klíče `sk_test_…`).
2. **Products** → vytvoř 4 jednorázové produkty v CZK (mode *one-time*):
   500 Kč, 1 000 Kč, 2 000 Kč, 5 000 Kč. Z každého zkopíruj **Price ID**
   (`price_…`) do `STRIPE_PRICE_BALICEK_500/1000/2000/5000`.
   [volitelné] Recurring produkt 1 490 Kč/měsíc → `STRIPE_PRICE_PREDPLATNE`.
3. **Developers → API keys** → `Secret key` → `STRIPE_SECRET_KEY`,
   `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. **Developers → Webhooks → Add endpoint**:
   URL `https://<tvoje-doména>/api/stripe/webhook`, události:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
   > Bez webhooku se po zaplacení tokeny NEPŘIPÍŠOU. Webhook musí mířit na
   > finální doménu (ne na preview URL Vercelu).
5. **Settings → Customer portal**: zapni portál (faktury, změna karty,
   zrušení předplatného) — web na něj odkazuje.
6. **Settings → Branding**: logo + barva `#2563EB`, ať checkout vypadá jako Cargent.
7. Po přepnutí na **live** klíče: znovu vytvořit produkty i webhook v live
   režimu (test a live jsou oddělené) a přepsat všechny `STRIPE_*` proměnné.

## 5. Resend (kontaktní formulář) — [doporučené]

1. <https://resend.com> → API key → `RESEND_API_KEY`.
2. **Domains** → přidej svou doménu, nastav DNS záznamy (SPF, DKIM), počkej
   na ověření. Pak `CONTACT_FROM_EMAIL=Cargent <info@tvoje-doména.cz>`.
   Bez ověřené domény funguje jen `onboarding@resend.dev` a doručí se pouze
   na e-mail vlastníka Resend účtu.
3. `CONTACT_TO_EMAIL` = kam mají chodit zprávy z formuláře.

## 6. Vercel (hosting) — [povinné]

1. Import repozitáře, framework Next.js (autodetekce).
2. **Settings → Environment Variables** — vlož VŠECHNY proměnné z `.env.example`
   pro prostředí *Production* (a rozumně i *Preview*):

   | Proměnná | Povinná |
   |---|---|
   | `ANTHROPIC_API_KEY` | ano |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ano |
   | `SUPABASE_SERVICE_ROLE_KEY` | ano (refundy, webhook, admin) |
   | `DATABASE_URL` | doporučená |
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BALICEK_*` | ano pro platby |
   | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ano pro platby |
   | `NEXT_PUBLIC_APP_URL` = `https://<tvoje-doména>` | ano (Stripe redirecty, sitemap, OG) |
   | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | doporučené |
   | `ADMIN_USERNAME`, `ADMIN_PASSWORD` (min. 10 znaků), `ADMIN_SESSION_SECRET` | ano pro /admin |
   | `DAILY_SCAN_LIMIT` | volitelná (výchozí 30) |

   Pozor na mezery kolem `=` a na konci hodnot — Vercel je bere doslova.
3. **Settings → Functions**: zapni **Fluid Compute** a region *Frankfurt (fra1)*.
   Expertní ocenění běží až 300 s; na Hobby plánu je bez Fluid Compute strop
   nižší a ocenění by končilo chybou 504. Pro jistotu **Pro plán**.
4. **Domains**: přidej doménu, nastav DNS (A/CNAME dle Vercelu), počkej na
   certifikát. Přesměruj `cargent.cz` → `www.cargent.cz` (nebo naopak) a
   stejnou variantu dej do `NEXT_PUBLIC_APP_URL`, Supabase Site URL i Stripe webhooku.
5. Deploy z větve, kterou chceš mít v produkci (dnes `AI_Auto`; zvaž merge do `main`).

## 7. Po nasazení — kontrola (15 minut)

Projdi v **anonymním okně** na ostré doméně:

- [ ] Úvodní stránka se načte, žádná chyba v konzoli prohlížeče.
- [ ] Registrace e-mailem → přijde potvrzovací e-mail → odkaz přihlásí.
- [ ] Přihlášení přes Google.
- [ ] `/dashboard` ukazuje 0 tokenů, promo kód funguje (vytvoř si testovací v `/admin`).
- [ ] Nákup balíčku (v test režimu karta `4242 4242 4242 4242`) → po návratu
      na `/cenik` se do minuty zvýší kredit. Když ne → Stripe → Webhooks →
      poslední pokus → chybová odpověď (nejčastěji špatný `STRIPE_WEBHOOK_SECRET`).
- [ ] Rychlé ocenění doběhne, odečte tokeny, objeví se v historii.
- [ ] Expertní ocenění doběhne do 5 minut (test timeoutu na Vercelu).
- [ ] Kontaktní formulář doručí e-mail.
- [ ] `/admin` se přihlásí jen se silným heslem; s `admin/admin` NE.
- [ ] Vercel → Logs: žádné opakující se `[market-cache]` / `[tokens]` chyby.
- [ ] Supabase → SQL: `select count(*) from stripe_webhook_events;` roste s platbami.

## 8. Provoz — co hlídat

- **Anthropic Usage** (týdně) vs. prodané tokeny — kdyby náklad převýšil tržbu,
  zvedni ceny v `/admin → Ceník služeb` (projeví se okamžitě, bez deploye).
- **Refund selhal** — v logu hledej `REFUND FAILED`; tokeny připiš ručně
  v `/admin → Tokeny` (e-mail + počet).
- **Stripe → Webhooks → Failed** — po výpadku Stripe opakuje 3 dny sám.
- **Supabase → Auth → Rate limits** — pokud lidé nedostávají e-maily.
- Zálohy: Supabase Pro má denní zálohy; Neon má point-in-time restore.

## 9. Právní minimum před spuštěním — [povinné]

- Do `/podminky` a `/ochrana-udaju` doplň identifikaci provozovatele
  (jméno/firma, IČO, sídlo, kontakt) — texty jsou v `src/app/podminky/page.tsx`
  a `src/app/ochrana-udaju/page.tsx`.
- Stripe vystavuje doklady; jako plátce/neplátce DPH nastav v Stripe → Tax
  správnou sazbu (tokeny = elektronická služba, 21 %).
- Patička: `/admin → Patička → Copyright` (rok, název).
