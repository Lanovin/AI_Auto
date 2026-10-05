-- Ověření migrací 0009–0011. Spusť v Supabase Dashboard → SQL Editor
-- PO aplikaci migrací. Nic nemění — vše běží v transakci a končí ROLLBACK.
-- Výsledky čti v záložce s hláškami (NOTICE = OK, WARNING = FAIL).
-- Vyžaduje aspoň jeden existující profil.

begin;

-- Testovací uživatel = libovolný existující profil.
create temp table _t on commit drop as
  select id as uid from public.profiles limit 1;
grant select on _t to authenticated, anon, service_role;

-- ── A) Přihlášený uživatel (role authenticated, jako z prohlížeče) ────────
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select uid from _t), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

do $$
declare
  v_uid uuid := (select uid from _t);
begin
  begin
    update public.profiles set tokens_balance = 999999 where id = v_uid;
    raise warning 'FAIL A1: uživatel si přepsal tokens_balance';
  exception when insufficient_privilege then
    raise notice 'OK   A1: tokens_balance nelze měnit';
  end;

  begin
    update public.profiles set stripe_customer_id = 'cus_cizi' where id = v_uid;
    raise warning 'FAIL A2: uživatel si přepsal stripe_customer_id';
  exception when insufficient_privilege then
    raise notice 'OK   A2: stripe_customer_id nelze měnit';
  end;

  begin
    update public.profiles set full_name = full_name where id = v_uid;
    raise notice 'OK   A3: full_name jde měnit (povolený sloupec)';
  exception when others then
    raise warning 'FAIL A3: full_name nejde měnit: %', sqlerrm;
  end;

  begin
    perform public.deduct_tokens(v_uid, -100);
    raise warning 'FAIL A4: deduct_tokens jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A4: deduct_tokens nejde volat';
  end;

  begin
    perform public.add_tokens(v_uid, 100);
    raise warning 'FAIL A5: add_tokens jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A5: add_tokens nejde volat';
  end;

  begin
    perform public.redeem_promo_code(v_uid, 'NEEXISTUJE');
    raise warning 'FAIL A6: redeem_promo_code jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A6: redeem_promo_code nejde volat';
  end;

  begin
    perform public.charge_tokens(v_uid, 'estimator:quick', 0);
    raise warning 'FAIL A7: charge_tokens jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A7: charge_tokens nejde volat';
  end;

  begin
    perform public.refund_charge(1);
    raise warning 'FAIL A8: refund_charge jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A8: refund_charge nejde volat';
  end;

  begin
    perform public.revoke_tokens(v_uid, 1);
    raise warning 'FAIL A9: revoke_tokens jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A9: revoke_tokens nejde volat';
  end;

  begin
    perform public.hit_rate_limit('x', 60, 1);
    raise warning 'FAIL A10: hit_rate_limit jde volat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A10: hit_rate_limit nejde volat';
  end;

  begin
    perform 1 from public.usage_log;
    raise warning 'FAIL A11: usage_log je čitelná z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A11: usage_log není přístupná';
  end;

  begin
    delete from public.usage_log;
    raise warning 'FAIL A12: usage_log jde mazat z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A12: usage_log nejde mazat';
  end;

  begin
    perform 1 from public.stripe_webhook_events;
    raise warning 'FAIL A13: stripe_webhook_events je čitelná z klienta';
  exception when insufficient_privilege then
    raise notice 'OK   A13: stripe_webhook_events není přístupná';
  end;

  begin
    perform 1 from public.profile_subscriptions;
    raise warning 'FAIL A14: view profile_subscriptions pořád existuje';
  exception when undefined_table then
    raise notice 'OK   A14: profile_subscriptions je zrušený';
  end;
end $$;

-- ── B) Nepřihlášený návštěvník (role anon) ────────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

do $$
declare
  v_uid uuid := (select uid from _t);
begin
  begin
    perform public.deduct_tokens(v_uid, -100);
    raise warning 'FAIL B1: anon volá deduct_tokens';
  exception when insufficient_privilege then
    raise notice 'OK   B1: anon nevolá deduct_tokens';
  end;

  begin
    perform public.redeem_promo_code(v_uid, 'NEEXISTUJE');
    raise warning 'FAIL B2: anon volá redeem_promo_code';
  exception when insufficient_privilege then
    raise notice 'OK   B2: anon nevolá redeem_promo_code';
  end;
end $$;

-- ── C) Server (service_role) — logika účtování ────────────────────────────
reset role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

do $$
declare
  v_uid     uuid := (select uid from _t);
  v_start   integer;
  v_usage   bigint;
  v_balance integer;
  v_refund  integer;
begin
  -- Známý výchozí stav: 10 tokenů
  update public.profiles set tokens_balance = 10 where id = v_uid;

  begin
    perform public.deduct_tokens(v_uid, -5);
    raise warning 'FAIL C1: deduct_tokens přijal zápornou částku';
  exception when raise_exception then
    raise notice 'OK   C1: záporná částka odmítnuta';
  end;

  begin
    perform public.charge_tokens(v_uid, 'estimator:expert', 11);
    raise warning 'FAIL C2: charge_tokens strhl víc, než je zůstatek';
  exception when raise_exception then
    if sqlerrm like 'Nedostatek%' then
      raise notice 'OK   C2: nedostatek tokenů odmítnut';
    else
      raise warning 'FAIL C2: neočekávaná chyba: %', sqlerrm;
    end if;
  end;

  select usage_id, new_balance into v_usage, v_balance
    from public.charge_tokens(v_uid, 'estimator:quick', 4, 'estimator:', 100);
  if v_balance = 6 then
    raise notice 'OK   C3: charge_tokens strhl 4 → zůstatek 6';
  else
    raise warning 'FAIL C3: zůstatek po charge je %', v_balance;
  end if;

  v_refund := public.refund_charge(v_usage);
  if v_refund = 10 and public.refund_charge(v_usage) is null then
    raise notice 'OK   C4: refund vrátil tokeny a podruhé nic neudělal';
  else
    raise warning 'FAIL C4: refund vrátil %, opakovaný refund není idempotentní?', v_refund;
  end if;

  -- Denní limit: 1 použití povoleno, druhé musí selhat. Vlastní prefix,
  -- aby test neovlivnila skutečná použití uživatele z posledních 24 h.
  perform public.charge_tokens(v_uid, 'verifytest:a', 0, 'verifytest:', 1);
  begin
    perform public.charge_tokens(v_uid, 'verifytest:a', 0, 'verifytest:', 1);
    raise warning 'FAIL C5: denní limit nezastavil druhé použití';
  exception when raise_exception then
    if sqlerrm = 'DAILY_LIMIT' then
      raise notice 'OK   C5: denní limit funguje';
    else
      raise warning 'FAIL C5: neočekávaná chyba: %', sqlerrm;
    end if;
  end;

  v_balance := public.revoke_tokens(v_uid, 1000);
  if v_balance = 0 then
    raise notice 'OK   C6: revoke_tokens nejde pod 0';
  else
    raise warning 'FAIL C6: zůstatek po revoke je %', v_balance;
  end if;

  if public.hit_rate_limit('test:verify', 60, 2)
     and public.hit_rate_limit('test:verify', 60, 2)
     and not public.hit_rate_limit('test:verify', 60, 2) then
    raise notice 'OK   C7: hit_rate_limit pustí 2 a třetí zastaví';
  else
    raise warning 'FAIL C7: hit_rate_limit nepočítá správně';
  end if;
end $$;

rollback;
