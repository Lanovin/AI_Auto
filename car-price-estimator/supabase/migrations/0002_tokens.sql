-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje, aby 0001_init.sql byl spuštěn jako první.

-- ── Přidání sloupce tokenů do profilů ────────────────────────────────────
alter table public.profiles
  add column if not exists tokens_balance integer not null default 100;

-- ── Aktualizace triggeru: nový uživatel dostane startovací kredit ─────────
-- (Výchozí hodnota DEFAULT 100 to řeší automaticky, trigger není nutný.)
-- Pokud chceš jiný starting balance, změň DEFAULT výše a restartuj.

-- ── Postgres funkce pro bezpečné odečtení tokenů ─────────────────────────
-- Volána přes supabase.rpc('deduct_tokens', { p_user_id, p_amount }).
-- security definer → běží s právy vlastníka, ne volajícího uživatele,
-- takže klient nemůže obejít kontrolu odečtením libovolné částky.
create or replace function public.deduct_tokens(
  p_user_id uuid,
  p_amount   integer
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
begin
  -- Zamkneme řádek, abychom předešli race condition při souběžných požadavcích
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

-- Pouze vlastník profilu může číst svůj zůstatek (přes RLS na profiles).
-- Zápis probíhá výhradně přes deduct_tokens (security definer) nebo admin.
-- Pokud chceš uživateli umožnit přímé navýšení (buy tokens endpoint), přidej
-- analogickou add_tokens() funkci s obdobnou strukturou.
