-- Spusť ručně v Neon Console → SQL Editor JAKO PRVNÍ (před 0001_price_stats.sql).
--
-- market_scans — sdílená, anonymní technická cache výsledků skenů
-- (bez user_id). Klíč = car_signature ze src/lib/car-signature.ts, volitelně
-- s příponou tieru (":quick", ":standard:intl", ":monitor"…).
-- Staré záznamy se automaticky mažou po 14 dnech (src/lib/market-cache.ts).
--
-- Tabulka dřív vznikla ručně bez skriptu; tento soubor ji dokumentuje a
-- umožní založit čistou databázi. Bezpečné spustit opakovaně.

create table if not exists market_scans (
  id            bigserial primary key,
  car_signature text        not null,
  scan_data     jsonb       not null,
  scanned_at    timestamptz not null default now()
);

-- Dotaz cache: WHERE car_signature = ? AND scanned_at > ? ORDER BY scanned_at DESC LIMIT 1
create index if not exists market_scans_signature_scanned_idx
  on market_scans (car_signature, scanned_at desc);
