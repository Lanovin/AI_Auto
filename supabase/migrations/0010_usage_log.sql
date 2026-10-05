-- Spusť ručně v Supabase Dashboard → SQL Editor
-- Vyžaduje 0001–0008. Lze spustit opakovaně.
--
-- ⚠ POŘADÍ NASAZENÍ: 0010 + 0011 → nasadit kód → 0009.
-- Tento skript jen přidává, starý kód nerozbije; nový kód bez něj neúčtuje
-- (charge_tokens / refund_charge v src/lib/tokens-server.ts).
--
-- Proč:
--   • Denní limit skenů se počítal ze scan_history, kterou si uživatel může
--     smazat (GDPR) → smazáním historie se limit vynuloval.
--   • Kontrola limitu i zůstatku proběhla PŘED skenem, ale tokeny se strhly
--     až PO něm → paralelní požadavky prošly všechny a Anthropic se zaplatil
--     i za skeny, které pak skončily 402.
--
-- Přidává:
--   • usage_log       – append-only záznam každé placené akce (uživatel ho
--                       nevidí ani nesmaže; maže se jen s účtem)
--   • charge_tokens() – v jedné transakci: zámek profilu → denní limit →
--                       zůstatek → odečet → záznam do usage_log
--   • refund_charge() – vrácení tokenů za akci, která selhala (idempotentní)

-- ── usage_log ─────────────────────────────────────────────────────────────
create table if not exists public.usage_log (
  id          bigserial primary key,
  user_id     uuid not null references auth.users on delete cascade,
  feature     text not null,              -- TokenFeature, např. 'estimator:standard'
  tokens      integer not null default 0 check (tokens >= 0),
  refunded_at timestamptz,                -- vyplněno, pokud akce selhala a tokeny se vrátily
  created_at  timestamptz not null default now()
);

create index if not exists usage_log_user_created_idx
  on public.usage_log (user_id, created_at desc);

-- Bez policy → přístup jen přes service-role (API routy, admin).
alter table public.usage_log enable row level security;
revoke all on public.usage_log from anon, authenticated;

-- ── charge_tokens ─────────────────────────────────────────────────────────
-- p_amount může být 0 (akce zdarma nastavená adminem) — pak se jen zapíše
-- použití kvůli dennímu limitu.
-- p_daily_limit / p_limit_prefix: volitelný limit počtu akcí za 24 h,
-- počítaný přes všechny featury začínající prefixem (např. 'estimator:').
-- Vrácené (refunded) akce se do limitu nepočítají.
-- Chyby: NO_PROFILE, DAILY_LIMIT, 'Nedostatek tokenů …'.
create or replace function public.charge_tokens(
  p_user_id      uuid,
  p_feature      text,
  p_amount       integer,
  p_limit_prefix text    default null,
  p_daily_limit  integer default null
)
returns table(usage_id bigint, new_balance integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance  integer;
  v_count    integer;
  v_usage_id bigint;
begin
  if p_amount is null or p_amount < 0 then
    raise exception 'Neplatná částka tokenů: %', p_amount;
  end if;

  -- Zámek řádku profilu serializuje souběžné požadavky téhož uživatele,
  -- takže limit i zůstatek se kontrolují nad konzistentním stavem.
  select tokens_balance
    into v_balance
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'NO_PROFILE';
  end if;

  if p_daily_limit is not null then
    select count(*)
      into v_count
      from public.usage_log
     where user_id = p_user_id
       and refunded_at is null
       and created_at > now() - interval '24 hours'
       and feature like coalesce(p_limit_prefix, '') || '%';

    if v_count >= p_daily_limit then
      raise exception 'DAILY_LIMIT';
    end if;
  end if;

  if v_balance < p_amount then
    raise exception 'Nedostatek tokenů (máte %, potřebujete %).', v_balance, p_amount;
  end if;

  update public.profiles
     set tokens_balance = tokens_balance - p_amount
   where id = p_user_id
   returning tokens_balance into v_balance;

  insert into public.usage_log (user_id, feature, tokens)
    values (p_user_id, p_feature, p_amount)
    returning id into v_usage_id;

  usage_id := v_usage_id;
  new_balance := v_balance;
  return next;
end;
$$;

-- ── refund_charge ─────────────────────────────────────────────────────────
-- Vrátí tokeny za danou akci a označí ji jako vrácenou. Opakované volání
-- nic neudělá (vrací null), takže dvojí refund není možný.
create or replace function public.refund_charge(p_usage_id bigint)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_tokens  integer;
  v_balance integer;
begin
  update public.usage_log
     set refunded_at = now()
   where id = p_usage_id
     and refunded_at is null
   returning user_id, tokens into v_user_id, v_tokens;

  if not found then
    return null;
  end if;

  update public.profiles
     set tokens_balance = tokens_balance + v_tokens
   where id = v_user_id
   returning tokens_balance into v_balance;

  return v_balance;
end;
$$;

revoke all on function public.charge_tokens(uuid, text, integer, text, integer) from public, anon, authenticated;
revoke all on function public.refund_charge(bigint)                              from public, anon, authenticated;
grant execute on function public.charge_tokens(uuid, text, integer, text, integer) to service_role;
grant execute on function public.refund_charge(bigint)                              to service_role;
