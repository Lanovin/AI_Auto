-- Spusť ručně v Neon Console → SQL Editor (stejná konvence jako supabase/migrations).
-- Vyžaduje existující tabulku market_scans (vytvořena ručně dříve).
--
-- Přidává:
--   • price_stats — VLASTNÍ odvozená databáze cenových statistik Cargent.
--     Obsahuje výhradně agregáty z našich vlastních výpočtů (průměry, mediány,
--     pásma) — nikdy řádky či kopie cizích inzerátů. Jde tedy o vlastní
--     databázi ve smyslu směrnice 96/9/ES, nikoli o extrakci z databází
--     inzertních portálů.
--   • index na market_scans.scanned_at — podpora automatického úklidu cache
--     (mazání záznamů starších 14 dní, viz src/lib/market-cache.ts).

create table if not exists price_stats (
  id           bigserial primary key,
  -- = generateSignature(car) ze src/lib/car-signature.ts (bez tier suffixu),
  -- např. "skoda-octavia-2017_2019-100k_120k-manual-diesel"
  stats_key    text not null unique,
  -- Denormalizované složky klíče pro pozdější analytiku
  brand        text not null,
  model        text not null,
  year_band    text not null,
  km_band      text not null,
  transmission text not null,
  fuel         text not null,
  -- Agregáty (vlastní výpočty z proběhlých skenů)
  n_samples    integer not null default 0,
  avg_price    numeric(12,0),
  median_price numeric(12,0),
  min_price    numeric(12,0),
  max_price    numeric(12,0),
  -- Rolling okno posledních max 20 skenů: [{ "avg": 489000, "min": ..., "max": ..., "n": 12, "at": "2026-06-10T..." }]
  recent_avgs  jsonb not null default '[]',
  first_seen   timestamptz not null default now(),
  last_updated timestamptz not null default now()
);

create index if not exists price_stats_brand_model_idx on price_stats (brand, model);

-- Podpora úklidu cache: DELETE FROM market_scans WHERE scanned_at < now() - interval '14 days'
create index if not exists market_scans_scanned_at_idx on market_scans (scanned_at);
