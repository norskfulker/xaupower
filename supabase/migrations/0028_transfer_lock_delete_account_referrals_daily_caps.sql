-- =============================================================================
-- 0028_transfer_lock_delete_account_referrals_daily_caps.sql
-- Addresses 6 product requests:
--   1. Lock internal transfer when user has only 1 active account (RPC guard).
--   2. Allow users to delete an account when its balance is zero.
--   5. Re-add the referral_code / referred_by columns and re-introduce the
--      leaderboard view that weights by total deposit volume per referred user.
--   6. Daily return: days 1-3 in [0%, +5%]; day 4+ in [-30%, +10%],
--      uniform random per cron run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Re-add referral columns on profiles (item 5)
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles (referred_by);

-- -----------------------------------------------------------------------------
-- 2. Code generator + normalize helpers + signup capture (item 5)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.new_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 24 THEN
      RAISE EXCEPTION 'could not allocate a referral code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.new_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.new_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.normalize_referral_code(p_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(regexp_replace(trim(coalesce(p_code, '')), '[^a-zA-Z0-9]', '', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.profiles_referral_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL AND NEW.referred_by = NEW.id THEN
    RAISE EXCEPTION 'cannot refer yourself';
  END IF;
  IF NEW.referral_code IS NOT NULL THEN
    NEW.referral_code := public.normalize_referral_code(NEW.referral_code);
    IF length(NEW.referral_code) < 4 OR length(NEW.referral_code) > 12 THEN
      RAISE EXCEPTION 'referral code must be 4 to 12 letters or numbers';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_referral_guard ON public.profiles;
CREATE TRIGGER profiles_referral_guard
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_referral_guard();

-- Signup-time capture of ?ref=CODE from user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_own_code text;
  v_ref_code text;
  v_referrer uuid;
BEGIN
  v_own_code := public.new_referral_code();
  v_ref_code := public.normalize_referral_code(NEW.raw_user_meta_data->>'referral_code');

  IF v_ref_code <> '' THEN
    SELECT id INTO v_referrer
    FROM public.profiles
    WHERE referral_code = v_ref_code
      AND id <> NEW.id
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, referral_code, referred_by, notification_preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL),
    'user',
    v_own_code,
    v_referrer,
    jsonb_build_object('email_deposits', true, 'email_payouts', true)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
CREATE TRIGGER handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill referral_code on existing profiles.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles SET referral_code = public.new_referral_code() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. RPC: transfer_between_accounts (item 1: lock when user has 1 active acct)
--    Same-user transfer is now rejected when there's only one active account.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_between_accounts(
  p_from_account_id uuid,
  p_to_account_id   uuid,
  p_amount_usd      numeric
)
RETURNS public.transfers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count_active int;
  v_from    public.accounts%ROWTYPE;
  v_to      public.accounts%ROWTYPE;
  v_tx_out  public.transactions%ROWTYPE;
  v_tx_in   public.transactions%ROWTYPE;
  v_transfer public.transfers%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  -- Item 1: refuse when only one active account exists.
  SELECT count(*) INTO v_count_active
  FROM public.accounts
  WHERE user_id = v_user_id AND status = 'active';
  IF v_count_active < 2 THEN
    RAISE EXCEPTION 'You need at least 2 active accounts to transfer';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'cannot transfer to the same account';
  END IF;
  IF p_amount_usd IS NULL OR p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  SELECT * INTO v_from FROM public.accounts
  WHERE id = p_from_account_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'source account not found'; END IF;

  SELECT * INTO v_to FROM public.accounts
  WHERE id = p_to_account_id AND user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'destination account not found'; END IF;

  IF v_from.status <> 'active' THEN RAISE EXCEPTION 'source account is not active'; END IF;
  IF v_to.status <> 'active' THEN RAISE EXCEPTION 'destination account is not active'; END IF;
  IF v_from.available_usd < p_amount_usd THEN RAISE EXCEPTION 'insufficient funds'; END IF;

  UPDATE public.accounts SET available_usd = available_usd - p_amount_usd WHERE id = v_from.id;
  UPDATE public.accounts SET available_usd = available_usd + p_amount_usd WHERE id = v_to.id;

  INSERT INTO public.transfers (
    from_user_id, to_user_id, from_account_id, to_account_id,
    amount_usd, currency, status, confirm_token, expires_at, confirmed_at
  )
  VALUES (
    v_user_id, v_user_id, v_from.id, v_to.id,
    p_amount_usd, 'USDC_ERC20', 'completed', NULL, now(), now()
  )
  RETURNING * INTO v_transfer;

  INSERT INTO public.transactions (user_id, account_id, type, amount_usd, reference_table, reference_id, description)
  VALUES (v_user_id, v_from.id, 'transfer_out', p_amount_usd, 'transfers', v_transfer.id,
          format('Transfer to %s: %s USD', v_to.account_code, p_amount_usd))
  RETURNING * INTO v_tx_out;

  INSERT INTO public.transactions (user_id, account_id, type, amount_usd, reference_table, reference_id, paired_transaction_id, description)
  VALUES (v_user_id, v_to.id, 'transfer_in', p_amount_usd, 'transfers', v_transfer.id, v_tx_out.id,
          format('Transfer from %s: %s USD', v_from.account_code, p_amount_usd))
  RETURNING * INTO v_tx_in;

  UPDATE public.transactions SET paired_transaction_id = v_tx_in.id WHERE id = v_tx_out.id;
  RETURN v_transfer;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_between_accounts(uuid, uuid, numeric) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. RPC: delete_account (item 2)
