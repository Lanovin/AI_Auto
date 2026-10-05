-- Spusť ručně v Neon Console → SQL Editor.
-- Tabulka market_scans byla původně vytvořena ručně; tento skript ji
-- dokumentuje pro nová prostředí (preview DB, lokální vývoj). Na produkci
-- je bezpečný — existující tabulku nemění, jen doplní index, pokud chybí.
-- Definice odpovídá dotazům v src/lib/market-cache.ts.
--
-- market_scans — sdílená anonymní cache výsledků skenů (bez user_id).
-- Retence 14 dní (MARKET_SCANS_RETENTION_DAYS), úklid běží při zápisu.

create table if not exists market_scans (
  id            serial primary key,
  -- = generateSignature(car) ze src/lib/car-signature.ts + ":<suffix>" (tier/scope)
  car_signature text not null,
  scan_data     jsonb not null,
  scanned_at    timestamptz not null default now()
);

-- Lookup v getCachedScan(): WHERE car_signature = … AND scanned_at > … ORDER BY scanned_at DESC
create index if not exists market_scans_signature_scanned_at_idx
  on market_scans (car_signature, scanned_at desc);
