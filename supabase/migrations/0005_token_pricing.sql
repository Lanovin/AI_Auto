-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001_init.sql a 0002_tokens.sql spuštěné před tímto skriptem.
--
-- Přidává:
--   • token_pricing – admin-editovatelné ceny akcí v tokenech.
--     Klíč = TokenFeature ze src/lib/tokens.ts (např. 'estimator:quick').
--     Pokud řádek chybí, použije se výchozí cena z TOKEN_COSTS v kódu.

create table if not exists public.token_pricing (
  feature    text primary key,
  cost       integer not null check (cost >= 0),
  updated_at timestamptz not null default now()
);

alter table public.token_pricing enable row level security;

-- Ceník je veřejný (zobrazuje se u nástrojů) → kdokoliv může číst.
drop policy if exists "Ceník je veřejně čitelný" on public.token_pricing;
create policy "Ceník je veřejně čitelný"
  on public.token_pricing for select
  using (true);

-- Zápis NEMÁ žádnou policy → projde jen přes service-role klíč (admin),
-- který RLS obchází. Běžný uživatel ceny měnit nemůže.
