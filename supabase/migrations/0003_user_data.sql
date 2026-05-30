-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001_init.sql a 0002_tokens.sql spuštěné před tímto skriptem.
--
-- ARCHITEKTURA DAT:
--   Supabase  → vše co patří uživateli (garage_cars, scan_history, monitor_watchlist, profiles)
--   Neon DB   → sdílený anonymní cache AI skenů (market_scans) — bez user_id, bez změn

-- ── Garáž (uložená auta uživatele) ────────────────────────────────────────
create table if not exists public.garage_cars (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users on delete cascade,

  -- Základní identifikace (povinné)
  brand            text not null,
  model            text not null,
  year             integer not null,

  -- Volitelné parametry
  mileage          integer,
  fuel             text,
  transmission     text,
  vin              text,
  trim_version     text,
  engine_capacity  integer,   -- ccm
  power_kw         integer,
  color            text,
  body_type        text,

  -- Výbava jako JSON pole stringů (["Klimatizace", "Kůže", ...])
  equipment        jsonb not null default '[]'::jsonb,

  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.garage_cars enable row level security;

drop policy if exists "Uživatel vidí jen svou garáž" on public.garage_cars;
create policy "Uživatel vidí jen svou garáž"
  on public.garage_cars for select
  using (auth.uid() = user_id);

drop policy if exists "Uživatel přidává jen do své garáže" on public.garage_cars;
create policy "Uživatel přidává jen do své garáže"
  on public.garage_cars for insert
  with check (auth.uid() = user_id);

drop policy if exists "Uživatel upravuje jen svá auta" on public.garage_cars;
create policy "Uživatel upravuje jen svá auta"
  on public.garage_cars for update
  using (auth.uid() = user_id);

drop policy if exists "Uživatel maže jen svá auta" on public.garage_cars;
create policy "Uživatel maže jen svá auta"
  on public.garage_cars for delete
  using (auth.uid() = user_id);

-- Trigger: updated_at se aktualizuje automaticky
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists garage_cars_updated_at on public.garage_cars;
create trigger garage_cars_updated_at
  before update on public.garage_cars
  for each row execute procedure public.set_updated_at();

-- ── Historie skenů (výsledky ocenění přiřazené k uživateli) ───────────────
create table if not exists public.scan_history (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,

  -- Data zadaného auta (snapshot — nezmění se ani když uživatel upraví garáž)
  car_data        jsonb not null,

  -- Výsledky skenu
  tier            text not null default 'standard',
  average_price   numeric(12, 2),
  min_price       numeric(12, 2),
  max_price       numeric(12, 2),
  listing_count   integer,

  -- Volitelný odkaz na konkrétní auto v garáži (null = ad-hoc sken bez uloženého auta)
  garage_car_id   uuid references public.garage_cars on delete set null,

  tokens_spent    integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.scan_history enable row level security;

drop policy if exists "Uživatel vidí jen svou historii" on public.scan_history;
create policy "Uživatel vidí jen svou historii"
  on public.scan_history for select
  using (auth.uid() = user_id);

drop policy if exists "Uživatel přidává jen do své historie" on public.scan_history;
create policy "Uživatel přidává jen do své historie"
  on public.scan_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Uživatel maže jen svou historii" on public.scan_history;
create policy "Uživatel maže jen svou historii"
  on public.scan_history for delete
  using (auth.uid() = user_id);

-- ── Watchlist monitoringu ──────────────────────────────────────────────────
-- Připraveno pro migraci z localStorage klíče "autoceny_monitor_cars".
-- Frontend migrace (shared.js / market-monitor.html) se dělá zvlášť.
create table if not exists public.monitor_watchlist (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  brand          text not null,
  model          text not null,
  year           integer not null,
  mileage        integer,
  fuel           text,
  transmission   text,
  last_price     numeric(12, 2),
  last_scanned   timestamptz,
  created_at     timestamptz not null default now()
);

alter table public.monitor_watchlist enable row level security;

drop policy if exists "Uživatel vidí jen svůj watchlist" on public.monitor_watchlist;
create policy "Uživatel vidí jen svůj watchlist"
  on public.monitor_watchlist for select
  using (auth.uid() = user_id);

drop policy if exists "Uživatel přidává jen do svého watchlistu" on public.monitor_watchlist;
create policy "Uživatel přidává jen do svého watchlistu"
  on public.monitor_watchlist for insert
  with check (auth.uid() = user_id);

drop policy if exists "Uživatel upravuje jen svůj watchlist" on public.monitor_watchlist;
create policy "Uživatel upravuje jen svůj watchlist"
  on public.monitor_watchlist for update
  using (auth.uid() = user_id);

drop policy if exists "Uživatel maže jen ze svého watchlistu" on public.monitor_watchlist;
create policy "Uživatel maže jen ze svého watchlistu"
  on public.monitor_watchlist for delete
  using (auth.uid() = user_id);
