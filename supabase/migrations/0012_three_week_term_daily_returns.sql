-- 3-week bot plan term + daily returns credited at 03:00 UTC

ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'bot_return';

CREATE OR REPLACE FUNCTION public.approve_payment_and_activate(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_variant public.package_variants%ROWTYPE;
  v_package_name text;
  v_snapshot jsonb;
  v_desc text;
  v_kind public.payment_kind;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment not found';
  END IF;

  IF v_payment.status = 'confirmed' THEN
    RETURN;
  END IF;

  IF v_payment.status <> 'pending_review' THEN
    RAISE EXCEPTION 'payment cannot be approved from status %', v_payment.status;
  END IF;

  v_kind := COALESCE(v_payment.kind, 'package');
  v_snapshot := NULL;

  IF v_kind = 'package' THEN
    SELECT * INTO v_variant
    FROM public.package_variants
    WHERE id = v_payment.package_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;

    SELECT name::text INTO v_package_name
    FROM public.packages
    WHERE id = v_variant.package_id;

    v_snapshot := jsonb_build_object(
      'id', v_variant.id,
      'package_id', v_variant.package_id,
      'package_name', v_package_name,
      'risk_tier', v_variant.risk_tier,
      'price_usd', v_variant.price_usd,
      'max_lot_size', v_variant.max_lot_size,
      'profit_target_pct', v_variant.profit_target_pct,
      'max_drawdown_pct', v_variant.max_drawdown_pct,
      'roadmap', v_variant.roadmap
    );
  END IF;

  UPDATE public.payments
  SET
    status = 'confirmed',
    confirmed_at = now(),
    variant_snapshot = COALESCE(v_snapshot, variant_snapshot)
  WHERE id = p_payment_id;

  IF v_kind = 'package' THEN
    UPDATE public.user_packages
    SET status = 'expired'
    WHERE user_id = v_payment.user_id
      AND status = 'active';

    INSERT INTO public.user_packages (
      user_id,
      package_variant_id,
      status,
      purchased_at,
      expires_at,
      variant_snapshot
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + interval '21 days',
      v_snapshot
    );

    v_desc := format(
      'Package activated: %s %s, %s',
      v_package_name,
      initcap(v_variant.risk_tier::text),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      -ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      v_desc
    );

  ELSIF v_kind = 'balance' THEN
    INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
    VALUES (v_payment.user_id, v_payment.amount_usd, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET
      available_usd = public.wallet_balances.available_usd + EXCLUDED.available_usd,
      updated_at = now();

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'deposit',
      ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      format('Balance top-up confirmed: %s %s', v_payment.amount_usd, v_payment.currency::text)
    );

  ELSIF v_kind = 'signal' THEN
    INSERT INTO public.user_signal_access (user_id, status, purchased_at, expires_at)
    VALUES (
      v_payment.user_id,
      'active',
      now(),
      now() + interval '21 days'
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      status = 'active',
      purchased_at = now(),
      expires_at = now() + interval '21 days';

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      -ABS(v_payment.amount_usd),
      'payments',
      v_payment.id,
      'confirmed',
      format('Signal access (TradingView) confirmed: %s', v_payment.currency::text)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;

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
  v_base numeric;
  v_amount numeric;
  v_package_name text;
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'UTC')::date;

  FOR r IN
    SELECT up.id, up.user_id, up.variant_snapshot
    FROM public.user_packages up
    WHERE up.status = 'active'
      AND up.expires_at > now()
      AND NOT EXISTS (
        SELECT 1
        FROM public.transactions t
        WHERE t.reference_table = 'user_packages'
          AND t.reference_id = up.id
          AND t.type = 'bot_return'
          AND (t.created_at AT TIME ZONE 'UTC')::date = v_today
      )
  LOOP
    v_package_name := COALESCE(r.variant_snapshot->>'package_name', 'Assay');

    CASE v_package_name
      WHEN 'Assay' THEN
        v_min_pct := 5;
        v_max_pct := 8;
      WHEN 'Bullion' THEN
        v_min_pct := 6;
        v_max_pct := 12;
      WHEN 'Vault' THEN
        v_min_pct := 7;
        v_max_pct := 14;
      ELSE
        v_min_pct := 5;
        v_max_pct := 8;
    END CASE;

    v_base := COALESCE((r.variant_snapshot->>'price_usd')::numeric, 0);
    IF v_base <= 0 THEN
      CONTINUE;
    END IF;

    v_pct := round(
      v_min_pct + (random() * (v_max_pct - v_min_pct))::numeric,
      2
    );
    v_amount := round(v_base * v_pct / 100, 2);

    IF v_amount <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.wallet_balances (user_id, available_usd, pending_usd)
    VALUES (r.user_id, v_amount, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET
      available_usd = public.wallet_balances.available_usd + EXCLUDED.available_usd,
      updated_at = now();

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
        'Daily bot return: %s%% on %s plan (%s)',
        v_pct,
        v_package_name,
        v_today
      )
    );
  END LOOP;
END;
$$;

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

UPDATE public.packages
SET features = CASE name
  WHEN 'Assay' THEN
    '["3-week VPS bot access","Daily returns 5–8% credited at 03:00 UTC","XAUUSD automated execution"]'::jsonb
  WHEN 'Bullion' THEN
    '["3-week VPS bot access","Daily returns 6–12% credited at 03:00 UTC","Everything in Assay plus playbook"]'::jsonb
  WHEN 'Vault' THEN
    '["3-week VPS bot access","Daily returns 7–14% credited at 03:00 UTC","Full terminal bot access"]'::jsonb
  ELSE features
END;
