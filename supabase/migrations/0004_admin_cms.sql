-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001_init.sql a 0002_tokens.sql spuštěné před tímto skriptem.
--
-- Přidává:
--   • site_content        – editovatelné texty landing page (CMS)
--   • promo_codes         – slevové / dárkové kódy na tokeny
--   • promo_redemptions   – kdo který kód uplatnil (1× na uživatele)
--   • add_tokens()        – bezpečné připsání tokenů
--   • redeem_promo_code() – atomické uplatnění kódu (kontrola limitu i duplicity)

-- ── CMS: editovatelné texty ───────────────────────────────────────────────
-- Klíč = identifikátor z content registry (např. 'hero.title').
-- Hodnota = override textu. Pokud klíč chybí, web použije výchozí text z kódu.
create table if not exists public.site_content (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Texty jsou veřejné (čtou se na landing page) → kdokoliv může číst.
drop policy if exists "Texty jsou veřejně čitelné" on public.site_content;
create policy "Texty jsou veřejně čitelné"
  on public.site_content for select
  using (true);

-- Zápis NEMÁ žádnou policy → projde jen přes service-role klíč (admin CMS),
-- který RLS obchází. Běžný uživatel tak texty měnit nemůže.

-- ── Promo kódy ─────────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  tokens     integer not null check (tokens > 0),
  max_uses   integer not null check (max_uses > 0),
  uses       integer not null default 0,
  active     boolean not null default true,
  note       text,
  created_at timestamptz not null default now()
);

-- Pro case-insensitive vyhledání kódu (kód "LETO" == "leto").
create unique index if not exists promo_codes_code_lower_idx
  on public.promo_codes (lower(code));

alter table public.promo_codes enable row level security;
-- Žádná policy → čtení i zápis jen přes service-role (admin) nebo SECURITY DEFINER funkci.

-- ── Uplatnění kódů ─────────────────────────────────────────────────────────
create table if not exists public.promo_redemptions (
  id             uuid primary key default gen_random_uuid(),
  code_id        uuid not null references public.promo_codes on delete cascade,
  user_id        uuid not null references auth.users on delete cascade,
  tokens_granted integer not null,
  created_at     timestamptz not null default now(),
  unique (code_id, user_id)   -- jeden uživatel uplatní daný kód jen jednou
);

alter table public.promo_redemptions enable row level security;

drop policy if exists "Uživatel vidí jen svá uplatnění" on public.promo_redemptions;
create policy "Uživatel vidí jen svá uplatnění"
  on public.promo_redemptions for select
  using (auth.uid() = user_id);
-- Zápis probíhá výhradně přes redeem_promo_code() (security definer).

-- ── Funkce: bezpečné připsání tokenů ──────────────────────────────────────
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

-- ── Funkce: atomické uplatnění promo kódu ─────────────────────────────────
-- Volá se přes supabase.rpc('redeem_promo_code', { p_user_id, p_code }).
-- Vyhazuje výstižné chyby (INVALID_CODE / CODE_EXHAUSTED / ALREADY_REDEEMED /
-- NO_PROFILE), které API mapuje na české hlášky.
create or replace function public.redeem_promo_code(
  p_user_id uuid,
  p_code    text
)
returns table(tokens_granted integer, new_balance integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_code   public.promo_codes%rowtype;
  v_balance integer;
begin
  -- Najdeme aktivní kód a zamkneme řádek (proti souběhu při čerpání limitu).
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
