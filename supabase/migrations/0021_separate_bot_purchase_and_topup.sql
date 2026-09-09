-- Package purchase = always a NEW bot. Balance top-up = only existing bot.
-- Snapshot plan details on submit so pending purchases show correctly in history.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.generate_bot_account_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_code text;
BEGIN
  LOOP
    v_code := 'XAU-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.user_packages WHERE account_code = v_code
    );
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  p_kind public.payment_kind,
  p_currency public.crypto_currency,
  p_tx_hash text,
  p_package_variant_id uuid DEFAULT NULL,
  p_amount_usd numeric DEFAULT NULL,
  p_user_note text DEFAULT NULL,
  p_initial_deposit_usd numeric DEFAULT NULL,
  p_user_package_id uuid DEFAULT NULL
)
RETURNS public.payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_price numeric;
  v_extra numeric;
  v_payment public.payments%ROWTYPE;
  v_pkg public.user_packages%ROWTYPE;
  v_variant public.package_variants%ROWTYPE;
  v_package public.packages%ROWTYPE;
  v_snapshot jsonb;
  v_term_days integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_tx_hash IS NULL OR length(trim(p_tx_hash)) < 8 THEN
    RAISE EXCEPTION 'tx hash required';
  END IF;

  v_snapshot := NULL;

  IF p_kind = 'package' THEN
    IF p_package_variant_id IS NULL THEN
      RAISE EXCEPTION 'package variant required';
    END IF;

    SELECT * INTO v_variant
    FROM public.package_variants
    WHERE id = p_package_variant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package variant not found';
    END IF;

    SELECT * INTO v_package
    FROM public.packages
    WHERE id = v_variant.package_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'package not found';
    END IF;

    v_extra := GREATEST(COALESCE(p_initial_deposit_usd, 0), 0);
    v_price := round(v_variant.price_usd + v_extra, 2);
    v_term_days := COALESCE(
      (to_jsonb(v_package)->>'access_term_days')::integer,
      21
    );

    v_snapshot := jsonb_build_object(
      'id', v_variant.id,
      'package_id', v_variant.package_id,
      'package_name', v_package.name::text,
      'risk_tier', v_variant.risk_tier,
      'strategy_label', COALESCE(to_jsonb(v_variant)->>'strategy_label', ''),
      'price_usd', v_variant.price_usd,
      'max_lot_size', v_variant.max_lot_size,
      'profit_target_pct', v_variant.profit_target_pct,
      'max_drawdown_pct', v_variant.max_drawdown_pct,
      'roadmap', v_variant.roadmap,
      'access_term_days', v_term_days,
      'daily_return_min_pct', to_jsonb(v_package)->>'daily_return_min_pct',
      'daily_return_max_pct', to_jsonb(v_package)->>'daily_return_max_pct'
    );

  ELSIF p_kind = 'balance' THEN
    IF p_user_package_id IS NULL THEN
      RAISE EXCEPTION 'bot account required';
    END IF;
    SELECT * INTO v_pkg
    FROM public.user_packages
    WHERE id = p_user_package_id
      AND user_id = v_user_id
      AND status = 'active';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'active bot account not found';
    END IF;
    IF p_amount_usd IS NULL OR p_amount_usd < 10 THEN
      RAISE EXCEPTION 'minimum top-up is 10';
    END IF;
    v_price := round(p_amount_usd, 2);
    v_extra := 0;
  ELSIF p_kind = 'signal' THEN
    v_price := 49.00;
    v_extra := 0;
  ELSE
    RAISE EXCEPTION 'invalid payment kind';
  END IF;

  INSERT INTO public.payments (
    user_id,
    package_variant_id,
    user_package_id,
    kind,
    currency,
    amount_usd,
    initial_deposit_usd,
    status,
    tx_hash,
    user_note,
    submitted_at,
    variant_snapshot
  )
  VALUES (
    v_user_id,
    CASE WHEN p_kind = 'package' THEN p_package_variant_id ELSE NULL END,
    -- Never attach a package purchase to an existing bot
    CASE WHEN p_kind = 'balance' THEN p_user_package_id ELSE NULL END,
    p_kind,
    p_currency,
    v_price,
    CASE WHEN p_kind = 'package' THEN v_extra ELSE 0 END,
    'pending_review',
    trim(p_tx_hash),
    NULLIF(trim(COALESCE(p_user_note, '')), ''),
    now(),
    v_snapshot
  )
  RETURNING * INTO v_payment;

  RETURN v_payment;
END;
$$;

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
    -- Package purchase ALWAYS creates a new bot. Never credit an existing bot.
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
      pending_usd
    )
    VALUES (
      v_payment.user_id,
      v_payment.package_variant_id,
      'active',
      now(),
      now() + (v_term_days * interval '1 day'),
      v_snapshot,
      public.generate_bot_account_code(),
      v_credit,
      0
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
    -- Top-up ONLY: credits an existing active bot. Never creates a package.
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
    SET available_usd = available_usd + v_credit
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

REVOKE ALL ON FUNCTION public.submit_manual_payment(
  public.payment_kind,
  public.crypto_currency,
  text,
  uuid,
  numeric,
  text,
  numeric,
  uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(
  public.payment_kind,
  public.crypto_currency,
  text,
  uuid,
  numeric,
  text,
  numeric,
  uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_payment_and_activate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_and_activate(uuid) TO authenticated;
