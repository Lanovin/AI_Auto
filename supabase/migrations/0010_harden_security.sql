-- Spusť ručně v Supabase Dashboard → SQL Editor.
-- Vyžaduje 0001–0009 spuštěné před tímto skriptem. Bezpečné spustit opakovaně.
--
-- BEZPEČNOSTNÍ ZÁPLATA — bez tohoto skriptu NEJDI do ostrého provozu.
--
-- Supabase vystavuje tabulky i funkce ve schématu `public` přes REST API
-- (PostgREST) komukoli, kdo má veřejný (publishable/anon) klíč — tedy i
-- přímo z prohlížeče, mimo náš Next.js server. Původní migrace předpokládaly,
-- že RPC funkce volá jen server, což neplatí. Konkrétní díry:
--
--   1. deduct_tokens(p_user_id, p_amount) — SECURITY DEFINER, bez kontroly,
--      kdo volá. Kdokoliv mohl odečíst tokeny CIZÍMU účtu, a se ZÁPORNOU
--      částkou si tokeny PŘIČÍST (balance - (-1000) = +1000).
--   2. redeem_promo_code(p_user_id, p_code) — totéž, bez vazby na volajícího.
--   3. add_tokens — definována dvakrát (0001_stripe + 0004); podle pořadí
--      spuštění mohla zůstat spustitelná pro authenticated/anon.
--   4. profiles — policy UPDATE bez omezení sloupců: uživatel si mohl přes
--      REST nastavit tokens_balance = 999999 nebo dealer_subscription_status.
--   5. profile_subscriptions — view bez security_invoker BĚŽÍ S PRÁVY
--      VLASTNÍKA a obchází RLS → kdokoliv viděl zůstatky všech uživatelů.
--   6. stripe_webhook_events — bez RLS: kdokoliv mohl vložit event_id a tím
--      zablokovat připsání tokenů z reálné platby (nebo tabulku číst).

-- ── Pomocná funkce: je volající service_role (server s tajným klíčem)? ─────
create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

revoke all on function public.is_service_role() from public;
grant execute on function public.is_service_role() to anon, authenticated, service_role;

-- ── 1. deduct_tokens: jen vlastník účtu (nebo server), jen kladná částka ───
create or replace function public.deduct_tokens(
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

  if not public.is_service_role() and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'FORBIDDEN: tokeny lze odečíst jen z vlastního účtu.';
  end if;

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

revoke all on function public.deduct_tokens(uuid, integer) from public, anon;
grant execute on function public.deduct_tokens(uuid, integer) to authenticated, service_role;

-- ── 2. redeem_promo_code: jen pro vlastní účet ──────────────────────────────
create or replace function public.redeem_promo_code(
  p_user_id uuid,
  p_code    text
)
returns table(tokens_granted integer, new_balance integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_code    public.promo_codes%rowtype;
  v_balance integer;
begin
  if not public.is_service_role() and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'FORBIDDEN: kód lze uplatnit jen na vlastní účet.';
  end if;

  select *
    into v_code
    from public.promo_codes
   where lower(code) = lower(trim(p_code))
     and active = true
   for update;

  if not found then
    raise exception 'INVALID_CODE';
  end if;

  if v_code.uses >= v_code.max_uses then
    raise exception 'CODE_EXHAUSTED';
  end if;

  if exists (
    select 1 from public.promo_redemptions
     where code_id = v_code.id and user_id = p_user_id
  ) then
    raise exception 'ALREADY_REDEEMED';
  end if;

  insert into public.promo_redemptions (code_id, user_id, tokens_granted)
    values (v_code.id, p_user_id, v_code.tokens);

  update public.promo_codes
     set uses = uses + 1
   where id = v_code.id;

  update public.profiles
     set tokens_balance = tokens_balance + v_code.tokens
   where id = p_user_id
   returning tokens_balance into v_balance;

  if v_balance is null then
    raise exception 'NO_PROFILE';
  end if;

  tokens_granted := v_code.tokens;
  new_balance := v_balance;
  return next;
end;
$$;

revoke all on function public.redeem_promo_code(uuid, text) from public, anon;
grant execute on function public.redeem_promo_code(uuid, text) to authenticated, service_role;

-- ── 3. add_tokens: jediná definice, smí volat JEN server (service_role) ─────
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

  if not public.is_service_role() then
    raise exception 'FORBIDDEN: add_tokens smí volat jen server.';
  end if;

  update public.profiles
     set tokens_balance = coalesce(tokens_balance, 0) + p_amount
   where id = p_user_id
   returning tokens_balance into v_balance;

  if not found then
    -- Profil chybí (trigger selhal / starý účet) — založ ho s připsanou částkou.
    insert into public.profiles (id, tokens_balance)
    values (p_user_id, p_amount)
    on conflict (id) do update
      set tokens_balance = coalesce(public.profiles.tokens_balance, 0) + p_amount
    returning tokens_balance into v_balance;
  end if;

  return v_balance;
end;
$$;

revoke all on function public.add_tokens(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_tokens(uuid, integer) to service_role;

-- ── 4. profiles: uživatel smí měnit jen jméno/firmu, nic jiného ─────────────
-- Zůstatek, Stripe ID a stav předplatného mění výhradně server (service_role
-- RLS obchází) nebo SECURITY DEFINER funkce výše.
revoke insert, update, delete on table public.profiles from anon, authenticated;
grant update (full_name, company_name) on table public.profiles to authenticated;

drop policy if exists "Uživatel může upravit jen svůj profil" on public.profiles;
create policy "Uživatel může upravit jen svůj profil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Sloupec updated_at používá add_tokens z 0001_stripe (kdyby chyběl).
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

-- ── 5. View obcházející RLS — nepoužívá se, pryč s ním ─────────────────────
drop view if exists public.profile_subscriptions;

-- ── 6. stripe_webhook_events: jen server ────────────────────────────────────
alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;

-- ── 7. Trigger nového uživatele: přenes jméno / firmu z registrace ─────────
-- (registrace ukládá account_type, full_name, company_name do user_metadata;
--  Stripe checkout pak bere jméno zákazníka z profilu)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'company_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ── 8. Ostatní tabulky: jistota, že přímý zápis přes REST neprojde ─────────
-- (RLS bez policy zápis blokuje, ale explicitní revoke je čitelnější audit.)
revoke insert, update, delete on table public.site_content   from anon, authenticated;
revoke insert, update, delete on table public.token_pricing  from anon, authenticated;
revoke all                    on table public.promo_codes    from anon, authenticated;
revoke insert, update, delete on table public.promo_redemptions from anon, authenticated;
