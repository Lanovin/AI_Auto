-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Každý nový účet začíná s 0 tokeny. Tokeny se musí dokoupit.

-- ── Nový starting balance = 0 ────────────────────────────────────────────
-- Mění DEFAULT sloupce, který se uplatní při vložení profilu triggerem
-- public.handle_new_user() (viz 0001_init.sql). Žádné startovací kredity.
alter table public.profiles
  alter column tokens_balance set default 0;
