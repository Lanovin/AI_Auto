-- Spusť ručně v Supabase Dashboard → SQL Editor

-- ── Tabulka profilů (1:1 s auth.users) ────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  full_name    text,
  company_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Uživatel vidí jen svůj profil" on public.profiles;
create policy "Uživatel vidí jen svůj profil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Uživatel může upravit jen svůj profil" on public.profiles;
create policy "Uživatel může upravit jen svůj profil"
  on public.profiles for update
  using (auth.uid() = id);

-- ── Trigger: automaticky vytvoří profil při registraci ────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Tabulka oceňování ──────────────────────────────────────────────────────
create table if not exists public.valuations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  vehicle_data    jsonb not null default '{}',
  estimated_price numeric(12, 2),
  created_at      timestamptz not null default now()
);

alter table public.valuations enable row level security;

drop policy if exists "Uživatel vidí jen svá ocenění" on public.valuations;
create policy "Uživatel vidí jen svá ocenění"
  on public.valuations for select
  using (auth.uid() = user_id);

drop policy if exists "Uživatel může vložit jen svá ocenění" on public.valuations;
create policy "Uživatel může vložit jen svá ocenění"
  on public.valuations for insert
  with check (auth.uid() = user_id);

drop policy if exists "Uživatel může upravit jen svá ocenění" on public.valuations;
create policy "Uživatel může upravit jen svá ocenění"
  on public.valuations for update
  using (auth.uid() = user_id);

drop policy if exists "Uživatel může smazat jen svá ocenění" on public.valuations;
create policy "Uživatel může smazat jen svá ocenění"
  on public.valuations for delete
  using (auth.uid() = user_id);
