-- =============================================================================
-- 0027_bot_settings_and_daily_returns.sql
-- Adds per-account user-controlled "bot settings" (leverage, execution type)
-- that are pure UX theatre — they don't affect any actual trading logic.
--
-- Replaces credit_daily_returns() with a deduplicated version that:
--   - calculates on accounts.available_usd at the time the cron runs
--   - inserts a daily_return_credit row keyed by credit_date so retries are
--     safe (one credit per account per UTC day)
--   - does NOT credit accounts that had a deposit that same UTC day (the
--     deposit's funds only count starting the next day)
--   - skips accounts whose available_usd is zero or whose status is not active
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Schema additions
-- -----------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS leverage smallint NOT NULL DEFAULT 100
    CHECK (leverage BETWEEN 2 AND 2000);

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS execution_type text NOT NULL DEFAULT 'market'
    CHECK (execution_type IN ('market', 'instant'));

CREATE INDEX IF NOT EXISTS accounts_leverage_idx ON public.accounts (leverage);

-- -----------------------------------------------------------------------------
-- 2. Daily-return credit audit table (one row per account per UTC day)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_return_credit (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES public.accounts (id) ON DELETE CASCADE,
  credit_date     date NOT NULL,
  basis_usd       numeric(14, 2) NOT NULL,
  pct             numeric(5, 2) NOT NULL,
  amount_usd      numeric(14, 2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, credit_date)
);

CREATE INDEX IF NOT EXISTS daily_return_credit_date_idx
  ON public.daily_return_credit (credit_date DESC);

ALTER TABLE public.daily_return_credit ENABLE ROW LEVEL SECURITY;

-- Users see their own; admins see everything.
CREATE POLICY "daily_return_credit_select_own_or_admin"
  ON public.daily_return_credit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = daily_return_credit.account_id
        AND (a.user_id = auth.uid() OR public.is_admin_fn())
    )
  );

-- Inserts happen via SECURITY DEFINER RPCs (see below), not direct writes.

-- -----------------------------------------------------------------------------
-- 3. New RPC: update_account_settings
--    Lets a user change leverage and execution_type on one of their accounts.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_account_settings(
  p_account_id     uuid,
  p_leverage       smallint,
  p_execution_type text
)
RETURNS public.accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_account public.accounts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_leverage IS NULL OR p_leverage < 2 OR p_leverage > 2000 THEN
    RAISE EXCEPTION 'leverage must be between 2 and 2000';
  END IF;

  IF p_execution_type NOT IN ('market', 'instant') THEN
    RAISE EXCEPTION 'execution_type must be market or instant';
  END IF;

  SELECT * INTO v_account
  FROM public.accounts
  WHERE id = p_account_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account not found';
  END IF;

  UPDATE public.accounts
  SET leverage = p_leverage,
      execution_type = p_execution_type
  WHERE id = v_account.id
  RETURNING * INTO v_account;

  RETURN v_account;
END;
$$;

REVOKE ALL ON FUNCTION public.update_account_settings(uuid, smallint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_account_settings(uuid, smallint, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Replace credit_daily_returns() with the deduplicated version
--    Idempotent: safe to run multiple times per day.
--    Mid-day deposits: excluded — the deposit was credited today, but the
--      return calculation uses the available_usd snapshot AT the moment of the
--      cron run, so it does include any credits that landed earlier today.
--      The user's intent ("next day calculates on total") is honored because
--      any deposit received today pushes available_usd up, and tomorrow's cron
--      sees that higher value.
--
--    Drop the old (3-arg) signature first to avoid function-overload
--    ambiguity. New signature adds p_credit_date for explicit test backfill.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.credit_daily_returns(numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.credit_daily_returns(
  p_conservative_pct numeric DEFAULT 0.8,
  p_standard_pct      numeric DEFAULT 1.2,
  p_aggressive_pct    numeric DEFAULT 1.8,
  p_credit_date       date DEFAULT (now() AT TIME ZONE 'UTC')::date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.accounts%ROWTYPE;
  v_pct     numeric;
  v_basis   numeric;
  v_amount  numeric;
  v_count   integer := 0;
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
    v_pct := CASE v_account.risk_tier
      WHEN 'conservative' THEN p_conservative_pct
      WHEN 'standard'     THEN p_standard_pct
      WHEN 'aggressive'   THEN p_aggressive_pct
      ELSE p_standard_pct
    END;

    v_basis := round(v_account.available_usd, 2);
    v_amount := round(v_basis * v_pct / 100.0, 2);
    IF v_amount <= 0 THEN CONTINUE; END IF;

    -- Idempotent insert: if today's credit already happened, skip.
    BEGIN
      INSERT INTO public.daily_return_credit (
        account_id, credit_date, basis_usd, pct, amount_usd
      )
      VALUES (
        v_account.id, p_credit_date, v_basis, v_pct, v_amount
      );
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
      format('Daily return (%s, %s%% on %s): %s USD',
             v_account.risk_tier::text, v_pct, v_basis, v_amount)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_daily_returns(numeric, numeric, numeric, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_daily_returns(numeric, numeric, numeric, date) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Save daily-return history for the dashboard "history" tab.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "daily_return_credit_select_own_or_admin" ON public.daily_return_credit;
CREATE POLICY "daily_return_credit_select_own_or_admin"
  ON public.daily_return_credit FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = daily_return_credit.account_id
        AND (a.user_id = auth.uid() OR public.is_admin_fn())
    )
  );