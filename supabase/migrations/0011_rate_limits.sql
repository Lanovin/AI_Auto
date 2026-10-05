-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001–0008. Lze spustit opakovaně.
--
-- ⚠ POŘADÍ NASAZENÍ: 0010 + 0011 → nasadit kód → 0009.
-- Bez tohoto skriptu nový kód limity neuplatní (zaloguje chybu a požadavek
-- pustí), s výjimkou promo kódů, které se bez ověřeného limitu odmítnou.
--
-- Přidává:
--   • rate_limit_hits  – počítadla požadavků v pevných časových oknech
--   • hit_rate_limit() – připočte požadavek a vrátí, zda je ještě v limitu
--
-- Používá se pro /api/kontakt (spam), /api/promo/redeem (hádání kódů)
-- a /api/admin/login (hádání hesla). Klíč obsahuje jen hash IP adresy,
-- ne samotnou IP (viz src/lib/rate-limit.ts).

create table if not exists public.rate_limit_hits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limit_hits_window_start_idx
  on public.rate_limit_hits (window_start);

-- Bez policy → přístup jen přes service-role.
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_key            text,
  p_window_seconds integer,
  p_max            integer
)
returns boolean   -- true = požadavek je v limitu
language plpgsql
security definer set search_path = public
as $$
declare
  v_window timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limit_hits (key, window_start)
    values (p_key, v_window)
  on conflict (key, window_start)
    do update set hits = public.rate_limit_hits.hits + 1
  returning hits into v_hits;

  -- Občasný úklid starých oken (cca každý 50. požadavek).
  if random() < 0.02 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
