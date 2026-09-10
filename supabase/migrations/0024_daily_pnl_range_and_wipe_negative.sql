-- Daily P&L range: about -50% to +15% of bot equity.
-- If equity would go to zero or below, wipe the bot balances to 0 and expire it.

ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_daily_return_min_pct_check;

ALTER TABLE public.packages
  DROP CONSTRAINT IF EXISTS packages_daily_return_max_pct_check;

ALTER TABLE public.packages
  ADD CONSTRAINT packages_daily_return_min_pct_check
  CHECK (
    daily_return_min_pct IS NULL
    OR (daily_return_min_pct >= -100 AND daily_return_min_pct <= 100)
  );

ALTER TABLE public.packages
  ADD CONSTRAINT packages_daily_return_max_pct_check
  CHECK (
    daily_return_max_pct IS NULL
    OR (daily_return_max_pct >= -100 AND daily_return_max_pct <= 100)
  );

UPDATE public.packages
SET
  daily_return_min_pct = -50,
  daily_return_max_pct = 15,
  max_loss_pct = 50;

-- Keep active bot snapshots in sync so the cron job uses the new band.
UPDATE public.user_packages
SET variant_snapshot = jsonb_set(
  jsonb_set(
    COALESCE(variant_snapshot, '{}'::jsonb),
    '{daily_return_min_pct}',
    '-50'::jsonb,
    true
  ),
  '{daily_return_max_pct}',
  '15'::jsonb,
  true
)
WHERE status = 'active'
  AND account_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.wipe_bot_account(
  p_bot_id uuid,
  p_reason text DEFAULT 'equity wiped'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot public.user_packages%ROWTYPE;
  v_equity numeric(12, 2);
BEGIN
  SELECT * INTO v_bot
  FROM public.user_packages
  WHERE id = p_bot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_equity := round(
    COALESCE(v_bot.capital_usd, 0) + COALESCE(v_bot.available_usd, 0),
    2
  );

  UPDATE public.user_packages
  SET
    capital_usd = 0,
    available_usd = 0,
    pending_usd = 0,
    status = 'expired',
    expires_at = LEAST(COALESCE(expires_at, now()), now())
  WHERE id = p_bot_id;

  IF v_equity <> 0 THEN
    INSERT INTO public.transactions (
      user_id,
      type,
      amount_usd,
      reference_table,
      reference_id,
      status_at_time,
      description
    )
    VALUES (
      v_bot.user_id,
      'bot_return',
      -v_equity,
      'user_packages',
      v_bot.id,
      'confirmed',
      format(
        'Bot wiped to 0 (%s): %s',
        COALESCE(v_bot.account_code, v_bot.id::text),
        p_reason
      )
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_daily_bot_returns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_min_pct numeric;
  v_max_pct numeric;
  v_pct numeric;
  v_equity numeric(12, 2);
  v_amount numeric(12, 2);
  v_next_equity numeric(12, 2);
  v_from_available numeric(12, 2);
  v_from_capital numeric(12, 2);
  v_new_available numeric(12, 2);
  v_new_capital numeric(12, 2);
  v_package_name text;
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'UTC')::date;

  FOR r IN
    SELECT
      up.id,
      up.user_id,
      up.variant_snapshot,
      up.account_code,
      up.capital_usd,
      up.available_usd
    FROM public.user_packages up
    WHERE up.status = 'active'
      AND up.expires_at > now()
      AND up.account_code IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.reference_table = 'user_packages'
          AND t.reference_id = up.id
          AND t.type = 'bot_return'
          AND (t.created_at AT TIME ZONE 'UTC')::date = v_today
      )
    FOR UPDATE OF up
  LOOP
    v_package_name := COALESCE(r.variant_snapshot->>'package_name', 'Plan');

    v_min_pct := COALESCE(
      (r.variant_snapshot->>'daily_return_min_pct')::numeric,
      -50
    );
    v_max_pct := COALESCE(
      (r.variant_snapshot->>'daily_return_max_pct')::numeric,
      15
    );

    IF v_max_pct < v_min_pct THEN
      v_max_pct := v_min_pct;
    END IF;

    -- Clamp to the supported daily band.
    v_min_pct := GREATEST(-50, LEAST(15, v_min_pct));
    v_max_pct := GREATEST(v_min_pct, LEAST(15, v_max_pct));

    v_equity := round(
      COALESCE(r.capital_usd, 0) + COALESCE(r.available_usd, 0),
      2
    );

    IF v_equity <= 0 THEN
      PERFORM public.wipe_bot_account(r.id, 'non-positive equity before daily P&L');
      CONTINUE;
    END IF;

    v_pct := round(
      v_min_pct + (random() * (v_max_pct - v_min_pct))::numeric,
      2
    );
    v_amount := round(v_equity * v_pct / 100, 2);
    v_next_equity := round(v_equity + v_amount, 2);

    IF v_next_equity <= 0 THEN
      PERFORM public.wipe_bot_account(
        r.id,
        format('daily P&L %s%% took equity to %s', v_pct, v_next_equity)
      );
      CONTINUE;
    END IF;

    IF v_amount > 0 THEN
      v_new_available := round(COALESCE(r.available_usd, 0) + v_amount, 2);
      v_new_capital := COALESCE(r.capital_usd, 0);
    ELSIF v_amount < 0 THEN
      v_from_available := LEAST(COALESCE(r.available_usd, 0), abs(v_amount));
      v_from_capital := abs(v_amount) - v_from_available;
      v_new_available := round(COALESCE(r.available_usd, 0) - v_from_available, 2);
      v_new_capital := round(COALESCE(r.capital_usd, 0) - v_from_capital, 2);
    ELSE
      CONTINUE;
    END IF;

    UPDATE public.user_packages
    SET
      available_usd = GREATEST(0, v_new_available),
      capital_usd = GREATEST(0, v_new_capital)
    WHERE id = r.id;

    INSERT INTO public.transactions (
      user_id,
      type,
      amount_usd,
      reference_table,
      reference_id,
      status_at_time,
      description
    )
    VALUES (
      r.user_id,
      'bot_return',
      v_amount,
      'user_packages',
      r.id,
      'confirmed',
      format(
        'Daily bot P&L: %s%% on %s (%s) — %s',
        v_pct,
        r.account_code,
        v_package_name,
        v_today
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.wipe_bot_account(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_daily_bot_returns() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule('daily-bot-returns');
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
  'daily-bot-returns',
  '0 3 * * *',
  $$ SELECT public.credit_daily_bot_returns(); $$
);
