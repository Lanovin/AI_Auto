-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001–0008 spuštěné před tímto skriptem. Lze spustit opakovaně.
--
-- ⚠ POŘADÍ NASAZENÍ: 0010 + 0011 → nasadit kód → 0009 (tento skript).
-- Nový kód volá token funkce přes service-role klienta; starý kód je volal
-- s klíčem uživatele, takže spuštění 0009 před nasazením by rozbilo
-- odečítání tokenů a promo kódy. Produkce musí mít SUPABASE_SERVICE_ROLE_KEY.
--
-- Opravuje:
--   1. Uživatel si mohl přes veřejný klíč přepsat tokens_balance a
--      stripe_customer_id ve svém profilu (UPDATE policy bez omezení sloupců).
--   2. deduct_tokens / add_tokens / redeem_promo_code šly volat přímo
--      z prohlížeče s cizím p_user_id a deduct_tokens se zápornou částkou
--      tokeny přidával.
--   3. View profile_subscriptions obcházel RLS (zobrazoval všechny profily),
--      stripe_webhook_events neměla zapnuté RLS.
--
-- Přidává:
--   • revoke_tokens() – odebrání tokenů při refundu (nejníž na 0).

-- ── 1. profiles: uživatel smí měnit jen jméno a firmu ─────────────────────
-- RLS policy z 0001_init.sql omezuje řádky (jen vlastní profil), sloupce
-- omezíme column-level grantem. Tokeny, Stripe a stavy předplatného
-- zapisuje výhradně server přes service-role klíč (ten RLS i granty obchází).
revoke update on public.profiles from anon, authenticated;
grant update (full_name, company_name) on public.profiles to authenticated;

-- Insert/delete profilů nemá policy → povolené jen pro service-role
-- a trigger handle_new_user(). Pro jistotu odebereme i table-level práva.
revoke insert, delete on public.profiles from anon, authenticated;

-- ── 2. Funkce pro práci s tokeny: jen service-role ────────────────────────
-- Všechna volání jdou přes API routy (src/lib/tokens-server.ts,
-- src/app/api/promo/redeem, Stripe webhook, admin), které si user_id berou
-- z ověřené session — nikdy z požadavku klienta.

create or replace function public.deduct_tokens(
  p_user_id uuid,
  p_amount   integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Neplatná částka tokenů: %', p_amount;
  end if;

  -- Zamkneme řádek, abychom předešli race condition při souběžných požadavcích
  select tokens_balance
    into v_balance
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'Profil uživatele % neexistuje.', p_user_id;
  end if;

  if v_balance < p_amount then
    raise exception 'Nedostatek tokenů (máte %, potřebujete %).', v_balance, p_amount;
  end if;

  update public.profiles
     set tokens_balance = tokens_balance - p_amount
   where id = p_user_id;

  return v_balance - p_amount;
end;
$$;

create or replace function public.add_tokens(
  p_user_id uuid,
  p_amount  integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Neplatná částka tokenů: %', p_amount;
  end if;

  update public.profiles
     set tokens_balance = tokens_balance + p_amount
   where id = p_user_id
   returning tokens_balance into v_balance;

  if not found then
    raise exception 'Profil uživatele % neexistuje.', p_user_id;
  end if;

  return v_balance;
end;
$$;

-- Odebrání tokenů při refundu / chargebacku. Na rozdíl od deduct_tokens
-- nehlásí chybu při nedostatku — zůstatek jen srazí na 0 (tokeny už mohly
-- být utracené). Vrací nový zůstatek.
create or replace function public.revoke_tokens(
  p_user_id uuid,
  p_amount  integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Neplatná částka tokenů: %', p_amount;
  end if;

  update public.profiles
     set tokens_balance = greatest(tokens_balance - p_amount, 0)
   where id = p_user_id
   returning tokens_balance into v_balance;

  if not found then
    raise exception 'Profil uživatele % neexistuje.', p_user_id;
  end if;

  return v_balance;
end;
$$;

-- Funkce v Postgres mají ve výchozím stavu EXECUTE pro PUBLIC → odebrat
-- všem a povolit jen service_role.
revoke all on function public.deduct_tokens(uuid, integer)  from public, anon, authenticated;
revoke all on function public.add_tokens(uuid, integer)     from public, anon, authenticated;
revoke all on function public.revoke_tokens(uuid, integer)  from public, anon, authenticated;
revoke all on function public.redeem_promo_code(uuid, text) from public, anon, authenticated;

grant execute on function public.deduct_tokens(uuid, integer)  to service_role;
grant execute on function public.add_tokens(uuid, integer)     to service_role;
grant execute on function public.revoke_tokens(uuid, integer)  to service_role;
grant execute on function public.redeem_promo_code(uuid, text) to service_role;

-- ── 3. View a tabulky obcházející RLS ─────────────────────────────────────
-- profile_subscriptions (0001_stripe_integration.sql) běžel s právy vlastníka,
-- takže vracel všechny profily. Kód ho nepoužívá → zrušit.
drop view if exists public.profile_subscriptions;

-- Tabulku zapisuje jen webhook přes service-role. Bez policy = nikdo jiný.
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;