--    Allowed only when available_usd = 0 AND pending_usd = 0 AND capital_usd = 0.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_account(p_account_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account public.accounts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;

  IF v_account.available_usd <> 0 OR v_account.pending_usd <> 0 OR v_account.capital_usd <> 0 THEN
    RAISE EXCEPTION 'Account balance must be zero to delete (withdraw or transfer funds first)';
  END IF;

  -- Refuse if there are open transactions or credits referencing the account.
  IF EXISTS (
    SELECT 1 FROM public.transactions
    WHERE account_id = v_account.id
      AND created_at > now() - interval '1 hour'
  ) THEN
    RAISE EXCEPTION 'Account has recent activity. Try again in a few minutes.';
  END IF;

  DELETE FROM public.accounts WHERE id = v_account.id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Re-create leaderboard view weighted by total deposit volume (item 5)
--    Top 10 by total confirmed deposit amount across their referred users.
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.referral_leaderboard;
CREATE VIEW public.referral_leaderboard
WITH (security_invoker = true) AS
SELECT
  p.id            AS user_id,
  COALESCE(NULLIF(p.full_name, ''), p.email) AS display_name,
  p.referral_code AS referral_code,
  COALESCE(SUM(CASE WHEN pay.status = 'confirmed' THEN pay.amount_usd ELSE 0 END), 0)::numeric(14,2)
                AS total_deposits,
  COUNT(DISTINCT r.id)::int AS referred_count
FROM public.profiles p
LEFT JOIN public.profiles r ON r.referred_by = p.id
LEFT JOIN public.payments pay ON pay.user_id = r.id AND pay.kind = 'deposit'
GROUP BY p.id, p.full_name, p.email, p.referral_code
HAVING COUNT(DISTINCT r.id) > 0
ORDER BY total_deposits DESC, referred_count DESC, p.created_at ASC
LIMIT 10;

GRANT SELECT ON public.referral_leaderboard TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Replace credit_daily_returns() with bounded random (item 6)
--    Days 1-3: pct in [0%, +5%] uniform random per account per day.
--    Day 4+:   pct in [-30%, +10%] uniform random.
--    Idempotent via daily_return_credit UNIQUE constraint.
--    Math: amount = round(available_usd * pct / 100, 2).
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.credit_daily_returns(numeric, numeric, numeric, date);

CREATE OR REPLACE FUNCTION public.credit_daily_returns(
  p_credit_date date DEFAULT (now() AT TIME ZONE 'UTC')::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.accounts%ROWTYPE;
  v_age_days integer;
  v_min_pct  numeric;
  v_max_pct  numeric;
  v_pct      numeric;
  v_basis    numeric;
  v_amount   numeric;
  v_count    integer := 0;
BEGIN
  IF NOT public.is_admin_fn() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  FOR v_account IN
    SELECT * FROM public.accounts
    WHERE status = 'active'
      AND available_usd > 0
    FOR UPDATE
  LOOP
    v_age_days := GREATEST(
      (p_credit_date - v_account.purchased_at::date),
      0
    );

    -- Per-day bounds:
    -- Days 1-3 (inclusive): pct in [0%, +5%]
    -- Day 4+               : pct in [-30%, +10%]
    IF v_age_days <= 3 THEN
      v_min_pct := 0;
      v_max_pct := 5;
    ELSE
      v_min_pct := -30;
      v_max_pct := 10;
    END IF;

    v_pct := round(
      (v_min_pct + random() * (v_max_pct - v_min_pct))::numeric,
      2
    );

    v_basis := round(v_account.available_usd, 2);
    v_amount := round(v_basis * v_pct / 100.0, 2);
    IF v_amount = 0 THEN CONTINUE; END IF;

    -- Idempotent per account per UTC day.
    BEGIN
      INSERT INTO public.daily_return_credit (
        account_id, credit_date, basis_usd, pct, amount_usd
      )
      VALUES (v_account.id, p_credit_date, v_basis, v_pct, v_amount);
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;

    UPDATE public.accounts
    SET available_usd = available_usd + v_amount
    WHERE id = v_account.id;

    INSERT INTO public.transactions (
      user_id, account_id, type, amount_usd,
      reference_table, reference_id, description
    )
    VALUES (
      v_account.user_id, v_account.id, 'daily_return', v_amount,
      'daily_return_credit', NULL,
      format('Daily return (day %s, %s%% on %s): %s USD',
             v_age_days, v_pct, v_basis, v_amount)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_daily_returns(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_daily_returns(date) TO authenticated;

-- Update the admin trigger call site signature (no pct args any more).
-- -----------------------------------------------------------------------------
-- (Done — the api/admin/credit-daily-returns route reads the new signature.)
-- -----------------------------------------------------------------------------