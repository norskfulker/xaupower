-- available_usd = withdrawable profits only; capital_usd = trading deposits (not withdrawable).
-- Minimum payout: $10.

ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS capital_usd numeric(12, 2) NOT NULL DEFAULT 0 CHECK (capital_usd >= 0);

-- Backfill capital from confirmed deposits per bot.
UPDATE public.user_packages up
SET capital_usd = COALESCE(
  (
    SELECT round(SUM(p.amount_usd), 2)
    FROM public.payments p
    WHERE p.user_package_id = up.id
      AND p.status = 'confirmed'
      AND p.kind IN ('package', 'balance')
  ),
  0
);

-- Remove capital that was incorrectly credited to available_usd.
UPDATE public.user_packages
SET available_usd = GREATEST(0, round(available_usd - capital_usd, 2))
WHERE capital_usd > 0;

CREATE OR REPLACE FUNCTION public.approve_payment_and_activate(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_variant public.package_variants%ROWTYPE;
  v_package public.packages%ROWTYPE;
  v_package_name text;
  v_snapshot jsonb;
  v_desc text;
  v_kind public.payment_kind;
  v_user_package_id uuid;
  v_credit numeric;
  v_term_days integer;
  v_strategy text;
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
  v_credit := v_payment.amount_usd;
  v_term_days := 21;
  v_snapshot := v_payment.variant_snapshot;

  IF v_kind = 'package' THEN
    IF v_payment.package_variant_id IS NULL THEN
      RAISE EXCEPTION 'package payment missing variant';
    END IF;

    SELECT * INTO v_variant
    FROM public.package_variants
    WHERE id = v_payment.package_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;

    SELECT * INTO v_package
    FROM public.packages
    WHERE id = v_variant.package_id;

    v_package_name := v_package.name::text;
    v_term_days := COALESCE(
      (v_snapshot->>'access_term_days')::integer,
      (to_jsonb(v_package)->>'access_term_days')::integer,
      21
    );
    v_strategy := COALESCE(
      v_snapshot->>'strategy_label',
      to_jsonb(v_variant)->>'strategy_label',
      initcap(v_variant.risk_tier::text)
    );

    IF v_snapshot IS NULL THEN
      v_snapshot := jsonb_build_object(
        'id', v_variant.id,
        'package_id', v_variant.package_id,
        'package_name', v_package_name,
        'risk_tier', v_variant.risk_tier,
        'strategy_label', v_strategy,
        'price_usd', v_variant.price_usd,
        'max_lot_size', v_variant.max_lot_size,
        'profit_target_pct', v_variant.profit_target_pct,
        'max_drawdown_pct', v_variant.max_drawdown_pct,
        'roadmap', v_variant.roadmap,
        'access_term_days', v_term_days,
        'daily_return_min_pct', to_jsonb(v_package)->>'daily_return_min_pct',
        'daily_return_max_pct', to_jsonb(v_package)->>'daily_return_max_pct'
      );
    END IF;

    UPDATE public.payments
    SET
      status = 'confirmed',
      confirmed_at = now(),
      variant_snapshot = v_snapshot,
      user_package_id = NULL
    WHERE id = p_payment_id;

    INSERT INTO public.user_packages (
      user_id,
      package_variant_id,
      status,
      purchased_at,
      expires_at,
      variant_snapshot,
      account_code,
      available_usd,
      pending_usd,
      capital_usd
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + (v_term_days * interval '1 day'),
      v_snapshot,
      public.generate_bot_account_code(),
      0,
      0,
      v_credit
    )
    RETURNING id INTO v_user_package_id;

    UPDATE public.payments
    SET user_package_id = v_user_package_id
    WHERE id = p_payment_id;

    v_desc := format(
      'New bot activated: %s %s (bot %s), %s',
      v_package_name,
      v_strategy,
      (SELECT account_code FROM public.user_packages WHERE id = v_user_package_id),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'package_purchase',
      v_payment.amount_usd,
      'payments',
      p_payment_id,
      'confirmed',
      v_desc
    );

  ELSIF v_kind = 'balance' THEN
    IF v_payment.user_package_id IS NULL THEN
      RAISE EXCEPTION 'balance payment missing bot account';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_packages
      WHERE id = v_payment.user_package_id
        AND user_id = v_payment.user_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'active bot account not found for top-up';
    END IF;

    UPDATE public.payments
    SET
      status = 'confirmed',
      confirmed_at = now()
    WHERE id = p_payment_id;

    UPDATE public.user_packages
    SET capital_usd = capital_usd + v_credit
    WHERE id = v_payment.user_package_id
      AND user_id = v_payment.user_id;

    v_desc := format(
      'Balance deposit to bot %s, %s',
      (SELECT account_code FROM public.user_packages WHERE id = v_payment.user_package_id),
      v_payment.currency::text
    );

    INSERT INTO public.transactions (
      user_id, type, amount_usd, reference_table, reference_id, status_at_time, description
    )
    VALUES (
      v_payment.user_id,
      'deposit',
      v_payment.amount_usd,
      'payments',
      p_payment_id,
      'confirmed',
      v_desc
    );
  ELSE
    RAISE EXCEPTION 'unsupported payment kind %', v_kind;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_payout(
  p_amount_usd numeric,
  p_currency public.crypto_currency,
  p_destination_address text,
  p_user_package_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_available numeric;
  v_payout_id uuid;
  v_pkg public.user_packages%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
    RAISE EXCEPTION 'minimum withdrawal is 10';
  END IF;

  IF p_destination_address IS NULL OR length(trim(p_destination_address)) < 10 THEN
    RAISE EXCEPTION 'invalid destination address';
  END IF;

  IF p_user_package_id IS NULL THEN
    RAISE EXCEPTION 'bot account required';
  END IF;

  SELECT * INTO v_pkg
  FROM public.user_packages
  WHERE id = p_user_package_id
    AND user_id = v_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active bot account not found';
  END IF;

  v_available := v_pkg.available_usd;

  IF p_amount_usd > v_available THEN
    RAISE EXCEPTION 'amount exceeds available balance';
  END IF;

  UPDATE public.user_packages
  SET
    available_usd = available_usd - p_amount_usd,
    pending_usd = pending_usd + p_amount_usd
  WHERE id = p_user_package_id;

  INSERT INTO public.payouts (
    user_id,
    user_package_id,
    amount_usd,
    currency,
    destination_address,
    status,
    requested_at
  )
  VALUES (
    v_user_id,
    p_user_package_id,
    p_amount_usd,
    p_currency,
    trim(p_destination_address),
    'requested',
    now()
  )
  RETURNING id INTO v_payout_id;

  RETURN v_payout_id;
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
  v_base numeric;
  v_amount numeric;
  v_package_name text;
  v_today date;
BEGIN
  v_today := (now() AT TIME ZONE 'UTC')::date;

  FOR r IN
    SELECT up.id, up.user_id, up.variant_snapshot, up.account_code, up.capital_usd
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
  LOOP
    v_package_name := COALESCE(r.variant_snapshot->>'package_name', 'Plan');

    v_min_pct := COALESCE((r.variant_snapshot->>'daily_return_min_pct')::numeric, 5);
    v_max_pct := COALESCE((r.variant_snapshot->>'daily_return_max_pct')::numeric, 8);

    IF v_max_pct < v_min_pct THEN
      v_max_pct := v_min_pct;
    END IF;

    v_base := GREATEST(
      COALESCE(r.capital_usd, 0),
      COALESCE((r.variant_snapshot->>'price_usd')::numeric, 0)
    );
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

    UPDATE public.user_packages
    SET available_usd = available_usd + v_amount
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
        'Daily bot return: %s%% on %s (%s) — %s',
        v_pct,
        r.account_code,
        v_package_name,
        v_today
      )
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.request_payout(numeric, public.crypto_currency, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_payout(numeric, public.crypto_currency, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.credit_daily_bot_returns() FROM PUBLIC, anon, authenticated;
