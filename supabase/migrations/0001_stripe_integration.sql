-- ════════════════════════════════════════════════════════════════════════════
-- Stripe integration — schema additions for AutoAI
-- Run this in Supabase SQL editor (Dashboard → SQL → New Query → paste → Run)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Stripe linkage + subscription tracking on profiles ─────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id          text,
  ADD COLUMN IF NOT EXISTS dealer_subscription_id      text,
  ADD COLUMN IF NOT EXISTS dealer_subscription_status  text,
  ADD COLUMN IF NOT EXISTS dealer_subscription_until   timestamptz,
  ADD COLUMN IF NOT EXISTS monitoring_subscription_id      text,
  ADD COLUMN IF NOT EXISTS monitoring_subscription_status  text,
  ADD COLUMN IF NOT EXISTS monitoring_subscription_until   timestamptz;

-- Index for webhook reverse lookups (Stripe customer → Supabase user)
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id);


-- 2. add_tokens RPC (mirrors the existing deduct_tokens pattern) ────────────
--    SECURITY DEFINER so the webhook can credit any user via service-role key
--    without needing per-user RLS exceptions.
CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_balance integer;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Neplatná částka tokenů: %', p_amount;
    END IF;

    UPDATE public.profiles
       SET tokens_balance = COALESCE(tokens_balance, 0) + p_amount,
           updated_at     = now()
     WHERE id = p_user_id
    RETURNING tokens_balance INTO new_balance;

    IF new_balance IS NULL THEN
        -- Profile row missing — create it with the granted amount
        INSERT INTO public.profiles (id, tokens_balance)
        VALUES (p_user_id, p_amount)
        ON CONFLICT (id) DO UPDATE
          SET tokens_balance = COALESCE(public.profiles.tokens_balance, 0) + p_amount
        RETURNING tokens_balance INTO new_balance;
    END IF;

    RETURN new_balance;
END;
$$;

-- Limit who can call it: only the service role (webhook) and authenticated
-- internal callers. Anon should NOT be able to grant themselves tokens.
REVOKE ALL ON FUNCTION public.add_tokens(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_tokens(uuid, integer) TO service_role;


-- 3. Convenience view: subscription summary for the dashboard ───────────────
CREATE OR REPLACE VIEW public.profile_subscriptions AS
SELECT
    id                                                            AS user_id,
    tokens_balance,
    stripe_customer_id,
    dealer_subscription_status,
    dealer_subscription_until,
    monitoring_subscription_status,
    monitoring_subscription_until,
    (dealer_subscription_status IN ('active', 'trialing'))         AS dealer_active,
    (monitoring_subscription_status IN ('active', 'trialing'))     AS monitoring_active
FROM public.profiles;

-- The view inherits RLS from the underlying table, so authenticated users
-- still only see their own row.
